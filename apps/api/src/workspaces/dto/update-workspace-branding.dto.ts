import { IsOptional, IsString } from "class-validator";

export class UpdateWorkspaceBrandingDto {
  @IsOptional()
  @IsString()
  brandName?: string | null;

  @IsOptional()
  @IsString()
  brandLogoUrl?: string | null;

  @IsOptional()
  @IsString()
  brandPrimaryColor?: string | null;

  @IsOptional()
  @IsString()
  brandSecondaryColor?: string | null;

  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @IsOptional()
  @IsString()
  locale?: string | null;
}
