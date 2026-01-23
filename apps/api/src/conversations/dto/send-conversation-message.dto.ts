import { IsArray, IsOptional, IsString } from "class-validator";

export class SendConversationMessageDto {
  @IsOptional()
  @IsString()
  text?: string | null;

  @IsOptional()
  @IsString()
  templateId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateParameters?: string[];

  @IsOptional()
  meta?: Record<string, unknown>;
}
