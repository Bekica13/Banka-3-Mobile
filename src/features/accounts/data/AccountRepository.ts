import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, Transaction } from '../../../shared/types/models';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { MockAccountRepository } from './MockAccountRepository';

interface AccountApiResponse {
  id?: number | string;
  accountId?: number | string;
  account_id?: number | string;
  accountNumber?: string;
  account_number?: string;
  ownerId?: number | string;
  owner_id?: number | string;
  name?: string;
  type?: string;
  currency?: string;
  balance?: number | string;
  availableBalance?: number | string;
  available_balance?: number | string;
  reservedAmount?: number | string;
  reserved_amount?: number | string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  expiresAt?: string;
  expires_at?: string;
}

interface TransactionApiResponse {
  id?: number | string;
  accountId?: number | string;
  account_id?: number | string;
  description?: string;
  desc?: string;
  amount?: number | string;
  currency?: string;
  date?: string;
  status?: string;
  recipientName?: string;
  recipient_name?: string;
  recipientAccount?: string;
  recipient_account?: string;
  paymentCode?: string;
  payment_code?: string;
  purpose?: string;
}

export class AccountRepository implements IAccountRepository {
  private fallbackRepository = new MockAccountRepository();

  constructor(private client: NetworkClient) {}

  async getAccounts(): Promise<Account[]> {
    try {
      const data = await this.client.get<AccountApiResponse[]>('/api/accounts');
      const accounts = data.map(account => this.mapAccount(account));
      if (accounts.length > 0) {
        return accounts;
      }
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }
    }

    return this.fallbackRepository.getAccounts();
  }

  async getAccountById(id: number): Promise<Account> {
    const accounts = await this.getAccounts();
    const account = accounts.find(item => item.id === id);
    if (!account) throw new Error('Racun nije pronadjen');
    return account;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    if (!accountId) return [];

    try {
      const data = await this.client.get<TransactionApiResponse[]>(`/api/transactions?accountId=${accountId}`);
      if (data.length > 0) {
        return data.map(transaction => this.mapTransaction(transaction, accountId));
      }
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }
    }

    return this.fallbackRepository.getTransactions(accountId);
  }

  private mapAccount(account: AccountApiResponse): Account {
    return {
      id: this.toNumber(account.id ?? account.accountId ?? account.account_id),
      accountNumber: account.accountNumber ?? account.account_number ?? '',
      ownerId: this.toNumber(account.ownerId ?? account.owner_id ?? 0),
      name: account.name ?? 'Racun',
      type: this.mapAccountType(account.type),
      currency: account.currency ?? 'RSD',
      balance: this.toNumber(account.balance),
      availableBalance: this.toNumber(account.availableBalance ?? account.available_balance ?? account.balance ?? 0),
      reservedAmount: this.toNumber(account.reservedAmount ?? account.reserved_amount ?? 0),
      status: account.status === 'inactive' ? 'inactive' : 'active',
      createdAt: account.createdAt ?? account.created_at ?? '',
      expiresAt: account.expiresAt ?? account.expires_at ?? '',
    };
  }

  private mapTransaction(transaction: TransactionApiResponse, fallbackAccountId: number): Transaction {
    return {
      id: this.toNumber(transaction.id),
      accountId: this.toNumber(transaction.accountId ?? transaction.account_id ?? fallbackAccountId),
      description: transaction.description ?? transaction.desc ?? 'Transakcija',
      amount: this.toNumber(transaction.amount),
      currency: transaction.currency ?? 'RSD',
      date: transaction.date ?? '',
      status: transaction.status === 'pending' || transaction.status === 'rejected' ? transaction.status : 'completed',
      recipientName: transaction.recipientName ?? transaction.recipient_name,
      recipientAccount: transaction.recipientAccount ?? transaction.recipient_account,
      paymentCode: transaction.paymentCode ?? transaction.payment_code,
      purpose: transaction.purpose,
    };
  }

  private mapAccountType(type: string | undefined): Account['type'] {
    if (type === 'devizni' || type === 'stedni' || type === 'poslovni') {
      return type;
    }

    return 'tekuci';
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed as number : 0;
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }
}
