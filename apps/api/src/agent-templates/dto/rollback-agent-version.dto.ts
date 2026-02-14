import { IsOptional, IsString, MaxLength } from "class-validator";

export class RollbackAgentVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
