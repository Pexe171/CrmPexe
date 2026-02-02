import { IsNotEmpty, IsString } from "class-validator";

export class GrantAutomationAccessDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}
