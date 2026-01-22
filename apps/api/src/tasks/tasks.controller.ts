import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { AuditEntity } from "../audit-logs/audit-log.decorator";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Controller("tasks")
@UseGuards(AccessTokenGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async listTasks(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("status") status?: TaskStatus,
    @Query("dueBefore") dueBefore?: string,
    @Query("dueAfter") dueAfter?: string,
    @Query("assignedToId") assignedToId?: string
  ) {
    return this.tasksService.listTasks(user.id, { status, dueBefore, dueAfter, assignedToId }, workspaceId);
  }

  @Post()
  @AuditEntity({
    entity: "Task",
    entityId: { source: "response", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      title: request.body?.title,
      status: request.body?.status
    })
  })
  async createTask(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTaskDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tasksService.createTask(user.id, body, workspaceId);
  }

  @Patch(":id")
  @AuditEntity({
    entity: "Task",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      title: request.body?.title,
      status: request.body?.status
    })
  })
  async updateTask(
    @CurrentUser() user: AuthUser,
    @Param("id") taskId: string,
    @Body() body: UpdateTaskDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tasksService.updateTask(user.id, taskId, body, workspaceId);
  }

  @Delete(":id")
  @AuditEntity({
    entity: "Task",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" }
  })
  async deleteTask(
    @CurrentUser() user: AuthUser,
    @Param("id") taskId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.tasksService.deleteTask(user.id, taskId, workspaceId);
  }
}
