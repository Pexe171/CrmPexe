import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
