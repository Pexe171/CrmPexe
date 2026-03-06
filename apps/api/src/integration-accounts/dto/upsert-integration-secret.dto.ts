import { IsNotEmptyObject, IsObject, Validate } from "class-validator";
import { IsPayloadBoundedConstraint } from "../validators/payload-bounded.validator";

export class UpsertIntegrationSecretDto {
  @IsObject()
  @IsNotEmptyObject()
  @Validate(IsPayloadBoundedConstraint)
  payload!: Record<string, string>;
}
