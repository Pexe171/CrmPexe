import { CustomFieldEntity, CustomFieldType } from "@prisma/client";

export interface UpdateCustomFieldDefinitionDto {
  entity?: CustomFieldEntity;
  key?: string;
  label?: string;
  type?: CustomFieldType;
  required?: boolean;
  options?: string[] | null;
}
