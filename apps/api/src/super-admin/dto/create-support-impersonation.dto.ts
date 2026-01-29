import { IsOptional, IsString } from "class-validator";

export class CreateSupportImpersonationDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
