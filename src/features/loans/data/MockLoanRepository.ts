import { ILoanRepository } from '../domain/ILoanRepository';
import { Loan, LoanApplication } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const LOANS: Loan[] = [
  { id: 1, name: 'Gotovinski kredit', number: '265-KR-0000001234', amount: 500000, currency: 'RSD', period: 60, nominalRate: 8.5, effectiveRate: 9.2, startDate: '15.01.2024', endDate: '15.01.2029', installment: 10245.50, nextPayment: '15.04.2025', remaining: 384200, paid: 115800, accountId: 1, status: 'active' },
  { id: 2, name: 'Stambeni kredit', number: '265-KR-0000005678', amount: 8500000, currency: 'RSD', period: 240, nominalRate: 4.2, effectiveRate: 4.8, startDate: '01.06.2023', endDate: '01.06.2043', installment: 52340.00, nextPayment: '01.04.2025', remaining: 7842500, paid: 657500, accountId: 1, status: 'active' },
  { id: 3, name: 'Auto kredit', number: '265-KR-0000009012', amount: 1200000, currency: 'RSD', period: 36, nominalRate: 6.9, effectiveRate: 7.5, startDate: '10.03.2023', endDate: '10.03.2026', installment: 36890.00, nextPayment: '10.04.2025', remaining: 110670, paid: 1089330, accountId: 1, status: 'active' },
];

export class MockLoanRepository implements ILoanRepository {
  async getLoans(): Promise<Loan[]> { await delay(500); return LOANS; }
  async getLoanById(id: number): Promise<Loan> {
    await delay(300);
    const loan = LOANS.find(l => l.id === id);
    if (!loan) throw new Error('Kredit nije pronađen');
    return loan;
  }
  async applyForLoan(application: LoanApplication): Promise<{ applicationId: number }> {
    await delay(1200);
    return { applicationId: Math.floor(Math.random() * 10000) };
  }
}
