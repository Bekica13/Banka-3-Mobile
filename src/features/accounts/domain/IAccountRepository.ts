import { Account, Transaction } from '../../../shared/types/models';
export interface IAccountRepository {
  getAccounts(): Promise<Account[]>;
  getAccountById(id: number): Promise<Account>;
  getTransactions(accountId: number): Promise<Transaction[]>;
}
