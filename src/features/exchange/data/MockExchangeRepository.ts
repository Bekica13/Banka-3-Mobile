import { IExchangeRepository } from '../domain/IExchangeRepository';
import { Account, ExchangeRate } from '../../../shared/types/models';
import { applyMockExchangeTransfer } from '../../accounts/data/mockAccountStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const RATES: ExchangeRate[] = [
  { fromCurrency: 'EUR', toCurrency: 'RSD', buyRate: 116.50, sellRate: 118.20, middleRate: 117.35 },
  { fromCurrency: 'USD', toCurrency: 'RSD', buyRate: 106.80, sellRate: 108.90, middleRate: 107.85 },
  { fromCurrency: 'CHF', toCurrency: 'RSD', buyRate: 118.10, sellRate: 120.50, middleRate: 119.30 },
  { fromCurrency: 'GBP', toCurrency: 'RSD', buyRate: 136.20, sellRate: 138.80, middleRate: 137.50 },
  { fromCurrency: 'JPY', toCurrency: 'RSD', buyRate: 0.71, sellRate: 0.74, middleRate: 0.725 },
  { fromCurrency: 'CAD', toCurrency: 'RSD', buyRate: 77.40, sellRate: 79.60, middleRate: 78.50 },
  { fromCurrency: 'AUD', toCurrency: 'RSD', buyRate: 68.90, sellRate: 70.80, middleRate: 69.85 },
];

export class MockExchangeRepository implements IExchangeRepository {
  async getRates(): Promise<ExchangeRate[]> {
    await delay(500);
    return RATES;
  }

  async convert(
    fromAccountId: number,
    toAccountId: number,
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ) {
    await delay(800);

    const foreignCurrency = fromCurrency === 'RSD' ? toCurrency : fromCurrency;
    const rate = RATES.find(r => r.fromCurrency === foreignCurrency);

    if (!rate) throw new Error('Rate not found');

    const isBuying = fromCurrency === 'RSD'; // RSD -> foreign

    const usedRate = this.roundToTwo(isBuying ? rate.sellRate : rate.buyRate);

    const convertedAmount = this.roundToTwo(isBuying
      ? amount / usedRate   // RSD -> EUR
      : amount * usedRate); // EUR -> RSD

    applyMockExchangeTransfer({
      fromAccountId,
      toAccountId,
      fromAmount: amount,
      toAmount: convertedAmount,
      fromCurrency,
      toCurrency,
      rate: usedRate,
    });

    return {
      convertedAmount,
      rate: usedRate,
    };
  }

  async executeConversion(
    fromAccount: Account,
    toAccount: Account,
    amount: number,
    verificationCode?: string
  ) {
    return this.convert(
      fromAccount.id,
      toAccount.id,
      fromAccount.currency,
      toAccount.currency,
      amount
    );
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
