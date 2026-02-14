import { IsObject, IsOptional, IsString } from "class-validator";

export class ActivateWorkspaceAgentDto {
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}
