import { Card } from '../../../shared/types/models';
export interface ICardRepository {
  getCards(): Promise<Card[]>;
  blockCard(id: number): Promise<void>;
  unblockCard(id: number): Promise<void>;
}
