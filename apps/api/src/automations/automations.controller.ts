import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import { AutomationsService } from "./automations.service";
import { CreateAutomationTemplateDto } from "./dto/create-automation-template.dto";
import { CreateAutomationTemplateVersionDto } from "./dto/create-automation-template-version.dto";
import { GrantAutomationAccessDto } from "./dto/grant-automation-access.dto";
import { InstallAutomationInstanceDto } from "./dto/install-automation-instance.dto";
import { InstallAutomationTemplateDto } from "./dto/install-automation-template.dto";
import { UpdateAutomationInstanceVersionDto } from "./dto/update-automation-instance-version.dto";

@Controller()
@UseGuards(AccessTokenGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get("automation-templates")
  async listTemplates() {
    return this.automationsService.listTemplates();
  }

  @Post("automation-templates")
  @UseGuards(SuperAdminGuard)
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAutomationTemplateDto
  ) {
    return this.automationsService.createTemplate(user.id, body);
  }

  @Get("automation-templates/:id/versions")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listTemplateVersions(@Param("id") templateId: string) {
    return this.automationsService.listTemplateVersions(templateId);
  }

  @Post("automation-templates/:id/versions")
  @UseGuards(SuperAdminGuard)
  async createTemplateVersion(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Body() body: CreateAutomationTemplateVersionDto
  ) {
    return this.automationsService.createTemplateVersion(
      user.id,
      templateId,
      body
    );
  }

  @Post("automation-templates/:id/install")
  async installTemplate(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Body() body: InstallAutomationTemplateDto
  ) {
    if (body.targetWorkspaceId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Apenas Super Admins podem instalar em outros workspaces"
      );
    }

    return this.automationsService.installTemplate(user, templateId, body);
  }

  @Post("automation-templates/:id/request-access")
  async requestTemplateAccess(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.automationsService.requestTemplateAccess(
      user.id,
      templateId,
      workspaceId
    );
  }

  @Post("automation-templates/:id/grant-access")
  @UseGuards(SuperAdminGuard)
  async grantTemplateAccess(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Body() body: GrantAutomationAccessDto
  ) {
    return this.automationsService.grantTemplateAccess(
      user.id,
      templateId,
      body.workspaceId
    );
  }

  @Get("automation-instances")
  async listInstances(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ) {
    const parsedPage = Number(page);
    const parsedPerPage = Number(perPage);

    return this.automationsService.listInstances(
      user.id,
      workspaceId,
      Number.isFinite(parsedPage) ? parsedPage : undefined,
      Number.isFinite(parsedPerPage) ? parsedPerPage : undefined
    );
  }

  @Post("automations/:id/install")
  async installInstance(
    @CurrentUser() user: AuthUser,
    @Param("id") instanceId: string,
    @Body() body: InstallAutomationInstanceDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.automationsService.installAutomationInstance(
      user.id,
      instanceId,
      workspaceId,
      body.targetWorkspaceId,
      user.isSuperAdmin
    );
  }

  @Post("automations/:id/update-version")
  async updateAutomationVersion(
    @CurrentUser() user: AuthUser,
    @Param("id") instanceId: string,
    @Body() body: UpdateAutomationInstanceVersionDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.automationsService.updateAutomationInstanceVersion(
      user.id,
      instanceId,
      body,
      workspaceId
    );
  }

  @Post("automations/:id/enable")
  async enableInstance(
    @CurrentUser() user: AuthUser,
    @Param("id") instanceId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.automationsService.enableAutomation(
      user.id,
      instanceId,
      workspaceId
    );
  }

  @Post("automations/:id/disable")
  async disableInstance(
    @CurrentUser() user: AuthUser,
    @Param("id") instanceId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.automationsService.disableAutomationAndPauseStatus(
      user.id,
      instanceId,
      workspaceId
    );
  }
}
