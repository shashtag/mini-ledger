# Mini-Ledger Reconciliation Engine 🏦

A high-performance financial reconciliation engine built with Node.js, GraphQL, and Prisma. Designed to reconcile bank transactions against an internal ledger with varying degrees of confidence.

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

## 🏗️ Architecture & Decisions (Nivoda Senior Roadmap)

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

## 🔮 Future Improvements (Production Readiness)

If deploying to a high-volume production environment (tier-1 bank integration), I would implement:

1.  **Async Processing (Queues)**:
    *   Move Ingestion and Reconciliation to a background worker (e.g., **BullMQ** + Redis).
    *   API should return `202 Accepted` and a Job ID, rather than waiting for processing.

2.  **Stream Processing**:
    *   Use Node.js Streams for CSV parsing to handle files larger than memory (e.g., 500MB+ statements).

3.  **Idempotency Keys**:
    *   Implement strict Idempotency Keys on the API headers to prevent double-billing or double-ingestion during network retries.

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
