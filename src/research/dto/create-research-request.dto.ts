import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ArrayNotEmpty, ArrayUnique } from "class-validator";

const operations = [
  "ACADEMIC_AGGREGATE_RESEARCH",
  "IDENTIFIABLE_RECORD_ACCESS",
  "COMMERCIAL_AI_TRAINING",
] as const;

export class CreateResearchRequestDto {
  @IsUUID()
  datasetId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsIn(["ACADEMIC", "PUBLIC_HEALTH", "COMMERCIAL", "AI_TRAINING", "OTHER"])
  purpose: "ACADEMIC" | "PUBLIC_HEALTH" | "COMMERCIAL" | "AI_TRAINING" | "OTHER";

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(operations, { each: true })
  operations: (typeof operations)[number][];

  @IsOptional()
  @IsUUID()
  organisationId?: string;
}
