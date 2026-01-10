const fetch = require('node-fetch');

// Wait for server to start
const API_URL = 'http://localhost:4000/';

const GRAPHQL_QUERY = async (query, variables = {}) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return response.json();
};

async function test() {
  console.log('--- Starting E2E Trace ---');

  // 1. Seed Ledger
  console.log('1. Seeding Ledger...');
  const seedRes = await GRAPHQL_QUERY(`mutation { seedLedger }`);
  if (!seedRes.data.seedLedger) throw new Error('Seeding failed');
  console.log('   ✅ Ledger Seeded');

  // 2. Ingest Bank Statement
  console.log('2. Ingesting Statement...');
  const csv = `Date,Amount,Description,Reference
2023-10-01,100.00,Order #1001,REF-1001
2023-10-06,250.50,Order #1002 (Late),REF-1002
2023-10-20,50.00,Unknown Fee,REF-9999
`;
  const ingestRes = await GRAPHQL_QUERY(`
    mutation($csv: String!) { ingestBankStatement(csvContent: $csv) }
  `, { csv });
  console.log(`   ✅ Ingested ${ingestRes.data.ingestBankStatement} transactions`);

  // 3. Run Reconciliation
  console.log('3. Running Reconciliation Engine...');
  const reconRes = await GRAPHQL_QUERY(`mutation { runReconciliation }`);
  console.log(`   ✅ Matched ${reconRes.data.runReconciliation} transactions`);

  // 4. Check Stats
  console.log('4. Checking Stats...');
  const statsRes = await GRAPHQL_QUERY(`
    query {
      stats {
        totalTransactions
        reconciledCount
        unreconciledCount
      }
    }
  `);
  console.log('   Stats:', statsRes.data.stats);

  if (statsRes.data.stats.reconciledCount !== 2) {
    throw new Error('Expected 2 matched transactions (1 Exact, 1 Partial)');
  }
  
  if (statsRes.data.stats.unreconciledCount !== 1) {
    throw new Error('Expected 1 unreconciled transaction');
  }

  console.log('--- E2E TEST PASSED ---');
}

// Simple retry loop to wait for server
const waitdAndRun = async () => {
    for(let i=0; i<10; i++) {
        try {
            await test();
            return;
        } catch(e) {
            console.log('Waiting for server...', e.message);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
};

waitdAndRun();
