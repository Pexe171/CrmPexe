import { IsNotEmpty, IsString } from "class-validator";

export class JoinWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
