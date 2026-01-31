import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateQueueDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  channel!: string;

  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
