import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, AccessTokenGuard]
})
export class WorkspacesModule {}
