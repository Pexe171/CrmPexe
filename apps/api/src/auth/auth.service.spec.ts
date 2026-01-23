import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { createHash } from "crypto";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const sendMailMock = jest.fn().mockResolvedValue({});

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: sendMailMock
    }))
  }
}));

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  otpCode: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn()
  }
};

describe("AuthService", () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASS = "smtp-pass";
    process.env.SMTP_FROM = "no-reply@crmpexe.local";

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

  it("requests OTP for signup", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.otpCode.create.mockResolvedValue({ id: "otp-1" });

    const result = await authService.requestOtp({
      email: "user@example.com",
      name: "User",
      contact: "WhatsApp",
      emailConfirmation: "user@example.com"
    });

    expect(result.message).toEqual("Código enviado.");
    expect(prismaMock.otpCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          purpose: "SIGNUP"
        })
      })
    );
    expect(sendMailMock).toHaveBeenCalled();
  });

  it("rejects signup request for existing user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });

    await expect(
      authService.requestOtp({
        email: "user@example.com",
        name: "User",
        contact: "WhatsApp",
        emailConfirmation: "user@example.com"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("verifies OTP and issues tokens", async () => {
    const code = "123456";
    const codeHash = createHash("sha256").update(code).digest("hex");

    prismaMock.otpCode.findFirst.mockResolvedValue({
      id: "otp-1",
      email: "user@example.com",
      codeHash,
      purpose: "LOGIN"
    });
    prismaMock.otpCode.update.mockResolvedValue({ id: "otp-1" });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      contact: "WhatsApp"
    });
    prismaMock.user.update.mockResolvedValue({ id: "user-1" });
    jest
      .spyOn(jwtService, "signAsync")
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    const result = await authService.verifyOtp({
      email: "user@example.com",
      code
    });

    expect(result.user.email).toEqual("user@example.com");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshTokenHash: expect.any(String) }
    });
  });

  it("rejects login without OTP", async () => {
    prismaMock.otpCode.findFirst.mockResolvedValue(null);

    await expect(
      authService.verifyOtp({
        email: "user@example.com",
        code: "000000"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
