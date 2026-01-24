import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpsertWorkspaceVariableDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsBoolean()
  @IsOptional()
  isSensitive?: boolean;
}
