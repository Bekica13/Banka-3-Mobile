import { PaymentRecipient, PaymentOrder, Transaction } from '../../../shared/types/models';
export interface IPaymentRepository {
  getRecipients(): Promise<PaymentRecipient[]>;
  addRecipient(name: string, accountNumber: string): Promise<PaymentRecipient>;
  updateRecipient(id: number, name: string, accountNumber: string): Promise<PaymentRecipient>;
  deleteRecipient(id: number): Promise<void>;
  createPayment(order: PaymentOrder): Promise<{ verificationId: number }>;
  getPaymentHistory(): Promise<Transaction[]>;
}
