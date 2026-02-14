import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
