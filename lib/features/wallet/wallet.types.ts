export type TokenCreditStatus = 'active' | 'expired';

export interface TokenWalletRecord {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface TokenCreditRecord {
  id: string;
  user_id: string;
  purchase_id: string;
  tokens: number;
  expires_at: string;
  status: TokenCreditStatus;
  created_at: string;
}
