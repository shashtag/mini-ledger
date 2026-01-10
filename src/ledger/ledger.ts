import { PrismaClient, LedgerEntry } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class LedgerService {
  /**
   * Creates a new internal ledger entry (e.g. from an Order placed).
   */
  static async createEntry(data: {
    amount: number;
    date: Date;
    description: string;
    reference?: string;
    type: 'CREDIT' | 'DEBIT';
  }): Promise<LedgerEntry> {
    return prisma.ledgerEntry.create({
      data: {
        ...data,
        reconciled: false
      }
    });
  }

  /**
   * Seeds the database with mock ledger data for testing reconciliation.
   */
  static async seedMockData() {
    // 1. Exact match candidate
    await this.createEntry({
      amount: 100.00,
      date: new Date('2023-10-01'),
      description: 'Order #1001',
      reference: 'REF-1001',
      type: 'CREDIT'
    });

    // 2. Partial match candidate (Date off by 1 day)
    await this.createEntry({
      amount: 250.50,
      date: new Date('2023-10-05'), // Bank might show Oct 6th
      description: 'Order #1002',
      reference: 'REF-1002',
      type: 'CREDIT'
    });

    // 3. Unmatched candidate
    await this.createEntry({
      amount: 999.99,
      date: new Date('2023-10-10'),
      description: 'Order #1003 Missing Payment',
      type: 'CREDIT'
    });

    logger.info('Mock Ledger Data Seeded', { 
      entries: 3,
      context: 'dev-seed'
    });
  }
}
