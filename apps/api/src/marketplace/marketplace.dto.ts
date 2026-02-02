import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class ToggleMarketplaceAccessDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsBoolean()
  status: boolean;
}
