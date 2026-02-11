import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { WorkspacesService } from "./workspaces.service";
import { PrismaService } from "../prisma/prisma.service";

const prismaMock = {
  workspace: {
    create: jest.fn(),
    findUnique: jest.fn()
  },
  role: {
    create: jest.fn()
  },
  workspaceMember: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn()
  },
  workspaceMembership: {
    create: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn()
  },
  user: {
    update: jest.fn(),
    findUnique: jest.fn()
  },
  $transaction: jest.fn()
};

describe("WorkspacesService", () => {
  let service: WorkspacesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock)
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    service = moduleRef.get(WorkspacesService);
  });

  it("creates workspace with owner membership", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);
    prismaMock.workspace.create.mockResolvedValue({
      id: "ws-1",
      name: "Equipe Comercial",
      code: "ABC123",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z")
    });
    prismaMock.role.create.mockResolvedValue({ id: "role-1", name: "Owner" });
    prismaMock.workspaceMember.create.mockResolvedValue({ id: "member-1" });
    prismaMock.workspaceMembership.create.mockResolvedValue({
      id: "membership-1"
    });
    prismaMock.user.update.mockResolvedValue({ id: "user-1" });

    const result = await service.createWorkspace("user-1", {
      name: "Equipe Comercial",
      password: "senha123"
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "ws-1",
        name: "Equipe Comercial",
        code: "ABC123"
      })
    );
    expect(prismaMock.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Owner" })
      })
    );
    expect(prismaMock.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", workspaceId: "ws-1" })
      })
    );
  });

  it("rejects empty workspace name", async () => {
    await expect(
      service.createWorkspace("user-1", { name: " ", password: "123456" })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists workspaces for user", async () => {
    prismaMock.workspaceMember.findMany.mockResolvedValue([
      {
        workspace: {
          id: "ws-1",
          name: "Workspace Alpha",
          brandName: "Workspace Alpha",
          locale: "pt-BR",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z")
        }
      }
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      currentWorkspaceId: "ws-1"
    });

    const result = await service.listWorkspaces("user-1");

    expect(result.currentWorkspaceId).toBe("ws-1");
    expect(result.workspaces).toHaveLength(1);
  });

  it("prevents switching to unauthorized workspace", async () => {
    prismaMock.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(
      service.switchWorkspace("user-1", "ws-2")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
