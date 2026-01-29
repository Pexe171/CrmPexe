import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { SuperAdminGuard } from "./super-admin.guard";
import { AuthenticatedRequest } from "./auth.types";

const createExecutionContext = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request
    })
  }) as ExecutionContext;

describe("SuperAdminGuard", () => {
  it("permite acesso quando o usuário é super admin", () => {
    const guard = new SuperAdminGuard();
    const request = {
      user: {
        id: "user-1",
        email: "superadmin@example.com",
        role: "ADMIN",
        superAdmin: true
      }
    } as Partial<AuthenticatedRequest>;

    expect(guard.canActivate(createExecutionContext(request))).toBe(true);
  });

  it("bloqueia acesso quando o usuário não é super admin", () => {
    const guard = new SuperAdminGuard();
    const request = {
      user: {
        id: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        superAdmin: false
      }
    } as Partial<AuthenticatedRequest>;

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(ForbiddenException);
  });
});
