import { IntegrationAccountStatus, IntegrationAccountType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateIntegrationAccountDto {
  @IsEnum(IntegrationAccountType)
  type!: IntegrationAccountType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(IntegrationAccountStatus)
  status?: IntegrationAccountStatus;
}
