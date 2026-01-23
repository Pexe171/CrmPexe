import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { AutomationsService } from "./automations.service";
import { CreateAutomationTemplateDto } from "./dto/create-automation-template.dto";
import { InstallAutomationTemplateDto } from "./dto/install-automation-template.dto";

@Controller()
@UseGuards(AccessTokenGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get("automation-templates")
  async listTemplates() {
    return this.automationsService.listTemplates();
  }

  @Post("automation-templates")
  async createTemplate(@CurrentUser() user: AuthUser, @Body() body: CreateAutomationTemplateDto) {
    return this.automationsService.createTemplate(user.id, body);
  }

  @Post("automation-templates/:id/install")
  async installTemplate(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Body() body: InstallAutomationTemplateDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.automationsService.installTemplate(user.id, templateId, body, workspaceId);
  }

  @Get("automation-instances")
  async listInstances(@CurrentUser() user: AuthUser, @Headers("x-workspace-id") workspaceId?: string) {
    return this.automationsService.listInstances(user.id, workspaceId);
  }
}
