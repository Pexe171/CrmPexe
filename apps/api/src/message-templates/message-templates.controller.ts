import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateMessageTemplateDto } from "./dto/create-message-template.dto";
import { MessageTemplatesService } from "./message-templates.service";

@Controller("message-templates")
@UseGuards(AccessTokenGuard)
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService
  ) {}

  @Get()
  async listTemplates(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.messageTemplatesService.listTemplates(user.id, workspaceId);
  }

  @Post()
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMessageTemplateDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.messageTemplatesService.createTemplate(
      user.id,
      body,
      workspaceId
    );
  }

  @Delete(":id")
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param("id") templateId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.messageTemplatesService.deleteTemplate(
      user.id,
      templateId,
      workspaceId
    );
  }
}
