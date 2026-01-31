import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateQueueDto } from "./dto/create-queue.dto";
import { UpdateQueueDto } from "./dto/update-queue.dto";
import { QueuesService } from "./queues.service";

@Controller("queues")
@UseGuards(AccessTokenGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get()
  async listQueues(@CurrentUser() user: AuthUser, @Headers("x-workspace-id") workspaceId?: string) {
    return this.queuesService.listQueues(user.id, workspaceId);
  }

  @Post()
  async createQueue(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateQueueDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.queuesService.createQueue(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateQueue(
    @CurrentUser() user: AuthUser,
    @Param("id") queueId: string,
    @Body() body: UpdateQueueDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.queuesService.updateQueue(user.id, queueId, body, workspaceId);
  }

  @Delete(":id")
  async deleteQueue(
    @CurrentUser() user: AuthUser,
    @Param("id") queueId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.queuesService.deleteQueue(user.id, queueId, workspaceId);
  }
}
