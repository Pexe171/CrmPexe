import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { WorkspaceContextService } from "./workspace-context.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [WorkspaceContextService],
  exports: [WorkspaceContextService]
})
export class WorkspaceModule {}
