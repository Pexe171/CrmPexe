import { CustomFieldEntity, CustomFieldType } from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateCustomFieldDefinitionDto {
  @IsOptional()
  @IsEnum(CustomFieldEntity)
  entity?: CustomFieldEntity;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  key?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsEnum(CustomFieldType)
  type?: CustomFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  options?: string[] | null;
}
