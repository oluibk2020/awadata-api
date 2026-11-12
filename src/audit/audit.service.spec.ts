import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from "../prisma/prisma.service";

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue({ auditEvent: { create: jest.fn(), findMany: jest.fn() } })
      .compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
