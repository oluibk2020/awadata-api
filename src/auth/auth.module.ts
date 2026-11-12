import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './dto/jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { TwoFactorService } from './services/two-factor.service';
import type { StringValue } from 'ms';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TwoFactorService, RolesGuard],
  imports: [
    ConfigModule,
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const configuredExpiry = configService
          .getOrThrow<string>('jwt.expiresIn')
          .trim();
        const numericExpiry = Number(configuredExpiry);

        return {
          secret: configService.getOrThrow<string>('jwt.secret'),
          signOptions: {
            // Numeric values in the env are seconds; suffixed values (for
            // example, "7d" or "12h") are passed through as durations.
            expiresIn: Number.isFinite(numericExpiry)
              ? numericExpiry
              : (configuredExpiry as StringValue),
          },
        };
      },
    }),
  ],
  exports: [JwtStrategy, PassportModule, RolesGuard],
})
export class AuthModule {}
