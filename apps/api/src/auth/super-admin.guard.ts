import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isSuperAdmin = request.user?.superAdmin;

    if (!isSuperAdmin) {
      throw new ForbiddenException("Acesso permitido apenas para super administradores.");
    }

    return true;
  }
}
