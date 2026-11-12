import { HealthController } from "./health.controller";
import { HttpStatus } from "@nestjs/common";

describe("HealthController", () => {
  let controller: HealthController;
  let mockPrisma: any;
  let mockCacheManager: any;
  let mockRes: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };
    mockCacheManager = {
      set: jest.fn(),
      get: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    controller = new HealthController(mockPrisma, mockCacheManager);
  });

  it("returns HEALTHY (200) when both database and redis probe succeed", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockCacheManager.set.mockResolvedValueOnce(undefined);
    mockCacheManager.get.mockResolvedValueOnce("ok");

    await controller.health(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "HEALTHY",
        database: "HEALTHY",
        redis: "HEALTHY",
      }),
    );
  });

  it("returns DEGRADED (200) when database succeeds but redis probe fails", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockCacheManager.set.mockRejectedValueOnce(new Error("Redis connection refused"));

    await controller.health(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "DEGRADED",
        database: "HEALTHY",
        redis: "DEGRADED",
      }),
    );
  });

  it("returns UNHEALTHY (503) when database query fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("Database connection lost"));
    mockCacheManager.set.mockResolvedValueOnce(undefined);
    mockCacheManager.get.mockResolvedValueOnce("ok");

    await controller.health(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "UNHEALTHY",
        database: "UNHEALTHY",
      }),
    );
  });
});

