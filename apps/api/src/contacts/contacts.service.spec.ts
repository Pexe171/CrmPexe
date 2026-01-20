import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ContactsService } from "./contacts.service";
import { PrismaService } from "../prisma/prisma.service";

const prismaMock = {
  user: {
    findUnique: jest.fn()
  },
  company: {
    findFirst: jest.fn()
  },
  contact: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

describe("ContactsService", () => {
  let service: ContactsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    service = moduleRef.get(ContactsService);
  });

  it("lists contacts for current workspace", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.contact.findMany.mockResolvedValue([{ id: "contact-1" }]);

    const result = await service.listContacts("user-1");

    expect(result).toEqual([{ id: "contact-1" }]);
    expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws-1" } })
    );
  });

  it("creates contact with company validation", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.company.findFirst.mockResolvedValue({ id: "comp-1" });
    prismaMock.contact.create.mockResolvedValue({ id: "contact-1", name: "Maria" });

    const result = await service.createContact("user-1", {
      name: "  Maria  ",
      email: "  maria@acme.com  ",
      companyId: "comp-1"
    });

    expect(result).toEqual({ id: "contact-1", name: "Maria" });
    expect(prismaMock.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Maria", email: "maria@acme.com", companyId: "comp-1" })
      })
    );
  });

  it("rejects invalid company linkage", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.company.findFirst.mockResolvedValue(null);

    await expect(
      service.createContact("user-1", {
        name: "Contato",
        companyId: "missing"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails update when contact missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ currentWorkspaceId: "ws-1" });
    prismaMock.contact.findFirst.mockResolvedValue(null);

    await expect(service.updateContact("user-1", "contact-1", { name: "Nova" })).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
