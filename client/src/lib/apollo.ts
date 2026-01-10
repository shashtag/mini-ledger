import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

export const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000/' }),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          unreconciledTransactions: {
            merge(_, incoming) {
              return incoming;
            },
          },
          reconciledTransactions: {
            merge(_, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});

export const GET_STATS = gql`
  query GetStats {
    stats {
      totalTransactions
      reconciledCount
      unreconciledCount
      ledgerEntryCount
    }
  }
`;

export const GET_TRANSACTIONS = gql`
  query GetTransactions {
    unreconciledTransactions {
      id
      date
      amount
      description
      reference
    }
    ledgerEntries {
      id
      date
      amount
      description
      reference
    }
    reconciledTransactions {
      id
      date
      amount
      description
      reference
      reconciliation {
        status
        confidenceScore
        notes
      }
    }
  }
`;

export const RUN_RECONCILIATION = gql`
  mutation RunReconciliation {
    runReconciliation
  }
`;

export const SEED_LEDGER = gql`
  mutation SeedLedger {
    seedLedger
  }
`;

export const INGEST_STATEMENT = gql`
  mutation IngestStatement($csv: String!) {
    ingestBankStatement(csvContent: $csv)
  }
`;

export const CLEAR_DATABASE = gql`
  mutation ClearDatabase {
    clearDatabase
  }
`;
