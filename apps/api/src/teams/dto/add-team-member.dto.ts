import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min
} from "class-validator";

export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
