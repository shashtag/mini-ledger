import { PrismaClient } from '@prisma/client';
import { IngestionService } from '../ingestion/ingest';
import { ReconciliationEngine } from '../reconciliation/engine';
import { LedgerService } from '../ledger/ledger';

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    hello: () => 'Hello Mini-Ledger!',
    
    unreconciledTransactions: async () => {
      return prisma.bankTransaction.findMany({
        where: { reconciled: false },
        orderBy: { date: 'desc' }
      });
    },

    reconciledTransactions: async () => {
      return prisma.bankTransaction.findMany({
        where: { reconciled: true },
        include: { reconciliation: true },
        orderBy: { date: 'desc' }
      });
    },

    ledgerEntries: async () => {
      return prisma.ledgerEntry.findMany({
        where: { reconciled: false },
        orderBy: { date: 'desc' },
        take: 50
      });
    },

    stats: async () => {
      const total = await prisma.bankTransaction.count();
      const reconciled = await prisma.bankTransaction.count({ where: { reconciled: true } });
      const ledgerCount = await prisma.ledgerEntry.count();
      
      // Calculate Risk Exposure (Sum of unreconciled credit)
      const exposure = await prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { reconciled: false }
      });

      return {
        totalTransactions: total,
        reconciledCount: reconciled,
        unreconciledCount: total - reconciled,
        ledgerEntryCount: ledgerCount,
        outstandingCredit: exposure._sum.amount ? Number(exposure._sum.amount) : 0
      };
    }
  },

  Mutation: {
    ingestBankStatement: async (_: any, { csvContent }: { csvContent: string }) => {
      return IngestionService.ingestBankStatement(csvContent);
    },

    runReconciliation: async () => {
      return ReconciliationEngine.run();
    },

    seedLedger: async () => {
      await LedgerService.seedMockData();
      return true;
    },

    clearDatabase: async () => {
      // Delete in order to respect Foreign Keys
      await prisma.reconciliationRecord.deleteMany({});
      await prisma.bankTransaction.deleteMany({});
      await prisma.ledgerEntry.deleteMany({});
      return true;
    }
  }
};
