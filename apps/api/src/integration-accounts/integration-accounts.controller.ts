import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateIntegrationAccountDto } from "./dto/create-integration-account.dto";
import { UpdateIntegrationAccountDto } from "./dto/update-integration-account.dto";
import { UpsertIntegrationSecretDto } from "./dto/upsert-integration-secret.dto";
import { IntegrationAccountsService } from "./integration-accounts.service";

@Controller("integration-accounts")
@UseGuards(AccessTokenGuard)
export class IntegrationAccountsController {
  constructor(private readonly integrationAccountsService: IntegrationAccountsService) {}

  @Get()
  async listAccounts(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.listAccounts(user.id, workspaceId);
  }

  @Post()
  async createAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateIntegrationAccountDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.createAccount(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateAccount(
    @CurrentUser() user: AuthUser,
    @Param("id") accountId: string,
    @Body() body: UpdateIntegrationAccountDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.updateAccount(user.id, accountId, body, workspaceId);
  }

  @Delete(":id")
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Param("id") accountId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.deleteAccount(user.id, accountId, workspaceId);
  }

  @Put(":id/secret")
  async upsertSecret(
    @CurrentUser() user: AuthUser,
    @Param("id") accountId: string,
    @Body() body: UpsertIntegrationSecretDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.upsertSecret(user.id, accountId, body.payload, workspaceId);
  }

  @Post(":id/whatsapp/qr")
  async requestWhatsappQr(
    @CurrentUser() user: AuthUser,
    @Param("id") accountId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.requestWhatsappQr(user.id, accountId, workspaceId);
  }

  @Get(":id/whatsapp/status")
  async getWhatsappStatus(
    @CurrentUser() user: AuthUser,
    @Param("id") accountId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.integrationAccountsService.getWhatsappStatus(user.id, accountId, workspaceId);
  }
}
