export interface CreateCompanyDto {
  name: string;
  domain?: string;
  phone?: string;
  customFields?: Record<string, unknown> | null;
}
