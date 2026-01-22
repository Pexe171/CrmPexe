import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string | null;
}
