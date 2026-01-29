import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthenticatedRequest } from "./auth.types";

const createExecutionContext = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request
    })
  }) as ExecutionContext;

describe("AccessTokenGuard", () => {
  const jwtServiceMock = {
    verifyAsync: jest.fn()
  };
  const prismaMock = {
    user: {
      findUnique: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = "test_access_secret";
  });

  it("aceita token válido e revalida o role no banco", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: "user-1",
      email: "user@example.com",
      role: UserRole.ADMIN
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: UserRole.ADMIN,
      superAdmin: true,
      currentWorkspaceId: "ws-1"
    });

    const request = {
      headers: { authorization: "Bearer access-token" }
    } as Partial<AuthenticatedRequest>;

    const guard = new AccessTokenGuard(jwtServiceMock as any, prismaMock as any);
    const canActivate = await guard.canActivate(createExecutionContext(request));

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({
      id: "user-1",
      email: "user@example.com",
      role: UserRole.ADMIN,
      superAdmin: true,
      currentWorkspaceId: "ws-1"
    });
  });

  it("bloqueia quando o role do token não confere com o banco", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: "user-1",
      email: "user@example.com",
      role: UserRole.ADMIN
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: UserRole.USER,
      superAdmin: false,
      currentWorkspaceId: "ws-1"
    });

    const request = {
      headers: { authorization: "Bearer access-token" }
    } as Partial<AuthenticatedRequest>;

    const guard = new AccessTokenGuard(jwtServiceMock as any, prismaMock as any);

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
