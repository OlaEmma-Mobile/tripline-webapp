export type VehicleStatus = 'active' | 'inactive' | 'maintenance';

export interface VehicleRecord {
  id: string;
  provider_id: string | null;
  registration_number: string;
  model: string | null;
  capacity: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleDTO {
  id: string;
  providerId: string | null;
  registrationNumber: string;
  model: string | null;
  capacity: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  page: number;
  limit: number;
  status?: VehicleStatus;
  providerId?: string;
  q?: string;
}

export interface CreateVehicleInput {
  providerId?: string | null;
  registrationNumber: string;
  model?: string;
  capacity: number;
  status?: VehicleStatus;
}

export interface UpdateVehicleInput {
  providerId?: string | null;
  registrationNumber?: string;
  model?: string;
  capacity?: number;
  status?: VehicleStatus;
}

export interface AssignProviderInput {
  providerId: string | null;
}
