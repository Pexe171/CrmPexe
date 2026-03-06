import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments
} from "class-validator";

const MAX_KEYS = 50;
const MAX_VALUE_LENGTH = 4096;

@ValidatorConstraint({ name: "IsPayloadBounded", async: false })
export class IsPayloadBoundedConstraint implements ValidatorConstraintInterface {
  validate(payload: unknown, _args: ValidationArguments): boolean {
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      return false;
    }
    const entries = Object.entries(payload);
    if (entries.length > MAX_KEYS) {
      return false;
    }
    for (const [, value] of entries) {
      if (typeof value !== "string") {
        return false;
      }
      if (value.length > MAX_VALUE_LENGTH) {
        return false;
      }
    }
    return true;
  }

  defaultMessage(_args: ValidationArguments): string {
    return `payload deve ter no máximo ${MAX_KEYS} chaves e cada valor no máximo ${MAX_VALUE_LENGTH} caracteres.`;
  }
}
