import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { AgentTemplatesService } from "./agent-templates.service";
import { ImportAgentTemplateDto } from "./dto/import-agent-template.dto";
import { ListAgentTemplatesQueryDto } from "./dto/list-agent-templates-query.dto";
import { RollbackAgentVersionDto } from "./dto/rollback-agent-version.dto";
import { UpdateAgentTemplateDto } from "./dto/update-agent-template.dto";

@Controller("agent-templates")
@UseGuards(AccessTokenGuard)
export class AgentTemplatesController {
  constructor(private readonly service: AgentTemplatesService) {}

  @Post("import")
  async importDraft(@CurrentUser() user: AuthUser, @Body() body: ImportAgentTemplateDto) {
    return this.service.importDraft(user, body);
  }

  @Post(":id/publish")
  async publish(@CurrentUser() user: AuthUser, @Param("id") templateId: string) {
    return this.service.publish(user, templateId);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListAgentTemplatesQueryDto) {
    return this.service.list(user, query);
  }

  @Get(":id")
  async getById(@CurrentUser() user: AuthUser, @Param("id") templateId: string) {
    return this.service.getById(user, templateId);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Body() body: UpdateAgentTemplateDto
  ) {
    return this.service.update(user, templateId, body);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") templateId: string) {
    return this.service.remove(user, templateId);
  }

  @Get(":id/versions")
  async listVersions(@CurrentUser() user: AuthUser, @Param("id") templateId: string) {
    return this.service.listVersions(user, templateId);
  }

  @Post(":id/versions/:version/rollback")
  async rollback(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Param("version", ParseIntPipe) version: number,
    @Body() body: RollbackAgentVersionDto
  ) {
    return this.service.rollback(user, templateId, version, body.reason);
  }
}
