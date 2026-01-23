import { IsObject, IsOptional } from "class-validator";

export class InstallAutomationTemplateDto {
  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}
