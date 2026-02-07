import {
  IntegrationAccountStatus,
  IntegrationAccountType
} from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateIntegrationAccountDto {
  @IsOptional()
  @IsEnum(IntegrationAccountType)
  type?: IntegrationAccountType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(IntegrationAccountStatus)
  status?: IntegrationAccountStatus;
}
