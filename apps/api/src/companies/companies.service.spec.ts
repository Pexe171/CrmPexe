import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CompaniesService } from "./companies.service";
import { PrismaService } from "../prisma/prisma.service";

const prismaMock = {
  user: {
    findUnique: jest.fn()
  },
  company: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

describe("CompaniesService", () => {
  let service: CompaniesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    service = moduleRef.get(CompaniesService);
  });

  it("lists companies for current workspace", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.company.findMany.mockResolvedValue([{ id: "comp-1" }]);

    const result = await service.listCompanies("user-1");

    expect(result).toEqual([{ id: "comp-1" }]);
    expect(prismaMock.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-1" } })
    );
  });

  it("creates company with trimmed fields", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.company.create.mockResolvedValue({ id: "comp-1", name: "Acme" });

    const result = await service.createCompany("user-1", {
      name: "  Acme  ",
      domain: "  acme.com  ",
      phone: "  +55 11 9999-9999  "
    });

    expect(result).toEqual({ id: "comp-1", name: "Acme" });
    expect(prismaMock.company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Acme", domain: "acme.com", phone: "+55 11 9999-9999" })
      })
    );
  });

  it("rejects empty company name", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });

    await expect(
      service.createCompany("user-1", {
        name: "  "
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails update when company missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.company.findFirst.mockResolvedValue(null);

    await expect(service.updateCompany("user-1", "comp-1", { name: "Nova" })).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
