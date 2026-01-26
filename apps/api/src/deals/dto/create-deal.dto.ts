import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDealDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  contactId?: string;
}
