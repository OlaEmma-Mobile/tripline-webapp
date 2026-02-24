export type TokenPurchaseStatus = 'pending' | 'success' | 'failed';

export interface InitiatePurchasePayload {
  amountNgn: number;
  userId: string;
  email: string;
}

export interface TokenPurchaseRecord {
  id: string;
  user_id: string;
  reference: string;
  amount_ngn: number;
  tokens: number;
  status: TokenPurchaseStatus;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface PaystackInitResponse {
  reference: string;
  authorization_url: string;
}

export interface InitiatePaymentResult {
  purchaseId: string;
  reference: string;
  amountNgn: number;
  tokens: number;
  authorizationUrl: string;
}
