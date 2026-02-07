import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

export class CreateAutomationTemplateVersionDto {
  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsOptional()
  @IsString()
  changelog?: string | null;

  @IsObject()
  definitionJson!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredIntegrations?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  category?: string;
}
