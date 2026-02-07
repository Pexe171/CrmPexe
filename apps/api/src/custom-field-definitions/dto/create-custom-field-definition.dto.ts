import { CustomFieldEntity, CustomFieldType } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";

export class CreateCustomFieldDefinitionDto {
  @IsEnum(CustomFieldEntity)
  entity!: CustomFieldEntity;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(CustomFieldType)
  type!: CustomFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  options?: string[] | null;
}
