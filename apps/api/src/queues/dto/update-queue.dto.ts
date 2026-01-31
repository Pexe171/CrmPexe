import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateQueueDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
