import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService]
})
export class WorkspacesModule {}
