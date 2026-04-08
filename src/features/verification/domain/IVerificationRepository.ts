import { VerificationRequest } from '../../../shared/types/models';

export interface VerificationRequestPayload {
  from_account?: string;
  to_account?: string;
  amount?: number;
  description?: string;
  from_currency?: string;
  to_currency?: string;
  converted_amount?: number;
  exchange_rate?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface CreatedVerificationRequest {
  verificationId: string;
  expiresIn: number;
  maxAttempts: number;
  status: string;
}

export interface PendingVerificationDetails {
  id: string;
  type: string;
  status: string;
  expiresAt?: string;
  attemptsLeft?: number;
  payload?: VerificationRequestPayload;
}

export interface IVerificationRepository {
  getHistory(): Promise<VerificationRequest[]>;
  getPending(): Promise<VerificationRequest | null>;
  confirm(id: number): Promise<void>;
  reject(id: number): Promise<void>;
  createVerificationRequest(
    type: string,
    payload: VerificationRequestPayload
  ): Promise<CreatedVerificationRequest>;
  getPendingVerification(): Promise<PendingVerificationDetails | null>;
  generateVerificationCode(verificationId: string): Promise<{ code: string; expiresIn: number }>;
  confirmVerification(
    verificationId: string,
    code: string
  ): Promise<{ status: string; transactionStatus?: string; result?: Record<string, unknown> }>;
}
