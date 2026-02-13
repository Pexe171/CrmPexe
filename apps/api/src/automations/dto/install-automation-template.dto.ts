import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class InstallAutomationTemplateDto {
  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  versionId?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsUUID()
  targetWorkspaceId?: string;
}
