import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser, AuthenticatedRequest } from "./auth.types";

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
