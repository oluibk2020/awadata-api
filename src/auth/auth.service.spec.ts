jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { compare: jest.fn() },
}));

import { UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

describe("AuthService banned account access", () => {
  const prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };
  const jwtService = { sign: jest.fn().mockReturnValue("access-token") };
  const cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const twoFactorService = {
    verifyToken: jest.fn().mockReturnValue(true),
    verifyBackupCode: jest.fn(),
    hashBackupCodes: jest.fn().mockResolvedValue(["hashed-code"]),
    generateBackupCodes: jest.fn().mockReturnValue(["ABCD123456"]),
  };
  const service = new AuthService(
    prisma as any,
    jwtService as any,
    cacheManager as any,
    twoFactorService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it("rejects banned users during password sign-in", async () => {
    prisma.user.findUnique.mockResolvedValue({
      email: "student@example.com",
      passwordHash: "hash",
      isBanned: true,
    });

    await expect(
      service.signIn({ email: "student@example.com", password: "password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it("normalizes the email and signs the database user ID", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "student@example.com",
      passwordHash: "hash",
      role: "RESEARCHER",
      isActive: true,
      isBanned: false,
      twoFactorEnabled: false,
    });

    await service.signIn({
      email: "  STUDENT@EXAMPLE.COM ",
      password: "password",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "student@example.com" },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith("password", "hash");
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: "user-1",
      email: "student@example.com",
      role: "RESEARCHER",
    });
  });

  it("rejects invalid passwords without issuing a token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "student@example.com",
      passwordHash: "hash",
      role: "RESEARCHER",
      isBanned: false,
      twoFactorEnabled: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.signIn({
        email: "student@example.com",
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it("returns the current user's safe profile by ID", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "student@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "RESEARCHER",
    });

    await expect(service.getCurrentUser("user-1")).resolves.toEqual({
      id: "user-1",
      email: "student@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "RESEARCHER",
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  });

  it("rejects a missing current user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getCurrentUser("missing-user")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("revokes only the supplied access-token session", async () => {
    await expect(service.logout("access-token")).resolves.toEqual({
      message: "success",
    });
    expect(cacheManager.del).toHaveBeenCalledWith(
      expect.stringMatching(/^sessionToken:[a-f0-9]{64}$/),
    );
  });

  it("rejects banned users when verifying a 2FA token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      isActive: true,
      isBanned: true,
      twoFactorEnabled: true,
      twoFactorSecret: "secret",
      twoFactorBackupCodes: [],
    });

    await expect(
      service.verify2faToken("student-1", "123456"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(twoFactorService.verifyToken).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it("hashes backup codes before storing them", async () => {
    cacheManager.get.mockResolvedValue("temporary-secret");
    prisma.user.findUnique.mockResolvedValue({
      email: "student@example.com",
      twoFactorEnabled: false,
    });

    await service.setup2fa("student@example.com", "123456");

    expect(twoFactorService.hashBackupCodes).toHaveBeenCalledWith([
      "ABCD123456",
    ]);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: "student@example.com" },
      data: {
        twoFactorSecret: "temporary-secret",
        twoFactorEnabled: true,
        twoFactorBackupCodes: ["hashed-code"],
      },
    });
  });

  it("rejects inactive users during 2FA verification", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      isActive: false,
      isBanned: false,
      twoFactorEnabled: true,
      twoFactorSecret: "secret",
      twoFactorBackupCodes: [],
    });

    await expect(
      service.verify2faToken("student-1", "123456"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(twoFactorService.verifyToken).not.toHaveBeenCalled();
  });
});
