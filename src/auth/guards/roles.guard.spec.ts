import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);
  const request = { user: undefined as { role?: string } | undefined };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    request.user = undefined;
  });

  it("allows routes without role metadata", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects unauthenticated requests for protected roles", () => {
    reflector.getAllAndOverride.mockReturnValue(["RESEARCHER"]);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("rejects users with an insufficient role", () => {
    reflector.getAllAndOverride.mockReturnValue(["RESEARCHER"]);
    request.user = { role: "PARTICIPANT" };

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows users with a required role", () => {
    reflector.getAllAndOverride.mockReturnValue([
      "RESEARCHER",
      "COMMUNITY_ADMIN",
    ]);
    request.user = { role: "COMMUNITY_ADMIN" };

    expect(guard.canActivate(context)).toBe(true);
  });
});
