import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OtpPurpose, UserRole } from "@prisma/client";
import { createHash, randomInt } from "crypto";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_MS
} from "./auth.constants";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { LoginAttemptsService } from "./login-attempts.service";

@Injectable()
export class AuthService {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET || "dev_access_secret";
  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
  private readonly accessTokenExpiresIn =
    process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  private readonly refreshTokenExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  private readonly impersonationTokenExpiresIn =
    process.env.JWT_IMPERSONATION_EXPIRES_IN || "15m";
  private readonly otpTtlMs = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000);
  private readonly otpDailyLimit = Number(process.env.OTP_DAILY_LIMIT || 20);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginAttemptsService: LoginAttemptsService
  ) {}

  get accessTokenCookieName() {
    return ACCESS_TOKEN_COOKIE;
  }

  get refreshTokenCookieName() {
    return REFRESH_TOKEN_COOKIE;
  }

  getAccessTokenTtlMs() {
    return ACCESS_TOKEN_TTL_MS;
  }

  getRefreshTokenTtlMs() {
    return REFRESH_TOKEN_TTL_MS;
  }

  async requestOtp(
    payload: RequestOtpDto,
    _context?: { ip?: string; userAgent?: string }
  ) {
    const email = payload.email.toLowerCase();
    const isSignupPayload = Boolean(
      payload.name || payload.contact || payload.emailConfirmation
    );

    if (isSignupPayload) {
      this.ensureSignupPayload(payload);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    if (existingUser && isSignupPayload) {
      throw new ConflictException("E-mail já cadastrado.");
    }

    if (!existingUser && !isSignupPayload) {
      throw new BadRequestException("E-mail ainda não cadastrado.");
    }

    const purpose = existingUser ? OtpPurpose.LOGIN : OtpPurpose.SIGNUP;
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.otpTtlMs);

    await this.ensureDailyOtpLimit(email);
    await this.prisma.otpCode.deleteMany({ where: { email } });

    await this.prisma.otpCode.create({
      data: {
        email,
        codeHash: this.hashOtpCode(code),
        purpose,
        name: payload.name?.trim() ?? null,
        contact: payload.contact?.trim() ?? null,
        expiresAt
      }
    });

    await this.sendOtpEmail(email, code, purpose);

    return { message: "Código enviado.", expiresAt };
  }

  async verifyOtp(
    payload: VerifyOtpDto,
    context?: { ip?: string; userAgent?: string }
  ) {
    const email = payload.email.toLowerCase();
    const codeHash = this.hashOtpCode(payload.code.trim());
    const loginKey = this.buildLoginKey(email, context);

    if (loginKey && this.loginAttemptsService.isBlocked(loginKey)) {
      throw new HttpException(
        "Muitas tentativas de login. Aguarde alguns minutos.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp || otp.codeHash !== codeHash) {
      this.registerLoginFailure(loginKey);
      throw new UnauthorizedException("Código inválido ou expirado.");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() }
    });

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user && otp.purpose === OtpPurpose.SIGNUP) {
      if (!otp.name || !otp.contact) {
        this.registerLoginFailure(loginKey);
        throw new BadRequestException("Dados de cadastro ausentes.");
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name: otp.name.trim(),
          contact: otp.contact.trim(),
          role: UserRole.USER
        }
      });
    }

    if (!user) {
      this.registerLoginFailure(loginKey);
      throw new UnauthorizedException("Usuário não encontrado.");
    }

    if (loginKey) {
      this.loginAttemptsService.reset(loginKey);
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        contact: user.contact,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin
      },
      tokens
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token ausente.");
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        refreshTokenHash: true
      }
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException("Refresh token inválido.");
    }

    const tokenMatches =
      this.hashRefreshToken(refreshToken) === user.refreshTokenHash;

    if (!tokenMatches) {
      throw new UnauthorizedException("Refresh token inválido.");
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin
      },
      tokens
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { refreshTokenHash: null }
      });
    } catch {
      return;
    }
  }

  async revokeRefreshTokensByWorkspace(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const result = await this.prisma.user.updateMany({
      where: {
        memberships: {
          some: {
            workspaceId: resolvedWorkspaceId
          }
        }
      },
      data: { refreshTokenHash: null }
    });

    return {
      message: "Refresh tokens revogados com sucesso.",
      workspaceId: resolvedWorkspaceId,
      totalRevogados: result.count
    };
  }

  async issueTokens(user: { id: string; email: string; role: UserRole }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiresIn
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiresIn
    });

    return { accessToken, refreshToken };
  }

  async issueImpersonationToken(payload: {
    userId: string;
    email: string;
    role: UserRole;
    impersonatedByUserId: string;
    impersonatedWorkspaceId: string;
  }) {
    const tokenPayload = {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      impersonatedByUserId: payload.impersonatedByUserId,
      impersonatedWorkspaceId: payload.impersonatedWorkspaceId
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      secret: this.accessTokenSecret,
      expiresIn: this.impersonationTokenExpiresIn
    });

    return {
      accessToken,
      expiresIn: this.impersonationTokenExpiresIn
    };
  }

  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: UserRole;
      }>(token, {
        secret: this.accessTokenSecret
      });
    } catch {
      throw new UnauthorizedException("Token de acesso inválido.");
    }
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: UserRole;
      }>(token, {
        secret: this.refreshTokenSecret
      });
    } catch {
      throw new UnauthorizedException("Refresh token inválido.");
    }
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash }
    });
  }

  private ensureSignupPayload(payload: {
    email: string;
    name?: string;
    contact?: string;
    emailConfirmation?: string;
  }) {
    if (
      !payload.email ||
      !payload.name ||
      !payload.contact ||
      !payload.emailConfirmation
    ) {
      throw new BadRequestException("Dados de cadastro inválidos.");
    }

    if (
      payload.email.toLowerCase() !== payload.emailConfirmation.toLowerCase()
    ) {
      throw new BadRequestException("Os e-mails informados não conferem.");
    }
  }

  private generateOtpCode() {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtpCode(code: string) {
    return createHash("sha256").update(code).digest("hex");
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash("sha256")
      .update(`${refreshToken}.${this.refreshTokenSecret}`)
      .digest("hex");
  }

  private async sendOtpEmail(email: string, code: string, purpose: OtpPurpose) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!user || !pass || !from) {
      throw new BadRequestException("Configuração de SMTP ausente.");
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    const actionLabel =
      purpose === OtpPurpose.SIGNUP ? "criar sua conta" : "entrar no CRM";

    await transport.sendMail({
      from,
      to: email,
      subject: "Seu código de acesso CrmPexe",
      text: `Use o código ${code} para ${actionLabel}. Ele expira em ${Math.round(this.otpTtlMs / 60000)} minutos.`,
      html: `<p>Use o código abaixo para ${actionLabel}:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${code}</strong></p><p>Este código expira em ${Math.round(
        this.otpTtlMs / 60000
      )} minutos.</p>`
    });
  }

  private buildLoginKey(
    email: string,
    context?: { ip?: string; userAgent?: string }
  ) {
    if (!context?.ip) {
      return null;
    }

    const fingerprint = this.buildDeviceFingerprint(
      context.ip,
      context.userAgent
    );

    return `${email}:${fingerprint ?? context.ip}`;
  }

  private buildDeviceFingerprint(ip: string, userAgent?: string) {
    if (!userAgent?.trim()) {
      return null;
    }

    return createHash("sha256")
      .update(`${ip}|${userAgent.trim()}`)
      .digest("hex");
  }

  private async ensureDailyOtpLimit(email: string) {
    if (!this.otpDailyLimit || Number.isNaN(this.otpDailyLimit)) {
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const otpCount = await this.prisma.otpCode.count({
      where: {
        email,
        createdAt: { gte: startOfDay }
      }
    });

    if (otpCount >= this.otpDailyLimit) {
      throw new HttpException(
        "Limite diário de códigos atingido. Tente novamente amanhã.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    const currentWorkspaceId = await this.getCurrentWorkspaceId(userId);
    await this.ensureWorkspaceMembership(userId, currentWorkspaceId);
    return currentWorkspaceId;
  }

  private async getCurrentWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    if (!user?.currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    return user.currentWorkspaceId;
  }

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }
  }

  private registerLoginFailure(loginKey: string | null) {
    if (!loginKey) {
      return;
    }
    this.loginAttemptsService.registerFailure(loginKey);
  }
}
