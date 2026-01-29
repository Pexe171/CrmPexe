import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateImpersonationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
