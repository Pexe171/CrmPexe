import { IsOptional, IsString } from "class-validator";

export class UpdateAutomationInstanceVersionDto {
  @IsOptional()
  @IsString()
  versionId?: string;
}
