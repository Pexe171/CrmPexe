import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CustomFieldDefinitionsController } from "./custom-field-definitions.controller";
import { CustomFieldDefinitionsService } from "./custom-field-definitions.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CustomFieldDefinitionsController],
  providers: [CustomFieldDefinitionsService]
})
export class CustomFieldDefinitionsModule {}
