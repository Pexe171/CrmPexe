import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { UserRole } from "@prisma/client";
import { AuditLogsService } from "./audit-logs.service";
import { PrismaService } from "../prisma/prisma.service";

const prismaMock = {
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  },
  workspaceMember: {
    findFirst: jest.fn()
  }
};

describe("AuditLogsService", () => {
  let service: AuditLogsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.workspaceMember.findFirst.mockResolvedValue({ id: "member-1" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    service = moduleRef.get(AuditLogsService);
  });

  it("lists audit logs for current workspace", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      currentWorkspaceId: "ws-1"
    });
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: "log-1" }]);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const result = await service.listAuditLogs(
      {
        id: "user-1",
        email: "user@example.com",
        role: UserRole.USER,
        isSuperAdmin: false
      },
      1,
      10
    );

    expect(result.data).toEqual([{ id: "log-1" }]);
    expect(result.meta).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      totalPages: 1,
      scope: "workspace"
    });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-1" } })
    );
  });

  it("rejects listing when current workspace is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: null });

    await expect(
      service.listAuditLogs(
        {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
          isSuperAdmin: false
        },
        1,
        10
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("bloqueia acesso quando o usuário não é membro do workspace atual", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      currentWorkspaceId: "ws-1"
    });
    prismaMock.workspaceMember.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.listAuditLogs(
        {
          id: "user-1",
          email: "user@example.com",
          role: UserRole.USER,
          isSuperAdmin: false
        },
        1,
        10
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("permite que admin visualize logs globais", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: "log-global" }]);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const result = await service.listAuditLogs(
      {
        id: "admin-1",
        email: "admin@example.com",
        role: UserRole.ADMIN,
        isSuperAdmin: false
      },
      1,
      20,
      undefined,
      "global"
    );

    expect(result.meta.scope).toEqual("global");
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("bloqueia escopo global para usuários comuns", async () => {
    await expect(
      service.listAuditLogs(
        {
          id: "user-2",
          email: "user2@example.com",
          role: UserRole.USER,
          isSuperAdmin: false
        },
        1,
        20,
        undefined,
        "global"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
