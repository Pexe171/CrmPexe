import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

export class CreateAutomationTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsOptional()
  @IsString()
  changelog?: string | null;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsObject()
  definitionJson!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredIntegrations?: string[];
}
