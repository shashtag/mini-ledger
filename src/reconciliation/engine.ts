import { PrismaClient, BankTransaction, LedgerEntry, ReconStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class ReconciliationEngine {
  /**
   * Main function to run the reconciliation process.
   * tailored to find matches between unreconciled Bank Transactions and Ledger Entries.
   */
  static async run() {
    logger.info('Starting Reconciliation...', { timestamp: new Date() });
    
    const bankTxns = await prisma.bankTransaction.findMany({
      where: { reconciled: false }
    });

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { reconciled: false }
    });

    let matchCount = 0;

    for (const txn of bankTxns) {
      // 1. EXACT MATCH: Amount, Date (same day or within 1 day), Reference
      const exactMatch = ledgerEntries.find(entry => 
        entry.amount.toNumber() === txn.amount.toNumber() &&
        // Simplified date check: exact ISO string or check separately
        Math.abs(entry.date.getTime() - txn.date.getTime()) < 86400000 && // < 24 hours
        entry.reference === txn.reference
      );

      if (exactMatch) {
        await this.createMatch(txn, exactMatch, 'MATCHED', 100, 'Exact Amount, Date, and Ref match');
        matchCount++;
        continue; // Move to next txn
      }

      // 2. PARTIAL MATCH: Correct Amount + Date, but Reference fuzzy or missing
      const partialMatch = ledgerEntries.find(entry => 
        entry.amount.toNumber() === txn.amount.toNumber() &&
        Math.abs(entry.date.getTime() - txn.date.getTime()) < 172800000 // < 48 hours
      );

      if (partialMatch) {
        await this.createMatch(txn, partialMatch, 'PARTIAL', 80, 'Amount and Date match, check details');
        matchCount++;
      }
    }

    logger.info(`Reconciliation Complete. Matched ${matchCount} transactions.`, {
      matchedCount: matchCount
    });
    return matchCount;
  }

  private static async createMatch(
    txn: BankTransaction, 
    entry: LedgerEntry, 
    status: ReconStatus, 
    confidence: number,
    notes: string
  ) {
    // Transactional update
    await prisma.$transaction([
      prisma.reconciliationRecord.create({
        data: {
          bankTransactionId: txn.id,
          ledgerEntryId: entry.id,
          status,
          confidenceScore: confidence,
          notes
        }
      }),
      prisma.bankTransaction.update({
        where: { id: txn.id },
        data: { reconciled: true }
      }),
      prisma.ledgerEntry.update({
        where: { id: entry.id },
        data: { reconciled: true }
      })
    ]);
  }
}
