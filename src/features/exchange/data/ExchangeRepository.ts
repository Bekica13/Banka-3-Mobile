import { IExchangeRepository } from '../domain/IExchangeRepository';
import { Account, ExchangeRate } from '../../../shared/types/models';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { MockExchangeRepository } from './MockExchangeRepository';

interface ExchangeRateApiResponse {
  currencyCode?: string;
  currency_code?: string;
  currency?: string;
  fromCurrency?: string;
  from_currency?: string;
  toCurrency?: string;
  to_currency?: string;
  buyRate?: number | string;
  buy_rate?: number | string;
  sellRate?: number | string;
  sell_rate?: number | string;
  middleRate?: number | string;
  middle_rate?: number | string;
}

interface ConvertApiResponse {
  convertedAmount?: number | string;
  converted_amount?: number | string;
  amount?: number | string;
  rate?: number | string;
  exchangeRate?: number | string;
  exchange_rate?: number | string;
}

export class ExchangeRepository implements IExchangeRepository {
  private fallbackRepository = new MockExchangeRepository();

  constructor(private client: NetworkClient) {}

  async getRates(): Promise<ExchangeRate[]> {
    try {
      const responses = await this.tryGetRates();
      return responses.map(rate => this.mapRate(rate));
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }

      return this.fallbackRepository.getRates();
    }
  }

  async convert(
    fromAccountId: number,
    toAccountId: number,
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ) {
    const payload = {
      fromAccountId,
      toAccountId,
      fromCurrency,
      toCurrency,
      amount,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
    };

    const endpoints = [
      '/api/exchange/convert',
      '/api/exchange-rates/convert',
      '/api/convert',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.client.post<ConvertApiResponse>(endpoint, payload, {
          retryOnUnauthorized: false,
        });
        return this.mapConversion(response);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          throw new Error('Potrebna je nova prijava ili backend odbija preview konverzije.');
        }

        if (!this.shouldTryNextEndpoint(error)) {
          throw error;
        }
      }
    }

    try {
      return await this.convertFromRates(fromCurrency, toCurrency, amount);
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }

      return this.fallbackRepository.convert(fromAccountId, toAccountId, fromCurrency, toCurrency, amount);
    }
  }

  async executeConversion(
    fromAccount: Account,
    toAccount: Account,
    amount: number,
    verificationCode?: string
  ) {
    const preview = await this.convert(
      fromAccount.id,
      toAccount.id,
      fromAccount.currency,
      toAccount.currency,
      amount
    );

    const payload = {
      from_account: fromAccount.accountNumber || String(fromAccount.id),
      to_account: toAccount.accountNumber || String(toAccount.id),
      amount,
      description: `exchange ${amount} ${fromAccount.currency} to ${toAccount.currency}`,
      converted_amount: preview.convertedAmount,
      exchange_rate: preview.rate,
      from_currency: fromAccount.currency,
      to_currency: toAccount.currency,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
    };

    const endpoints = [
      '/api/transactions/transfer/',
      '/api/transactions/transfer',
    ];

    const trimmedCode = verificationCode?.trim();
    const requestHeaders = trimmedCode ? { TOTP: trimmedCode } : undefined;

    for (const endpoint of endpoints) {
      try {
        await this.client.post(endpoint, payload, {
          headers: requestHeaders,
          retryOnUnauthorized: false,
        });
        return preview;
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          const normalizedMessage = error.message.toLowerCase();

          if (normalizedMessage.includes("doesn't have totp setup") || normalizedMessage.includes('does not have totp setup')) {
            throw new Error('Korisnik nema aktiviran jednokratni kod za potvrdu transakcije.');
          }

          if (normalizedMessage.includes('invalid') || normalizedMessage.includes('wrong code')) {
            throw new Error('Jednokratni kod nije ispravan.');
          }

          throw new Error(trimmedCode
            ? 'Jednokratni kod nije prihvaćen za potvrdu transakcije.'
            : 'Unesite jednokratni kod za potvrdu transakcije.');
        }

        if (!this.shouldTryNextEndpoint(error)) {
          throw error;
        }
      }
    }

    throw new Error('Neuspešno izvršenje menjačke transakcije.');
  }

  private async tryGetRates(): Promise<ExchangeRateApiResponse[]> {
    return this.client.get<ExchangeRateApiResponse[]>('/api/exchange-rates');
  }

  private mapRate(rate: ExchangeRateApiResponse): ExchangeRate {
    const fromCurrency =
      rate.currencyCode ??
      rate.currency_code ??
      rate.currency ??
      rate.fromCurrency ??
      rate.from_currency;

    if (!fromCurrency) {
      throw new Error('Nepoznat format kursne liste.');
    }

    return {
      fromCurrency,
      toCurrency: rate.toCurrency ?? rate.to_currency ?? 'RSD',
      buyRate: this.roundToTwo(this.toNumber(rate.buyRate ?? rate.buy_rate)),
      sellRate: this.roundToTwo(this.toNumber(rate.sellRate ?? rate.sell_rate)),
      middleRate: this.roundToTwo(this.toNumber(rate.middleRate ?? rate.middle_rate)),
    };
  }

  private mapConversion(response: ConvertApiResponse) {
    const convertedAmount = this.toNumber(
      response.convertedAmount ?? response.converted_amount ?? response.amount
    );
    const rate = this.toNumber(
      response.rate ?? response.exchangeRate ?? response.exchange_rate
    );

    return {
      convertedAmount: this.roundToTwo(convertedAmount),
      rate: this.roundToTwo(rate),
    };
  }

  private async convertFromRates(fromCurrency: string, toCurrency: string, amount: number) {
    const rates = await this.getRates();
    const foreignCurrency = fromCurrency === 'RSD' ? toCurrency : fromCurrency;
    const rate = rates.find(r => r.fromCurrency === foreignCurrency && r.toCurrency === 'RSD');

    if (!rate) {
      throw new Error(`Kurs za ${foreignCurrency} nije pronađen.`);
    }

    const isBuying = fromCurrency === 'RSD';
    const usedRate = this.roundToTwo(isBuying ? rate.sellRate : rate.buyRate);

    return {
      convertedAmount: this.roundToTwo(isBuying ? amount / usedRate : amount * usedRate),
      rate: usedRate,
    };
  }

  private shouldTryNextEndpoint(error: unknown): boolean {
    return error instanceof ApiError && (error.statusCode === 0 || error.statusCode === 404);
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;

    if (parsed === undefined || !Number.isFinite(parsed)) {
      throw new Error('Neispravan broj u odgovoru servera.');
    }

    return parsed;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
