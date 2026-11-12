import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
} from "class-validator";

const operations = [
  "ACADEMIC_AGGREGATE_RESEARCH",
  "IDENTIFIABLE_RECORD_ACCESS",
  "COMMERCIAL_AI_TRAINING",
] as const;

export class GovernanceDecisionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(operations, { each: true })
  approvedOperations: (typeof operations)[number][];
}
