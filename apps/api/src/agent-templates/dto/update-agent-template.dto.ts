import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAgentTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  priceLabel?: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString({ each: true })
  allowedPlans?: string[];
}
