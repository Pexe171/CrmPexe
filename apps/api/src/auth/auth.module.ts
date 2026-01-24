import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, RolesGuard],
  exports: [JwtModule, AccessTokenGuard, RolesGuard]
})
export class AuthModule {}
