import {
  BadRequestException,
  ConflictException,
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
  private readonly otpTtlMs = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
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

  async requestOtp(payload: RequestOtpDto) {
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

  async verifyOtp(payload: VerifyOtpDto) {
    const email = payload.email.toLowerCase();
    const codeHash = this.hashOtpCode(payload.code.trim());

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp || otp.codeHash !== codeHash) {
      throw new UnauthorizedException("Código inválido ou expirado.");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() }
    });

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user && otp.purpose === OtpPurpose.SIGNUP) {
      if (!otp.name || !otp.contact) {
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
      throw new UnauthorizedException("Usuário não encontrado.");
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
        role: user.role
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
        role: user.role
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
}
