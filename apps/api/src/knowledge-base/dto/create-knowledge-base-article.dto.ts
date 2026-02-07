import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";

export class CreateKnowledgeBaseArticleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
