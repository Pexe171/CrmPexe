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

    console.log("[AccessTokenGuard][STEP 2] request recebido no guard", {
      hasCookieHeader: Boolean(request.headers?.cookie),
      cookieHeader: request.headers?.cookie ?? null,
      hasAuthorizationHeader: Boolean(request.headers?.authorization),
      authorizationHeader: request.headers?.authorization ?? null,
      cookies: request.cookies ?? null
    });
    const token = this.extractToken(request);

    if (!token) {
      console.log("[AccessTokenGuard] Token de acesso ausente após extração", {
        cookieToken: request.cookies?.[ACCESS_TOKEN_COOKIE] ?? null,
        authorizationHeader: request.headers.authorization ?? null
      });
      throw new UnauthorizedException("Token de acesso ausente.");
    }

    try {
      console.log("[AccessTokenGuard][STEP 2] Token extraído", {
        tokenPreview:
          token.length > 12
            ? `${token.slice(0, 6)}...${token.slice(-6)}`
            : `${token.slice(0, 3)}***`,
        jwtAccessSecretDefined: Boolean(process.env.JWT_ACCESS_SECRET)
      });
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: UserRole;
        impersonatedByUserId?: string;
        impersonatedWorkspaceId?: string;
      }>(token, {
        secret: this.accessTokenSecret
      });

      console.log("[AccessTokenGuard][STEP 2] JWT verificado com sucesso", {
        sub: payload.sub,
        role: payload.role,
        impersonatedByUserId: payload.impersonatedByUserId ?? null,
        impersonatedWorkspaceId: payload.impersonatedWorkspaceId ?? null
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

      let resolvedWorkspaceId = user.currentWorkspaceId;
      if (!resolvedWorkspaceId && !payload.impersonatedWorkspaceId) {
        const fallbackMembership = await this.prisma.workspaceMember.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          select: { workspaceId: true }
        });

        if (fallbackMembership?.workspaceId) {
          resolvedWorkspaceId = fallbackMembership.workspaceId;
          await this.prisma.user.update({
            where: { id: user.id },
            data: { currentWorkspaceId: fallbackMembership.workspaceId }
          });
        }
      }

      if (payload.impersonatedByUserId) {
        const impersonator = await this.prisma.user.findUnique({
          where: { id: payload.impersonatedByUserId },
          select: { id: true, isSuperAdmin: true }
        });

        if (!impersonator?.isSuperAdmin) {
          throw new UnauthorizedException(
            "Impersonação inválida para este token."
          );
        }

        if (payload.impersonatedWorkspaceId) {
          const membership = await this.prisma.workspaceMember.findFirst({
            where: {
              userId: user.id,
              workspaceId: payload.impersonatedWorkspaceId
            }
          });

          if (!membership) {
            throw new UnauthorizedException("Workspace inválido para suporte.");
          }
        }
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        currentWorkspaceId:
          payload.impersonatedWorkspaceId ?? resolvedWorkspaceId,
        isImpersonated: Boolean(payload.impersonatedByUserId),
        impersonatedByUserId: payload.impersonatedByUserId ?? null,
        impersonatedWorkspaceId: payload.impersonatedWorkspaceId ?? null
      };
      console.log("[AccessTokenGuard][STEP 2] Usuário autenticado no guard", {
        userId: request.user.id,
        workspaceId: request.user.currentWorkspaceId ?? null
      });

      return true;
    } catch (error) {
      console.log("[AccessTokenGuard][STEP 2] Falha ao validar token", {
        message: error instanceof Error ? error.message : "erro desconhecido"
      });
      throw new UnauthorizedException("Token de acesso inválido.");
    }
  }

  private extractToken(request: AuthenticatedRequest) {
    const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    const authorization = request.headers.authorization;

    console.log("[AccessTokenGuard][STEP 2] extractToken tentativa", {
      cookieToken: cookieToken ?? null,
      authorizationHeader: authorization ?? null
    });

    if (cookieToken) {
      return cookieToken;
    }

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice(7);
    }

    console.log("[AccessTokenGuard][STEP 2] extractToken falhou", {
      cookieToken: cookieToken ?? null,
      authorizationHeader: authorization ?? null
    });

    return null;
  }
}
