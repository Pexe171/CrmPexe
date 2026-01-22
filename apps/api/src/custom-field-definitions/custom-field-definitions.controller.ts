import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CustomFieldDefinitionsService } from "./custom-field-definitions.service";
import { CreateCustomFieldDefinitionDto } from "./dto/create-custom-field-definition.dto";
import { UpdateCustomFieldDefinitionDto } from "./dto/update-custom-field-definition.dto";

@Controller("custom-field-definitions")
@UseGuards(AccessTokenGuard)
export class CustomFieldDefinitionsController {
  constructor(private readonly customFieldDefinitionsService: CustomFieldDefinitionsService) {}

  @Get()
  async listDefinitions(
    @CurrentUser() user: AuthUser,
    @Query("entity") entity?: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.customFieldDefinitionsService.listDefinitions(user.id, entity, workspaceId);
  }

  @Post()
  async createDefinition(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCustomFieldDefinitionDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.customFieldDefinitionsService.createDefinition(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateDefinition(
    @CurrentUser() user: AuthUser,
    @Param("id") definitionId: string,
    @Body() body: UpdateCustomFieldDefinitionDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.customFieldDefinitionsService.updateDefinition(user.id, definitionId, body, workspaceId);
  }

  @Delete(":id")
  async deleteDefinition(
    @CurrentUser() user: AuthUser,
    @Param("id") definitionId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.customFieldDefinitionsService.deleteDefinition(user.id, definitionId, workspaceId);
  }
}
