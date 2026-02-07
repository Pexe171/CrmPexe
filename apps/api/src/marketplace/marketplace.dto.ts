import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class ToggleMarketplaceAccessDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class MarketplaceAccessDto extends ToggleMarketplaceAccessDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;
}
