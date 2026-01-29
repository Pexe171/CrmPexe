import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ACCESS_TOKEN_COOKIE } from "./auth.constants";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET || "dev_access_secret";

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: UserRole;
      }>(token, {
        secret: this.accessTokenSecret
      });

      if (!payload.role) {
        throw new UnauthorizedException("Role ausente no token.");
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          isSuperAdmin: true,
          currentWorkspaceId: true
        }
      });

      if (!user) {
        throw new UnauthorizedException("Usuário não encontrado.");
      }

      if (user.role !== payload.role) {
        throw new UnauthorizedException("Role do token não confere.");
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        currentWorkspaceId: user.currentWorkspaceId
      };
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
