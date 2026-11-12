import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import emailConfig from "./config/email.config";
import { configValidationSchema } from "./config/joi.config.schema";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthController } from "./health.controller";
import { CommunitiesModule } from './communities/communities.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ParticipantsModule } from './participants/participants.module';
import { ConsentModule } from './consent/consent.module';
import { ResearchModule } from './research/research.module';
import { GovernanceModule } from './governance/governance.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AuditModule } from './audit/audit.module';
import { BenefitsModule } from './benefits/benefits.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || "development"}`],
      load: [appConfig, databaseConfig, jwtConfig, emailConfig],
      validationSchema: configValidationSchema,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: "global",
          ttl: configService.get<number>("rateLimit.ttlMs", 60000),
          limit: configService.get<number>("rateLimit.limit", 60),
        },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const host = process.env.REDIS_HOST ?? "127.0.0.1";
        // const password = process.env.REDIS_PASSWORD ?? '';
        const port = Number(process.env.REDIS_PORT ?? 6379);

        try {
          const store = await redisStore({
            socket: { host, port },
            // password: password,
          });
          return {
            store: store as any,
            ttl: 60, // seconds
          } as any;
        } catch (err) {
          // Redis not available — fallback to in-memory cache so app keeps running
          // Log the error for debugging
          // eslint-disable-next-line no-console
          console.error(
            "Redis unavailable, falling back to in-memory cache",
            err,
          );
          return {
            ttl: 60, // default in-memory cache
          };
        }
      },
    }),
    UserModule,
    AuthModule,
    PrismaModule,
    CommunitiesModule,
    DatasetsModule,
    ParticipantsModule,
    ConsentModule,
    ResearchModule,
    GovernanceModule,
    AuthorizationModule,
    AuditModule,
    BenefitsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Applies the rate limiter globally
    },
  ],
})
export class AppModule {}
