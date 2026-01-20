import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { Test } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
};

describe("AuthService", () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn()
          }
        },
        {
          provide: PrismaService,
          useValue: prismaMock
        }
      ]
    }).compile();

    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  it("hashes password on signup", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: { data: { email: string; name: string; passwordHash: string } }) => ({
      id: "user-1",
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash
    }));
    prismaMock.user.update.mockResolvedValue({ id: "user-1" });
    jest
      .spyOn(jwtService, "signAsync")
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    const result = await authService.signup({
      email: "user@example.com",
      name: "User",
      password: "secret"
    });

    const createdPasswordHash = prismaMock.user.create.mock.calls[0][0].data.passwordHash;

    expect(createdPasswordHash).not.toEqual("secret");
    expect(result.user.email).toEqual("user@example.com");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshTokenHash: expect.any(String) }
    });
  });

  it("rejects duplicated signup", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });

    await expect(
      authService.signup({
        email: "user@example.com",
        name: "User",
        password: "secret"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects login with invalid password", async () => {
    const passwordHash = await bcrypt.hash("secret", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      passwordHash
    });

    await expect(
      authService.login({
        email: "user@example.com",
        password: "wrong"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
