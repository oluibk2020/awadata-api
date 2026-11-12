import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

export function AdminOnly() {
  return applyDecorators(
    Roles('PLATFORM_ADMIN'),
    UseGuards(AuthGuard('jwt'), RolesGuard),
  );
}
