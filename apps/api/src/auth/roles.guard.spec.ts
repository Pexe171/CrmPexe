import { ForbiddenException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common/interfaces";
import { UserRole } from "@prisma/client";
import { RolesGuard } from "./roles.guard";

const createExecutionContext = (role: UserRole | null): ExecutionContext => {
  const request = role
    ? ({ user: { id: "user-1", email: "user@example.com", role } } as const)
    : ({ user: undefined } as const);

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as ExecutionContext;
};

describe("RolesGuard", () => {
  it("permite acesso quando nenhum role é exigido", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined)
    };
    const guard = new RolesGuard(reflector as any);

    expect(guard.canActivate(createExecutionContext(UserRole.USER))).toBe(true);
  });

  it("permite acesso quando o usuário possui o role exigido", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN])
    };
    const guard = new RolesGuard(reflector as any);

    expect(guard.canActivate(createExecutionContext(UserRole.ADMIN))).toBe(
      true
    );
  });

  it("bloqueia acesso quando o usuário não possui o role exigido", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN])
    };
    const guard = new RolesGuard(reflector as any);

    expect(() =>
      guard.canActivate(createExecutionContext(UserRole.USER))
    ).toThrow(ForbiddenException);
  });
});
