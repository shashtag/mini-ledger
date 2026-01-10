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
      const exactMatch = ledgerEntries.find((entry: LedgerEntry) => 
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

      // 3. Check for Reference Match (Wire Fee & Late Payment Scenario)
      const refMatch = ledgerEntries.find((entry: LedgerEntry) => 
        entry.reference === txn.reference && 
        entry.reconciled === false &&
        Math.abs(entry.amount.toNumber() - txn.amount.toNumber()) <= 50
      );

      if (refMatch) {
        // Calculate Days Late
        // 1. Extract Terms (Net-30, Net-60)
        const termsMatch = refMatch.description.match(/Net-(\d+)/);
        const termsDays = termsMatch ? parseInt(termsMatch[1]) : 30; // Default to Net-30 if not found
        
        // 2. Calculate Due Date
        const dueDate = new Date(refMatch.date);
        dueDate.setDate(dueDate.getDate() + termsDays);

        // 3. Compare with Txn Date
        const diffTime = txn.date.getTime() - dueDate.getTime();
        const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let notes = `Ref Match.`;
        if (Math.abs(refMatch.amount.toNumber() - txn.amount.toNumber()) > 0.01) {
           notes += ` Variance: $${(refMatch.amount.toNumber() - txn.amount.toNumber()).toFixed(2)} (Fee).`;
        }
        if (daysLate > 0) {
           notes += ` ⚠️ LATE PAYMENT: ${daysLate} days overdue (Terms: Net-${termsDays}).`;
        } else {
           notes += ` Paid on time.`;
        }

         await this.createMatch(
           txn,
           refMatch,
           'PARTIAL', // Always partial if variance or late, for safety
           daysLate > 0 ? 80 : 95, 
           notes
         );
        matchCount++;
        continue;
      }
      
      // 4. PARTIAL MATCH: Correct Amount + Date, but Reference fuzzy or missing
      const partialMatch = ledgerEntries.find((entry: LedgerEntry) => 
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
