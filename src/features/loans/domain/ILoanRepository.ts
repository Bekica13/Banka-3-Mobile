import { Loan, LoanApplication } from '../../../shared/types/models';
export interface ILoanRepository {
  getLoans(): Promise<Loan[]>;
  getLoanById(id: number): Promise<Loan>;
  applyForLoan(application: LoanApplication): Promise<{ applicationId: number }>;
}
