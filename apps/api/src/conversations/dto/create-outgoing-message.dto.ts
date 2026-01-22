import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateOutgoingMessageDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsString()
  providerMessageId?: string | null;

  @IsOptional()
  @IsDateString()
  sentAt?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown> | null;
}
