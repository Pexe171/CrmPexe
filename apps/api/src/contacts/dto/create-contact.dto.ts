export interface CreateContactDto {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  customFields?: Record<string, unknown> | null;
}
