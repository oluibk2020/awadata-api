import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class RejectBenefitAgreementDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
