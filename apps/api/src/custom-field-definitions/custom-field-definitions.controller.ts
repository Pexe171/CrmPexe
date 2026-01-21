import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
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
  async listDefinitions(@CurrentUser() user: AuthUser, @Query("entity") entity?: string) {
    return this.customFieldDefinitionsService.listDefinitions(user.id, entity);
  }

  @Post()
  async createDefinition(@CurrentUser() user: AuthUser, @Body() body: CreateCustomFieldDefinitionDto) {
    return this.customFieldDefinitionsService.createDefinition(user.id, body);
  }

  @Patch(":id")
  async updateDefinition(
    @CurrentUser() user: AuthUser,
    @Param("id") definitionId: string,
    @Body() body: UpdateCustomFieldDefinitionDto
  ) {
    return this.customFieldDefinitionsService.updateDefinition(user.id, definitionId, body);
  }

  @Delete(":id")
  async deleteDefinition(@CurrentUser() user: AuthUser, @Param("id") definitionId: string) {
    return this.customFieldDefinitionsService.deleteDefinition(user.id, definitionId);
  }
}
