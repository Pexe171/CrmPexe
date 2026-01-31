import { IsIn, IsOptional, IsString } from "class-validator";

export class ExportWorkspaceQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["json", "zip"])
  format?: "json" | "zip";
}
