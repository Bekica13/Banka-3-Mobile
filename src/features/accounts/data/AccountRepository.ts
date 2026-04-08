import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, Transaction } from '../../../shared/types/models';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';

interface ApiAccount {
  account_number: string;
  account_name?: string;
  name?: string;
  owner_id?: number;
  currency?: string;
  balance?: number;
  available_balance?: number;
  status?: string;
  account_type?: string;
  creation_date?: string;
  expiration_date?: string;
}

interface ApiTransaction {
  from_account?: string;
  to_account?: string;
  initial_amount?: number;
  final_amount?: number;
  amount?: number;
  currency?: string;
  purpose?: string;
  payment_code?: string;
  reference_number?: string;
  status?: string;
  timestamp?: string;
  date?: string;
  description?: string;
}

// accountNumber string → stable numeric hash za id
function accountNumberToId(accountNumber: string): number {
  let hash = 0;
  for (let i = 0; i < accountNumber.length; i++) {
    hash = (hash * 31 + accountNumber.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function mapAccountType(type: string | undefined): Account['type'] {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('foreign') || t.includes('devizni')) return 'devizni';
  if (t.includes('savings') || t.includes('stedni')) return 'stedni';
  if (t.includes('business') || t.includes('poslovni')) return 'poslovni';
  return 'tekuci';
}

function mapAccount(a: ApiAccount): Account {
  return {
    id: accountNumberToId(a.account_number),
    accountNumber: a.account_number,
    ownerId: a.owner_id ?? 0,
    name: a.account_name ?? a.name ?? 'Račun',
    type: mapAccountType(a.account_type),
    currency: a.currency ?? 'RSD',
    balance: a.balance ?? 0,
    availableBalance: a.available_balance ?? a.balance ?? 0,
    reservedAmount: 0,
    status: a.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    createdAt: a.creation_date ?? '',
    expiresAt: a.expiration_date ?? '',
  };
}

function mapTransaction(t: ApiTransaction, accountId: number, index: number): Transaction {
  const amount = t.final_amount ?? t.initial_amount ?? t.amount ?? 0;
  const rawStatus = t.status?.toLowerCase() ?? '';
  let status: Transaction['status'] = 'completed';
  if (rawStatus.includes('pending') || rawStatus.includes('obrada')) status = 'pending';
  else if (rawStatus.includes('reject') || rawStatus.includes('odbij')) status = 'rejected';

  return {
    id: index,
    accountId,
    description: t.purpose ?? t.description ?? 'Transakcija',
    amount,
    currency: t.currency ?? 'RSD',
    date: t.timestamp ? new Date(t.timestamp).toLocaleDateString('sr-RS') : (t.date ?? ''),
    status,
    recipientName: undefined,
    recipientAccount: t.to_account,
    paymentCode: t.payment_code,
    purpose: t.purpose,
  };
}

export class AccountRepository implements IAccountRepository {
  constructor(private client: NetworkClient) {}

  async getAccounts(): Promise<Account[]> {
    const data = await this.client.get<ApiAccount[]>('/api/accounts');
    return data.map(mapAccount);
  }

  async getAccountById(id: number): Promise<Account> {
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.id === id);
    if (!account) throw new Error('Račun nije pronađen');
    return account;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    if (!accountId) return [];
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return [];

    try {
      const data = await this.client.get<ApiTransaction[]>(
        `/api/transactions?account_number=${account.accountNumber}`
      );
      return data.map((t, i) => mapTransaction(t, accountId, i));
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) return [];
      throw e;
    }
  }
}