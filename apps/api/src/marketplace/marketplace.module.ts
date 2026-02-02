import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";

@Module({
  imports: [NotificationsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService]
})
export class MarketplaceModule {}
