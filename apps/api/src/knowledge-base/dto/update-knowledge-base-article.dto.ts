import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateKnowledgeBaseArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
