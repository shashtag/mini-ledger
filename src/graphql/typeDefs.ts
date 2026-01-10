import gql from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  type BankTransaction {
    id: ID!
    amount: Float!
    date: DateTime!
    description: String!
    reference: String
    reconciled: Boolean!
    reconciliation: ReconciliationRecord
  }

  type ReconciliationRecord {
    id: ID!
    status: String!
    confidenceScore: Int!
    notes: String
    matchedAt: DateTime!
    ledgerEntryId: String!
  }

  type Query {
    hello: String
    unreconciledTransactions: [BankTransaction!]!
    reconciledTransactions: [BankTransaction!]!
    stats: Stats!
    ledgerEntries: [LedgerEntry!]!
  }

  type LedgerEntry {
    id: ID!
    amount: Float!
    date: DateTime!
    description: String!
    reference: String
  }

  type Stats {
    totalTransactions: Int!
    reconciledCount: Int!
    unreconciledCount: Int!
    ledgerEntryCount: Int!
  }

  type Mutation {
    ingestBankStatement(csvContent: String!): Int!
    runReconciliation: Int!
    seedLedger: Boolean!
    clearDatabase: Boolean!
  }
`;
