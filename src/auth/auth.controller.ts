import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService, AuthenticatedUserProfile } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { JwtUser } from './dto/jwt-user.interface';
import { ResponseMessage } from 'src/helpers/message.interface';
import { AuthGuard } from '@nestjs/passport';
import { Setup2faDto, Verify2faDto, Disable2faDto } from './dto/setup-2fa.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  signIn(@Body() authCredentialsDto: AuthCredentialsDto): Promise<{
    accessToken?: string;
    requires2fa?: boolean;
    sessionId?: string;
  }> {
    return this.authService.signIn(authCredentialsDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/me')
  getCurrentUser(
    @Req() req: Request & { user: JwtUser },
  ): Promise<AuthenticatedUserProfile> {
    return this.authService.getCurrentUser(req.user.sub);
  }

  //protect this route
  @UseGuards(AuthGuard('jwt'))
  @Post('/logout')
  async logout(
    @Req() req: Request & { user: JwtUser; headers: { authorization?: string } },
  ): Promise<ResponseMessage> {
    const authorization = req.headers.authorization;
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    return this.authService.logout(accessToken);
  }

  @Post('/2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  async setup2faInit(
    @Req() req: Request & { user: JwtUser },
  ): Promise<{ manualKey: string; qrCode: string }> {
    return this.authService.initiate2fa(req.user.email);
  }

  @Post('/2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  async setup2faVerify(
    @Body() setup2faDto: Setup2faDto,
    @Req() req: Request & { user: JwtUser },
  ): Promise<{ backupCodes: string[]; message: string }> {
    return this.authService.setup2fa(req.user.email, setup2faDto.token);
  }

  @Post('/2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  async disable2fa(
    @Body() disable2faDto: Disable2faDto,
    @Req() req: Request & { user: JwtUser },
  ): Promise<ResponseMessage> {
    return this.authService.disable2fa(req.user.email, disable2faDto.token);
  }

  //check 2FA status
  @UseGuards(AuthGuard('jwt'))
  @Get('/2fa/status')
  async check2faStatus(
    @Req() req: Request & { user: JwtUser },
  ): Promise<{ is2faEnabled: boolean }> {
    return this.authService.check2faStatus(req.user.email);
  }

  @Post('/2fa/verify-token')
  async verify2faToken(
    @Body() verify2faDto: Verify2faDto,
  ): Promise<{ accessToken: string }> {
    // Get email from session ID - need to retrieve from cache
    // For this to work, frontend must pass the sessionId from initial login
    const session = await this.cacheManager.get<string>(
      `${verify2faDto.sessionId}`,
    );

    if (!session) {
      throw new UnauthorizedException(
        'Session ID required for 2FA verification',
      );
    }

    const { userId } = JSON.parse(session) as { userId?: string };
    await this.cacheManager.del(verify2faDto.sessionId);

    if (!userId) {
      throw new UnauthorizedException('Invalid 2FA session');
    }

    return this.authService.verify2faToken(
      userId,
      verify2faDto.token,
    );
  }
}
