import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class AssignAgentToWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  agentTemplateId!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}
