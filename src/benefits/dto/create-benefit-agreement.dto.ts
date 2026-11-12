import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateBenefitAgreementDto {
  @IsUUID()
  researchRequestId: string;

  @IsUUID()
  communityId: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
