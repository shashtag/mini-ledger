
import { ReconciliationEngine } from './engine';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    bankTransaction: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    ledgerEntry: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    reconciliationRecord: {
      create: jest.fn(),
    },
    $transaction: jest.fn((args) => args),
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

// Helper for Decimal mocking since Prisma returns Decimal objects
const decimal = (val: number) => ({
  toNumber: () => val,
  toString: () => val.toString(),
});

describe('ReconciliationEngine', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 0 matches when no transactions exist', async () => {
    prisma.bankTransaction.findMany.mockResolvedValue([]);
    prisma.ledgerEntry.findMany.mockResolvedValue([]);

    const matchCount = await ReconciliationEngine.run();

    expect(matchCount).toBe(0);
  });

  it('should match EXACTLY on Amount, Date (same day), and Reference', async () => {
    const txn = {
      id: 'txn-1',
      amount: decimal(100),
      date: new Date('2023-01-01T10:00:00Z'),
      reference: 'INV-001',
      reconciled: false,
    };
    const entry = {
      id: 'entry-1',
      amount: decimal(100),
      date: new Date('2023-01-01T12:00:00Z'), // Same day
      reference: 'INV-001',
      reconciled: false,
    };

    prisma.bankTransaction.findMany.mockResolvedValue([txn]);
    prisma.ledgerEntry.findMany.mockResolvedValue([entry]);

    const matchCount = await ReconciliationEngine.run();

    expect(matchCount).toBe(1);
    expect(prisma.reconciliationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'MATCHED',
          confidenceScore: 100,
          notes: expect.stringContaining('Exact Amount, Date, and Ref match'),
        }),
      })
    );
  });

  it('should match via REFERENCE (Wire Fee scenario)', async () => {
    const txn = {
      id: 'txn-2',
      amount: decimal(95), // $5 less (fee)
      date: new Date('2023-01-01T10:00:00Z'),
      reference: 'INV-002',
      reconciled: false,
    };
    const entry = {
      id: 'entry-2',
      amount: decimal(100),
      date: new Date('2023-01-01T10:00:00Z'),
      description: 'Invoice 002', 
      reference: 'INV-002',
      reconciled: false,
    };

    prisma.bankTransaction.findMany.mockResolvedValue([txn]);
    prisma.ledgerEntry.findMany.mockResolvedValue([entry]);

    const matchCount = await ReconciliationEngine.run();

    expect(matchCount).toBe(1);
    expect(prisma.reconciliationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PARTIAL',
          confidenceScore: 95, // Paid on time, just variance
          notes: expect.stringContaining('Variance: $5.00 (Fee)'),
        }),
      })
    );
  });

  it('should match via REFERENCE (Late Payment scenario)', async () => {
    const txn = {
      id: 'txn-3',
      amount: decimal(100),
      date: new Date('2023-02-15T10:00:00Z'), // 45 days later
      reference: 'INV-003',
      reconciled: false,
    };
    // Helper to calculate late logic: default term is 30 days
    // Due date = 2023-01-01 + 30 days = 2023-01-31
    // Late by ~15 days
    const entry = {
      id: 'entry-3',
      amount: decimal(100),
      date: new Date('2023-01-01T10:00:00Z'),
      description: 'Invoice 003 Net-30', // Explicit terms
      reference: 'INV-003',
      reconciled: false,
    };

    prisma.bankTransaction.findMany.mockResolvedValue([txn]);
    prisma.ledgerEntry.findMany.mockResolvedValue([entry]);

    const matchCount = await ReconciliationEngine.run();

    expect(matchCount).toBe(1);
    expect(prisma.reconciliationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PARTIAL',
          confidenceScore: 80, // Late payment penalty
          notes: expect.stringContaining('LATE PAYMENT'),
        }),
      })
    );
  });

  it('should match PARTIALLY on Amount and Date (within 48h) when Reference is missing or mismatch', async () => {
    const txn = {
      id: 'txn-4',
      amount: decimal(500),
      date: new Date('2023-01-02T10:00:00Z'),
      reference: 'WIREFEE', // Mismatch ref
      reconciled: false,
    };
    const entry = {
      id: 'entry-4',
      amount: decimal(500),
      date: new Date('2023-01-01T10:00:00Z'), // Within 48 hours
      reference: 'INV-004',
      reconciled: false,
    };

    prisma.bankTransaction.findMany.mockResolvedValue([txn]);
    prisma.ledgerEntry.findMany.mockResolvedValue([entry]);

    const matchCount = await ReconciliationEngine.run();

    expect(matchCount).toBe(1);
    expect(prisma.reconciliationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PARTIAL',
          confidenceScore: 80,
          notes: 'Amount and Date match, check details',
        }),
      })
    );
  });

  it('should NOT match if no criteria are met', async () => {
    const txn = {
      id: 'txn-5',
      amount: decimal(999),
      date: new Date('2023-01-01T10:00:00Z'),
      reference: 'RANDOM',
      reconciled: false,
    };
    const entry = {
      id: 'entry-5',
      amount: decimal(100), // Different amount
      date: new Date('2023-05-01T10:00:00Z'), // Far date
      reference: 'OTHER',
      reconciled: false,
    };

    prisma.bankTransaction.findMany.mockResolvedValue([txn]);
    prisma.ledgerEntry.findMany.mockResolvedValue([entry]);

    const matchCount = await ReconciliationEngine.run();

    expect(matchCount).toBe(0);
    expect(prisma.reconciliationRecord.create).not.toHaveBeenCalled();
  });
});
