import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateAutomationTemplateVersionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  version?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsObject()
  definitionJson?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredIntegrations?: string[];

  @IsString()
  @IsNotEmpty()
  changelog!: string;
}
