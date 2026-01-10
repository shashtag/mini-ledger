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
    // 1. Perfect Match (High Value)
    await this.createEntry({
      amount: 12500.00,
      date: new Date('2023-11-01'),
      description: 'Inv #NV-2023-001 (Net-30) - Brilliant Cut Batch',
      reference: 'NV-1001',
      type: 'CREDIT'
    });

    // 2. Date Slip (International Wire delay)
    await this.createEntry({
      amount: 4250.00,
      date: new Date('2023-11-05'),
      description: 'Inv #NV-2023-002 (Net-30) - Antwerp Logistics',
      reference: 'NV-1002',
      type: 'CREDIT'
    });

    // 3. Partial Match (Wire Fee deduction)
    await this.createEntry({
      amount: 8000.00,
      date: new Date('2023-11-10'),
      description: 'Inv #NV-2023-003 (Net-30) - HK Supplier',
      reference: 'NV-1003',
      type: 'CREDIT'
    });

    // 4. At Risk (Unpaid / Outstanding)
    await this.createEntry({
      amount: 15000.00,
      date: new Date('2023-11-12'),
      description: 'Inv #NV-2023-004 (Net-60) - NY Retailer Large Order',
      reference: 'NV-1004',
      type: 'CREDIT'
    });

    // 5. Perfect Match (Small)
    await this.createEntry({
      amount: 2100.00,
      date: new Date('2023-11-15'),
      description: 'Inv #NV-2023-005 (Net-30) - Sample Stone',
      reference: 'NV-1005',
      type: 'CREDIT'
    });

    // 6. Late Payment Candidate
    await this.createEntry({
      amount: 5500.00,
      date: new Date('2023-10-15'), // Due Oct 30 (Net-15)
      description: 'Inv #NV-2023-006 (Net-15) - Old Inventory',
      reference: 'NV-1006',
      type: 'CREDIT'
    });

    logger.info('Mock Ledger Data Seeded', { 
      entries: 3,
      context: 'dev-seed'
    });
  }
}
