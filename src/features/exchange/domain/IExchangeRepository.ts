import { Account, ExchangeRate } from '../../../shared/types/models';
export interface IExchangeRepository {
  getRates(): Promise<ExchangeRate[]>;

  convert(
    fromAccountId: number,
    toAccountId: number,
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<{ convertedAmount: number; rate: number }>;

  executeConversion(
    fromAccount: Account,
    toAccount: Account,
    amount: number,
    verificationCode?: string
  ): Promise<{ convertedAmount: number; rate: number }>;
}
