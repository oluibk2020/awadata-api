import { IsEnum, IsNotEmpty, IsObject } from "class-validator";
import type { ConsentOperation, ResearchPurpose } from "../../../generated/prisma/enums";

export class CreateConsentDto {
  @IsEnum(["ACADEMIC", "PUBLIC_HEALTH", "COMMERCIAL", "AI_TRAINING", "OTHER"])
  purpose: ResearchPurpose;

  @IsObject()
  @IsNotEmpty()
  decisions: Record<ConsentOperation, boolean>;
}
