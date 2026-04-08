import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { VerificationRequest } from '../../../shared/types/models';
import {
  CreatedVerificationRequest,
  IVerificationRepository,
  PendingVerificationDetails,
  VerificationRequestPayload,
} from '../domain/IVerificationRepository';
import { MockVerificationRepository } from './MockVerificationRepository';

interface VerificationRequestApiResponse {
  verification_id?: string;
  verificationId?: string;
  expires_in?: number | string;
  expiresIn?: number | string;
  max_attempts?: number | string;
  maxAttempts?: number | string;
  status?: string;
}

interface PendingVerificationApiResponse {
  id?: string | number;
  verification_id?: string;
  type?: string;
  status?: string;
  expires_at?: string;
  expiresAt?: string;
  attempts_left?: number | string;
  attemptsLeft?: number | string;
  payload?: VerificationRequestPayload;
}

interface GeneratedCodeApiResponse {
  code?: string;
  expires_in?: number | string;
  expiresIn?: number | string;
}

interface ConfirmVerificationApiResponse {
  status?: string;
  transaction_status?: string;
  transactionStatus?: string;
  result?: Record<string, unknown>;
}

export class VerificationRepository implements IVerificationRepository {
  private fallbackRepository = new MockVerificationRepository();

  constructor(private client: NetworkClient) {}

  async getHistory(): Promise<VerificationRequest[]> {
    return this.fallbackRepository.getHistory();
  }

  async getPending(): Promise<VerificationRequest | null> {
    return this.fallbackRepository.getPending();
  }

  async confirm(id: number): Promise<void> {
    return this.fallbackRepository.confirm(id);
  }

  async reject(id: number): Promise<void> {
    return this.fallbackRepository.reject(id);
  }

  async createVerificationRequest(
    type: string,
    payload: VerificationRequestPayload
  ): Promise<CreatedVerificationRequest> {
    const response = await this.client.post<VerificationRequestApiResponse>('/api/verification/request', {
      type,
      payload,
    }, {
      retryOnUnauthorized: false,
    });

    const verificationId = response.verification_id ?? response.verificationId;
    if (!verificationId) {
      throw new Error('Backend nije vratio verification_id.');
    }

    return {
      verificationId,
      expiresIn: this.toNumber(response.expires_in ?? response.expiresIn, 300),
      maxAttempts: this.toNumber(response.max_attempts ?? response.maxAttempts, 3),
      status: response.status ?? 'pending',
    };
  }

  async getPendingVerification(): Promise<PendingVerificationDetails | null> {
    try {
      const response = await this.client.get<PendingVerificationApiResponse>('/api/verification/pending', {
        retryOnUnauthorized: false,
      });

      const id = this.toStringId(response.id ?? response.verification_id);
      if (!id) {
        return null;
      }

      return {
        id,
        type: response.type ?? 'exchange',
        status: response.status ?? 'pending',
        expiresAt: response.expires_at ?? response.expiresAt,
        attemptsLeft: this.toNumber(response.attempts_left ?? response.attemptsLeft, 3),
        payload: response.payload,
      };
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  async generateVerificationCode(verificationId: string): Promise<{ code: string; expiresIn: number }> {
    const response = await this.client.post<GeneratedCodeApiResponse>('/api/verification/code/generate', {
      verification_id: verificationId,
    }, {
      retryOnUnauthorized: false,
    });

    if (!response.code) {
      throw new Error('Backend nije vratio verifikacioni kod.');
    }

    return {
      code: response.code,
      expiresIn: this.toNumber(response.expires_in ?? response.expiresIn, 300),
    };
  }

  async confirmVerification(
    verificationId: string,
    code: string
  ): Promise<{ status: string; transactionStatus?: string; result?: Record<string, unknown> }> {
    const response = await this.client.post<ConfirmVerificationApiResponse>('/api/verification/confirm', {
      verification_id: verificationId,
      code: code.trim(),
    }, {
      retryOnUnauthorized: false,
    });

    return {
      status: response.status ?? 'confirmed',
      transactionStatus: response.transaction_status ?? response.transactionStatus,
      result: response.result,
    };
  }

  private toNumber(value: number | string | undefined, fallback: number): number {
    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? (parsed as number) : fallback;
  }

  private toStringId(value: number | string | undefined): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value);
  }
}
