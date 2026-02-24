export type RouteStatus = 'active' | 'inactive';

export interface RouteRecord {
  id: string;
  name: string;
  company_id: string | null;
  from_name: string;
  from_latitude: number;
  from_longitude: number;
  to_name: string;
  to_latitude: number;
  to_longitude: number;
  base_token_cost: number;
  status: RouteStatus;
  created_at: string;
  updated_at: string;
}

export interface RouteDTO {
  id: string;
  name: string;
  companyId: string | null;
  fromName: string;
  fromLatitude: number;
  fromLongitude: number;
  toName: string;
  toLatitude: number;
  toLongitude: number;
  baseTokenCost: number;
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
  pickupPointsCount?: number;
}

export interface RouteFilters {
  page: number;
  limit: number;
  status?: RouteStatus;
  companyId?: string;
}

export interface RouteCreateInput {
  name: string;
  companyId?: string | null;
  fromName: string;
  fromLatitude: number;
  fromLongitude: number;
  toName: string;
  toLatitude: number;
  toLongitude: number;
  baseTokenCost: number;
  status?: RouteStatus;
}

export interface RouteUpdateInput {
  name?: string;
  companyId?: string | null;
  fromName?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toName?: string;
  toLatitude?: number;
  toLongitude?: number;
  baseTokenCost?: number;
  status?: RouteStatus;
}
