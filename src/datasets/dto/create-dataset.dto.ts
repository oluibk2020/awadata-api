import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { DatasetStatus } from "../../../generated/prisma/enums";

export class CreateDatasetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(["DRAFT", "ACTIVE", "ARCHIVED"])
  status?: DatasetStatus;
}
