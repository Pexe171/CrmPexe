import { IsOptional, IsString } from "class-validator";

export class InstallAutomationInstanceDto {
  @IsOptional()
  @IsString()
  targetWorkspaceId?: string;
}
