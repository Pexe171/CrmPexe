import { IsOptional, IsUUID } from "class-validator";

export class AssignConversationDto {
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;
}
