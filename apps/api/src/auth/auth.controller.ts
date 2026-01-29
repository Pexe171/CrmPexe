import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("request-otp")
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body);
  }

  @Post("verify-otp")
  async verifyOtp(@Body() body: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyOtp(body);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.authService.refreshTokenCookieName];
    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post("impersonate")
  async impersonate(
    @Body() body: { token?: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.impersonateSupportUser(body?.token ?? "");
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.authService.refreshTokenCookieName];
    await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return { message: "Logout realizado com sucesso." };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
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
}
