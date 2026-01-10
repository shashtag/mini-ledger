# Mini-Ledger Reconciliation Engine 💎

**A Financial Integrity Layer for Global Trade**

This project represents the core infrastructure required to support high-value fintech operations like **Nivoda Capital**. In a ecosystem where retailers rely on Net-30/60 terms, the ability to accurately reconcile **Credit Issued (Internal Ledger)** against **Cash Received (Bank Statements)** is the foundation of liquidity management and risk control.

This engine is designed to provide the **immutable proof of repayment** needed to sustain a $60M+ credit facility, ensuring that working capital gaps are monitored in real-time.

## 🚀 Key Features

-   **Reconciliation Engine**: Automated matching logic (Exact & Partial matches).
-   **GraphQL API**: Flexible data querying for dashboard and operations.
-   **Batch Ingestion**: Optimized CSV parsing handling thousands of rows via batch upserts.
-   **Dashboard**: Real-time visibility into reconciliation status (React/Vite/Tailwind).
-   **Observability**: Structured JSON logging via `winston`.
-   **CI/CD**: Automated testing pipeline via GitHub Actions.

## 🛠️ Tech Stack

-   **Backend**: Node.js (TypeScript), Apollo Server, Prisma ORM.
-   **Database**: PostgreSQL.
-   **Frontend**: React 19, Vite, Tailwind CSS v4, Apollo Client.
-   **Infrastructure**: Docker Compose, GitHub Actions.

---

## 🏗️ Architecture & Decisions (Nivoda Roadmap)

This project demonstrates a "Senior Engineer" approach to building scalable financial systems.

### 1. Performance (Batch Processing)
*   **Challenge**: Loop-based ingestion (finding and creating one-by-one) causes N+1 query performance issues.
*   **Solution**: Implemented a **Vectorized Ingestion Strategy** in `IngestionService`.
    1.  Parse all rows.
    2.  fetch existing records in the date window (1 Read).
    3.  Deduplicate in-memory using sets.
    4.  Bulk insert new records (`createMany`) (1 Write).
*   **Result**: Complexity reduced from **O(N)** to **O(1)** database operations per batch.

### 2. Observability
*   **Tool**: `winston`
*   **Strategy**: Replaced `console.log` with structured logs.
    *   **Dev**: Colorized, human-readable.
    *   **Prod**: JSON-formatted for ingestion by Splunk/Datadog/ELK.
    *   **Context**: Logs include metadata (`totalRows`, `insertedCount`, `matchCount`) for easier debugging.

### 3. Reliability & Testing
*   **CI/CD**: GitHub Actions pipeline runs on every push.
*   **Pipeline**: `Checkout` -> `Install` -> `Lint` -> `DB Migrate` -> `Test`.
*   **Tests**: Unit tests for the Reconciliation Logic ensure financial accuracy.

---

## 🔮 Future Architecture Roadmap (Nivoda Production Standard)

> **Purpose**: This section outlines the technical evolution from this prototype to a Production-Grade Financial System aligned with Nivoda's architecture standards.

### 1. Domain Modeling: The "Double-Entry" Refactor

**Current State (Prototype):**
- Single Table: `LedgerEntry` (Contains Amount + Direction + Metadata mixed).
- *Why we did this*: Speed of implementation for the MVP.

**Target State (Production):**
We must separate the **Business Intent** from the **Accounting Impact**.

#### Schema Design
**Table 1: Transactions (The "Event")**
- `id`: UUID
- `type`: `INVOICE_FUNDING`, `REPAYMENT_COLLECTION`
- `reference_id`: External ID (e.g., Stripe Payment Intent)
- `metadata`: JSON (User ID, Loan ID)

**Table 2: Entries (The "Ledger")**
*An immutable log of debits and credits.*
- `id`: UUID
- `transaction_id`: FK to Transactions
- `account_id`: UUID (e.g., "Retailer_A_Wallet", "Nivoda_Revenue")
- `direction`: `DEBIT` | `CREDIT`
- `amount`: `BIGINT` (Minor units, e.g., cents)
- `currency`: `USD`

> **Talking Point**: "Currently, I store the ledger view directly. To scale, I would refactor to a `Transaction Header` + `Ledger Lines` model. This allows one business event (e.g., a Repayment) to split across multiple accounts (Principal, Interest, Fees) atomically."

### 2. Asynchronous Architecture: Decoupling with Kafka

**Current State (Monolith):**
- `IngestionService` runs in the same process.
- Database is the shared state.

**Target State (Event-Driven Microservices):**
We need to decouple "Intake" from "Processing".

#### The Pipeline
1.  **Ingestion Service**: Parses CSV -> Publishes `bank-transactions-ingested`.
2.  **Ledger Service**: Consumes -> Runs Idempotency Check -> Publishes `transaction-recorded`.
3.  **Reconciliation Engine**: Consumes -> Matches -> Updates Status.

> **Talking Point**: "I built a monolith for simplicity. In production, I would put a Kafka topic between the CSV Parser and the Database to handle backpressure."

### 3. Data Integrity & Concurrency

**Current State:**
- `Decimal(10,2)` for money.
- Optimistic locking (Prisma defaults).

**Target State:**
1.  **BigInt Checks**: Store all money in cents (`amount / 100`). Eliminates IEEE 754 errors.
2.  **Pessimistic Locking**: `SELECT balance ... FOR UPDATE;` to prevent double-spending during concurrent repayments.

### 4. Scalability: The "TigerBeetle" Approach

> **Talking Point**: "For extreme scale (10k+ TPS), I wouldn't store a `balance` column at all. I would use an **Append-Only Log** architecture where the balance is calculated on-the-fly from immutable entries."

---

## 🏃‍♂️ How to Run

1.  **Start Services**:
    ```bash
    docker compose up -d
    ```

2.  **Start Backend**:
    ```bash
    npm install
    npm start
    ```

3.  **Start Frontend**:
    ```bash
    cd client
    npm install
    npm run dev
    ```

4.  **Visit**: `http://localhost:5173`
