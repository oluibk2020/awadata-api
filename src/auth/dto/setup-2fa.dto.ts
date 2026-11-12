import { IsString, Length, IsOptional, Matches } from 'class-validator';

export class Setup2faDto {
  @IsString()
  @Length(6, 6, { message: 'Token must be 6 digits' })
  token: string;
}

export class Verify2faDto {
  @IsString()
  @Matches(/^(?:\d{6}|[A-F0-9]{10})$/, {
    message: 'Token must be a 6-digit code or a 10-character backup code',
  })
  token: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class Disable2faDto {
  @IsString()
  @Length(6, 6, { message: 'Token must be 6 digits' })
  token: string;
}
