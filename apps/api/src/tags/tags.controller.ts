import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";
import { TagsService } from "./tags.service";

@Controller("tags")
@UseGuards(AccessTokenGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async listTags(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tagsService.listTags(user.id, workspaceId);
  }

  @Post()
  async createTag(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTagDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tagsService.createTag(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateTag(
    @CurrentUser() user: AuthUser,
    @Param("id") tagId: string,
    @Body() body: UpdateTagDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tagsService.updateTag(user.id, tagId, body, workspaceId);
  }

  @Delete(":id")
  async deleteTag(
    @CurrentUser() user: AuthUser,
    @Param("id") tagId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tagsService.deleteTag(user.id, tagId, workspaceId);
  }
}
