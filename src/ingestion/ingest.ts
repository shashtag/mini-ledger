import { PrismaClient } from '@prisma/client';
import { BankStatementParser } from './parser';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class IngestionService {
  /**
   * Ingests a CSV string into the database using Batch Processing.
   * Optimized for Performance: Replaces N+1 queries with 1 Read + 1 Write.
   * This is scalable for thousands of records.
   */
  static async ingestBankStatement(csvContent: string): Promise<number> {
    const rawRecords = BankStatementParser.parseCSV(csvContent);
    if (rawRecords.length === 0) return 0;

    // 1. Prepare candidate data
    const candidates = rawRecords.map(r => ({
      amount: parseFloat(r.amount),
      date: new Date(r.date),
      description: r.description,
      reference: r.reference || null,
      currency: 'USD',
      reconciled: false
    }));

    // 2. Fetch potential duplicates in one query (Filter by Date Range)
    // Minimizes specific SELECTs by grabbing the relevant window of data
    const dates = candidates.map(c => c.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Fetch existing within the time window to check against
    const existingTransactions = await prisma.bankTransaction.findMany({
      where: {
        date: {
          gte: minDate,
          lte: maxDate
        }
      },
      select: {
        amount: true,
        date: true,
        reference: true,
        description: true
      }
    });

    // 3. Create a Set of existing signatures for O(1) lookups
    // Signature format matches the candidate data structure safely
    // Note: Prisma returns Decimal for amount, we convert to Number/String for comparison
    const createSignature = (amount: number, date: Date, ref: string | null, desc: string) => 
      `${amount.toFixed(2)}|${date.getTime()}|${ref || 'NULL'}|${desc}`;

    const existingSignatures = new Set(
      existingTransactions.map((t: any) => createSignature(Number(t.amount), t.date, t.reference, t.description))
    );

    // 4. In-Memory Deduplication
    const newRecords: typeof candidates = [];
    
    for (const c of candidates) {
      const sig = createSignature(c.amount, c.date, c.reference, c.description);
      
      // If NOT in DB and NOT already added in this batch
      if (!existingSignatures.has(sig)) {
        newRecords.push(c);
        existingSignatures.add(sig); // Prevent duplicates inside the same CSV file
      }
    }

    if (newRecords.length === 0) return 0;

    // 5. Batch Insert (Atomic-ish action)
    const result = await prisma.bankTransaction.createMany({
      data: newRecords
    });

    logger.info(`[Ingestion] Processed ${rawRecords.length} rows. Inserted ${result.count} new records.`, {
      totalRows: rawRecords.length,
      inserted: result.count
    });
    return result.count;
  }
}
