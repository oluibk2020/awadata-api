import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwoFactorService {
  private Appname: string;
  constructor(private configService: ConfigService) {
    this.Appname = String(this.configService.get<string>('appName')); // Corrected to appName
  }
  generateSecret(email: string): {
    secret: string;
    qrCode: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `${this.Appname} (${email})`,
      issuer: this.Appname,
      length: 32,
    });

    return {
      secret: secret.base32,
      qrCode: `${secret.otpauth_url}`, // Will generate QR code from this
    };
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 30 seconds before and after
    });
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(randomBytes(5).toString('hex').toUpperCase());
    }
    return codes;
  }

  async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => bcrypt.hash(code, 12)));
  }

  async verifyBackupCode(
    backupCodes: string[],
    code: string,
  ): Promise<{ valid: boolean; remainingCodes: string[] }> {
    for (const [index, hashedCode] of backupCodes.entries()) {
      if (await bcrypt.compare(code, hashedCode)) {
        return {
          valid: true,
          remainingCodes: backupCodes.filter((_, codeIndex) => codeIndex !== index),
        };
      }
    }

    return { valid: false, remainingCodes: backupCodes };
  }
}
