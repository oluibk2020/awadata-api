jest.mock("node-fetch", () => jest.fn());
jest.mock("uuid", () => ({ v4: () => "test-reference" }));

import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy banned account access", () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const cacheManager = { get: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue("secret") };
  const strategy = new JwtStrategy(
    prisma as any,
    configService as any,
    cacheManager as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager.get.mockResolvedValue({ accessToken: "token" });
    prisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "USER",
      isActive: true,
      isBanned: false,
    });
  });

  it("rejects a banned account even when its session is cached", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      isActive: true,
      isBanned: true,
    });

    await expect(
      strategy.validate(
        { headers: { authorization: "Bearer access-token" } } as any,
        {
          sub: "student-1",
          email: "student@example.com",
        } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheManager.get).not.toHaveBeenCalled();
  });

  it("returns the current database user for an active session", async () => {
    const request = {
      headers: { authorization: "Bearer access-token" },
    } as any;

    await expect(
      strategy.validate(
        request,
        {
          sub: "student-1",
          email: "student@example.com",
        } as any,
      ),
    ).resolves.toMatchObject({
      sub: "student-1",
      email: "student@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "USER",
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "student-1" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isBanned: true,
      },
    });
  });

  it("rejects a missing session", async () => {
    cacheManager.get.mockResolvedValue(undefined);

    await expect(
      strategy.validate(
        { headers: { authorization: "Bearer access-token" } } as any,
        {
          sub: "student-1",
          email: "student@example.com",
        } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects nonexistent and inactive accounts", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      strategy.validate(
        { headers: { authorization: "Bearer access-token" } } as any,
        {
          sub: "missing-user",
          email: "student@example.com",
        } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: "student-1",
      email: "student@example.com",
      isActive: false,
      isBanned: false,
    });
    await expect(
      strategy.validate(
        { headers: { authorization: "Bearer access-token" } } as any,
        {
          sub: "student-1",
          email: "student@example.com",
        } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("checks the session for the presented token", async () => {
    await strategy.validate(
      { headers: { authorization: "Bearer different-token" } } as any,
      {
        sub: "student-1",
        email: "student@example.com",
      } as any,
    );

    expect(cacheManager.get).toHaveBeenCalledWith(
      expect.stringMatching(/^sessionToken:[a-f0-9]{64}$/),
    );
  });
});
