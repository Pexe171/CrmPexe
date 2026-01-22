export interface UpdateCompanyDto {
  name?: string;
  domain?: string | null;
  phone?: string | null;
  customFields?: Record<string, unknown> | null;
  version?: number;
}
