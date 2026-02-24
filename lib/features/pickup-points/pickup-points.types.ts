export interface PickupPointRecord {
  id: string;
  route_id: string;
  name: string;
  latitude: number;
  longitude: number;
  order_index: number;
  token_cost: number;
  created_at: string;
  updated_at: string;
}

export interface PickupPointDTO {
  id: string;
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  tokenCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface PickupPointCreateInput {
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  tokenCost: number;
}

export interface PickupPointUpdateInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  orderIndex?: number;
  tokenCost?: number;
}
