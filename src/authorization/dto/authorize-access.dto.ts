import { IsIn, IsUUID } from "class-validator";

export const accessOperations = [
  "ACADEMIC_AGGREGATE_RESEARCH",
  "IDENTIFIABLE_RECORD_ACCESS",
  "COMMERCIAL_AI_TRAINING",
] as const;

export type AccessOperation = (typeof accessOperations)[number];

export class AuthorizeAccessDto {
  @IsUUID()
  researchRequestId: string;

  @IsIn(accessOperations)
  operation: AccessOperation;
}
