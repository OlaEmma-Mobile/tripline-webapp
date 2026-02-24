export type ProviderStatus = 'active' | 'inactive';

export interface ProviderRecord {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: ProviderStatus;
  created_at: string;
  updated_at: string;
}

export interface ProviderDTO {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: ProviderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderFilters {
  page: number;
  limit: number;
  status?: ProviderStatus;
  q?: string;
}

export interface CreateProviderInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: ProviderStatus;
}

export interface UpdateProviderInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: ProviderStatus;
}
