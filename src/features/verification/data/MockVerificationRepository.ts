import { IVerificationRepository } from '../domain/IVerificationRepository';
import { VerificationRequest } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const HISTORY: VerificationRequest[] = [
  { id: 1, action: 'Plaćanje - EPS Beograd', description: 'Račun za struju', amount: '4,580.00 RSD', timestamp: '05.03.2025 14:32', status: 'confirmed', code: '482917' },
  { id: 2, action: 'Prenos između računa', description: 'Prenos sa tekućeg na devizni', amount: '500.00 EUR', timestamp: '03.03.2025 09:15', status: 'confirmed', code: '739201' },
  { id: 3, action: 'Novo plaćanje - Telenor', description: 'Mesečni račun', amount: '2,890.00 RSD', timestamp: '01.03.2025 18:44', status: 'rejected', code: '156483' },
  { id: 4, action: 'Plaćanje - Informatika AD', description: 'Rata kredita', amount: '15,420.00 RSD', timestamp: '28.02.2025 10:20', status: 'confirmed', code: '927364' },
  { id: 5, action: 'Prenos na devizni račun', description: 'Konverzija', amount: '200.00 EUR', timestamp: '25.02.2025 11:05', status: 'expired', code: '648201' },
];

export class MockVerificationRepository implements IVerificationRepository {
  async getHistory(): Promise<VerificationRequest[]> { await delay(500); return HISTORY; }
  async getPending(): Promise<VerificationRequest | null> {
    await delay(300);
    return { id: 99, action: 'Novo plaćanje', description: 'Komunalne usluge', amount: '1,250.00 RSD', recipientName: 'Vodovod Beograd', recipientAccount: '908-0000000987654-32', sourceAccount: '265-0000000011234-56', timestamp: new Date().toISOString(), status: 'pending' };
  }
  async confirm(id: number): Promise<void> { await delay(800); }
  async reject(id: number): Promise<void> { await delay(800); }
}
