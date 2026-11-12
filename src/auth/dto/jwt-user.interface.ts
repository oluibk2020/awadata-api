import type { UserRole } from "../../../generated/prisma/enums";

export interface JwtUser {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
