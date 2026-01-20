import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ACCESS_TOKEN_COOKIE } from "./auth.constants";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token, {
        secret: this.accessTokenSecret
      });

      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Token de acesso inválido.");
    }
  }

  private extractToken(request: AuthenticatedRequest) {
    const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (cookieToken) {
      return cookieToken;
    }

    const authorization = request.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice(7);
    }

    return null;
  }
}
