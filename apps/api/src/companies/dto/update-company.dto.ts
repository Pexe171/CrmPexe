import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min
} from "class-validator";

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
