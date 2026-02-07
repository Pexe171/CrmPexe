import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { AuthUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("request-otp")
  @UseGuards(RateLimitGuard)
  @RateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    byIp: true,
    byWorkspace: true,
    keyPrefix: "auth-request-otp"
  })
  async requestOtp(@Body() body: RequestOtpDto, @Req() req: Request) {
    return this.authService.requestOtp(body, {
      ip: this.resolveClientIp(req),
      userAgent: this.resolveUserAgent(req)
    });
  }

  @Post("verify-otp")
  @UseGuards(RateLimitGuard)
  @RateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    byIp: true,
    byWorkspace: true,
    keyPrefix: "auth-verify-otp"
  })
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.verifyOtp(body, {
      ip: this.resolveClientIp(req),
      userAgent: this.resolveUserAgent(req)
    });
    this.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken
    );
    return result.user;
  }

  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.[this.authService.refreshTokenCookieName];
    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken
    );
    return result.user;
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.authService.refreshTokenCookieName];
    await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return { message: "Logout realizado com sucesso." };
  }

  @Post("revoke-refresh-tokens")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async revokeRefreshTokens(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.authService.revokeRefreshTokensByWorkspace(
      user.id,
      workspaceId
    );
  }

  @Get("me")
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      currentWorkspaceId: user.currentWorkspaceId,
      isImpersonated: user.isImpersonated ?? false,
      impersonatedByUserId: user.impersonatedByUserId ?? null,
      impersonatedWorkspaceId: user.impersonatedWorkspaceId ?? null
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
  ) {
    const isProduction = process.env.NODE_ENV === "production";
    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/"
    };

    res.cookie(this.authService.accessTokenCookieName, accessToken, {
      ...baseOptions,
      maxAge: this.authService.getAccessTokenTtlMs()
    });

    res.cookie(this.authService.refreshTokenCookieName, refreshToken, {
      ...baseOptions,
      maxAge: this.authService.getRefreshTokenTtlMs()
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(this.authService.accessTokenCookieName, { path: "/" });
    res.clearCookie(this.authService.refreshTokenCookieName, { path: "/" });
  }

  private resolveClientIp(req: Request) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
      return forwardedFor.split(",")[0].trim();
    }
    return req.ip;
  }

  private resolveUserAgent(req: Request) {
    return req.headers["user-agent"]?.toString();
  }
}
