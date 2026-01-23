import { IsNotEmptyObject, IsObject } from "class-validator";

export class UpsertIntegrationSecretDto {
  @IsObject()
  @IsNotEmptyObject()
  payload!: Record<string, string>;
}
