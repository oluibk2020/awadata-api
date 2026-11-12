import { IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from "class-validator";

export class CreateOwnParticipantDto {
  @IsUUID()
  communityId: string;

  @IsUUID()
  datasetId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      "subjectCode must be pseudonymous and contain only A-Z, 0-9, _ or -",
  })
  subjectCode: string;
}
