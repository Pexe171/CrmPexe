import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
