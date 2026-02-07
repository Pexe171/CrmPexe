import { TaskStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min
} from "class-validator";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  @IsOptional()
  @IsString()
  relatedType?: string | null;

  @IsOptional()
  @IsString()
  relatedId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
