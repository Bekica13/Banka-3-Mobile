import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, Transaction } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const ACCOUNTS: Account[] = [
  { id: 1, accountNumber: '265-0000000011234-56', ownerId: 1, name: 'Tekući račun', type: 'tekuci', currency: 'RSD', balance: 347250.0, availableBalance: 335750.0, reservedAmount: 11500.0, status: 'active', createdAt: '2023-06-15', expiresAt: '2028-06-15' },
  { id: 2, accountNumber: '265-0000000011234-78', ownerId: 1, name: 'Devizni račun', type: 'devizni', currency: 'EUR', balance: 2150.0, availableBalance: 2150.0, reservedAmount: 0, status: 'active', createdAt: '2023-06-15', expiresAt: '2028-06-15' },
  { id: 3, accountNumber: '265-0000000011234-90', ownerId: 1, name: 'Štedni račun', type: 'stedni', currency: 'RSD', balance: 1200000.0, availableBalance: 1200000.0, reservedAmount: 0, status: 'active', createdAt: '2024-01-10', expiresAt: '2029-01-10' },
];

const TRANSACTIONS: Transaction[] = [
  { id: 1, accountId: 1, description: 'Mesečna rata kredita', amount: -15420.0, currency: 'RSD', date: '05.03.2025', status: 'completed' },
  { id: 2, accountId: 1, description: 'Uplata plate - IT Solutions doo', amount: 185000.0, currency: 'RSD', date: '01.03.2025', status: 'completed' },
  { id: 3, accountId: 1, description: 'Maxi Market - kupovina', amount: -3240.5, currency: 'RSD', date: '28.02.2025', status: 'completed' },
  { id: 4, accountId: 1, description: 'EPS - račun za struju', amount: -4580.0, currency: 'RSD', date: '25.02.2025', status: 'completed' },
  { id: 5, accountId: 1, description: 'Povraćaj poreza', amount: 12500.0, currency: 'RSD', date: '20.02.2025', status: 'completed' },
  { id: 6, accountId: 1, description: 'Telenor - mesečni račun', amount: -2890.0, currency: 'RSD', date: '18.02.2025', status: 'completed' },
  { id: 7, accountId: 2, description: 'Freelance - Upwork', amount: 450.0, currency: 'EUR', date: '02.03.2025', status: 'completed' },
  { id: 8, accountId: 2, description: 'Amazon.de - porudžbina', amount: -89.99, currency: 'EUR', date: '27.02.2025', status: 'completed' },
  { id: 9, accountId: 3, description: 'Mesečna štednja - auto prenos', amount: 50000.0, currency: 'RSD', date: '01.03.2025', status: 'completed' },
];

export class MockAccountRepository implements IAccountRepository {
  async getAccounts(): Promise<Account[]> { await delay(500); return ACCOUNTS; }
  async getAccountById(id: number): Promise<Account> {
    await delay(300);
    const acc = ACCOUNTS.find(a => a.id === id);
    if (!acc) throw new Error('Račun nije pronađen');
    return acc;
  }
  async getTransactions(accountId: number): Promise<Transaction[]> {
    await delay(400);
    return TRANSACTIONS.filter(t => t.accountId === accountId);
  }
}
