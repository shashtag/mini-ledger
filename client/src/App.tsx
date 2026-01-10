import { useQuery, useMutation } from '@apollo/client/react';
import { client, GET_STATS, GET_TRANSACTIONS, RUN_RECONCILIATION, SEED_LEDGER, INGEST_STATEMENT, CLEAR_DATABASE } from './lib/apollo';
import { Activity, CheckCircle, AlertCircle, Play, Database, Upload, RefreshCw, Trash2, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


interface Stats {
  totalTransactions: number;
  reconciledCount: number;
  unreconciledCount: number;
  ledgerEntryCount: number;
  outstandingCredit: number;
}

interface Reconciliation {
  status: string;
  confidenceScore: number;
  notes?: string;
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  reference?: string;
  reconciliation?: Reconciliation;
}

interface LedgerEntry {
  id: string;
  amount: number;
  date: string;
  description: string;
  reference?: string;
}

interface StatsQueryResponse {
  stats: Stats;
}

interface TransactionsQueryResponse {
  unreconciledTransactions: Transaction[];
  reconciledTransactions: Transaction[];
  ledgerEntries: LedgerEntry[];
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function StatsCard({ title, value, icon: Icon, color, description }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
      <div className="flex items-center space-x-4">
        <div className={cn("p-3 rounded-lg", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      {description && (
        <p className="mt-3 text-xs font-semibold text-red-600 flex items-center bg-red-50 px-2 py-1 rounded w-fit">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {description}
        </p>
      )}
    </div>
  );
}

function App() {
  const { data: statsData, refetch: refetchStats } = useQuery<StatsQueryResponse>(GET_STATS, { client, pollInterval: 2000 });
  const { data: txData, refetch: refetchTx } = useQuery<TransactionsQueryResponse>(GET_TRANSACTIONS, { client, pollInterval: 2000 });
  
  const [runRecon, { loading: loadingRecon }] = useMutation(RUN_RECONCILIATION, { client });
  const [seedLedger, { loading: loadingSeed }] = useMutation(SEED_LEDGER, { client });
  const [ingest, { loading: loadingIngest }] = useMutation(INGEST_STATEMENT, { client });
  const [clearDb, { loading: loadingClear }] = useMutation(CLEAR_DATABASE, { client });

  const handleRunRecon = async () => {
    await runRecon();
    refetchStats();
    refetchTx();
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to delete ALL data?')) {
      await clearDb();
      refetchStats();
      refetchTx();
    }
  };

  const handleSeed = async () => {
    await seedLedger();
    refetchStats();
    refetchTx();
    alert('Ledger Seeded!');
  };

  const handleIngest = async () => {
    const csv = [
      'Date,Amount,Description,Reference',
      '2023-11-02,12500.00,WIRE: DIAMOND CO RETAIL,NV-1001',
      '2023-11-07,4250.00,ACH: ANTWERP LOGISTICS,NV-1002',
      '2023-11-10,7985.00,INTL WIRE - FEE DEDUCTED,NV-1003',
      '2023-11-15,2100.00,CHECK DEPOSIT,NV-1005',
      '2023-11-20,5500.00,LATE WIRE TRANSFER,NV-1006',
      '2023-11-20,-50.00,MONTHLY SERVICE FEE,NON-REF',
      '2023-11-21,600.00,UNKNOWN INCOMING ZELLE,NON-REF'
    ].join('\n');
    try {
      console.log('Sending CSV:', csv);
      const res = await ingest({ variables: { csv } });
      console.log('Ingest Response:', res);
      refetchStats();
      refetchTx();
      alert('Ingestion Complete!');
    } catch (e) {
      console.error('Ingest Error:', e);
      alert('Ingestion Failed. Check Console.');
    }
  };

  const stats = statsData?.stats || { totalTransactions: 0, reconciledCount: 0, unreconciledCount: 0, ledgerEntryCount: 0, outstandingCredit: 0 };
  const unreconciled = txData?.unreconciledTransactions || [];
  const reconciled = txData?.reconciledTransactions || [];
  const ledgerEntries = txData?.ledgerEntries || [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Reconciliation Engine
            </h1>
          </div>
          <div className="flex space-x-3">
             <button
              onClick={handleSeed}
              disabled={loadingSeed}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Database className="w-4 h-4 mr-2" />
              Seed Ledger
            </button>
            <button
              onClick={handleIngest}
              disabled={loadingIngest}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Ingest Mock CSV
            </button>
            <button
              onClick={handleRunRecon}
              disabled={loadingRecon}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loadingRecon ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Play className="w-4 h-4 mr-2" />}
              Run Engine
            </button>
            <button
              onClick={handleClear}
              disabled={loadingClear}
              className="inline-flex items-center px-4 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ml-2"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear DB
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Strategic Context Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 flex items-start space-x-4">
          <Info className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-indigo-900">Nivoda Capital: Liquidity Engine Prototype</h2>
            <p className="text-indigo-700 mt-1 text-sm leading-relaxed">
              This system demonstrates the financial infrastructure required to support a <strong>$60M Credit Facility</strong>. 
              Instead of simple transaction matching, this engine calculates <strong>Real-Time Credit Exposure</strong> by reconciling 
              issued Net-30/60 invoices (Internal Ledger) against incoming bank settlements. It provides the immutable audit trail 
              needed for risk management and regulatory compliance.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Total Transactions" 
            value={stats.totalTransactions} 
            icon={Database} 
            color="bg-blue-500" 
          />
          <StatsCard 
            title="Reconciled" 
            value={stats.reconciledCount} 
            icon={CheckCircle} 
            color="bg-green-500" 
          />
          <StatsCard 
            title="Unreconciled" 
            value={stats.unreconciledCount} 
            icon={AlertCircle} 
            color="bg-amber-500" 
          />
           <StatsCard 
          title="Total Credit Exposure" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.outstandingCredit)}
          icon={AlertTriangle}
          color="bg-red-500"
          description="Active Capital at Risk"
        />
        <StatsCard 
          title="Active Credit Facilities" 
          value={stats.ledgerEntryCount} 
          icon={Database} 
          color="bg-purple-500" 
        />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Internal Ledger List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Active Credit Facilities (Pending)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Expected
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {ledgerEntries.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">No ledger entries seeded</div>
              )}
              {ledgerEntries.map((entry: LedgerEntry) => (
                <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-900">{entry.description}</p>
                    <p className="font-mono font-bold text-gray-900">${entry.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <p>{new Date(entry.date).toLocaleDateString()}</p>
                    <p className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{entry.reference || 'NO REF'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unreconciled List */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Pending Repayments (Bank)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Action Required
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {unreconciled.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">No pending transactions</div>
              )}
              {unreconciled.map((tx: Transaction) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-900">{tx.description}</p>
                    <p className={cn(
                      "font-mono font-bold", 
                      tx.amount < 0 ? "text-red-600" : "text-gray-900"
                    )}>
                      {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <p>{new Date(tx.date).toLocaleDateString()}</p>
                    <p className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{tx.reference || 'NO REF'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reconciled List */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Settled Facilities (Matched)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Done
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {reconciled.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">No reconciled transactions yet</div>
              )}
              {reconciled.map((tx: Transaction) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <p className="font-medium text-gray-900">{tx.description}</p>
                    </div>
                    <p className={cn(
                      "font-mono font-bold", 
                      tx.amount < 0 ? "text-red-600" : "text-gray-900"
                    )}>
                      {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 ml-6">
                    <p>{new Date(tx.date).toLocaleDateString()}</p>
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold",
                        tx.reconciliation?.status === 'MATCHED' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      )}>
                        {tx.reconciliation?.status || 'UNKNOWN'} ({tx.reconciliation?.confidenceScore || 0}%)
                      </span>
                    </div>
                  </div>
                  {tx.reconciliation?.notes && (
                     <p className="text-xs text-gray-400 mt-1 ml-6">{tx.reconciliation.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
