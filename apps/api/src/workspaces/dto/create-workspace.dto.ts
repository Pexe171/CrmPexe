import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export const WORKSPACE_TEMPLATES = ["blank", "real_estate", "agency"] as const;
export type WorkspaceTemplate = (typeof WORKSPACE_TEMPLATES)[number];

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  @IsIn(WORKSPACE_TEMPLATES)
  template?: WorkspaceTemplate;
}
