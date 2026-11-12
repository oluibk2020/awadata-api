import { IsIn } from "class-validator";

export class UpdateBenefitAgreementDto {
  @IsIn(["FULFILLED", "CANCELLED"])
  status: "FULFILLED" | "CANCELLED";
}
