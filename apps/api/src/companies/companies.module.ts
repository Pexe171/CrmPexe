import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CompaniesController],
  providers: [CompaniesService]
})
export class CompaniesModule {}
