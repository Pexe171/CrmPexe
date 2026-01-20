import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_TTL_MS } from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

@Injectable()
export class AuthService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
  private readonly accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  private readonly refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

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

  async signup(payload: SignupDto) {
    this.ensureAuthPayload(payload);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictException("E-mail já cadastrado.");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        name: payload.name.trim(),
        passwordHash
      }
    });

    const tokens = await this.issueTokens(user.id, user.email);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens
    };
  }

  async login(payload: LoginDto) {
    this.ensureAuthPayload(payload);

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!user) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const passwordMatch = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const tokens = await this.issueTokens(user.id, user.email);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token ausente.");
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException("Refresh token inválido.");
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!tokenMatches) {
      throw new UnauthorizedException("Refresh token inválido.");
    }

    const tokens = await this.issueTokens(user.id, user.email);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name },
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

  async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

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
      return await this.jwtService.verifyAsync<{ sub: string; email: string }>(token, {
        secret: this.accessTokenSecret
      });
    } catch {
      throw new UnauthorizedException("Token de acesso inválido.");
    }
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<{ sub: string; email: string }>(token, {
        secret: this.refreshTokenSecret
      });
    } catch {
      throw new UnauthorizedException("Refresh token inválido.");
    }
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash }
    });
  }

  private ensureAuthPayload(payload: { email: string; password: string; name?: string }) {
    if (!payload.email || !payload.password || ("name" in payload && !payload.name)) {
      throw new BadRequestException("Dados de autenticação inválidos.");
    }
  }
}
