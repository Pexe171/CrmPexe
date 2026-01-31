import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateWorkspaceMemberPoliciesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUnitIds?: string[];
}
