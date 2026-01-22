import { TaskStatus } from "@prisma/client";

export interface UpdateTaskDto {
  title?: string;
  dueAt?: string | null;
  status?: TaskStatus;
  assignedToId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  version?: number;
}
