import { parse } from 'csv-parse/sync';

export interface RawBankTransaction {
  date: string;
  amount: string;
  description: string;
  reference: string;
}

export class BankStatementParser {
  // Simpler parser: assumes CSV has headers: Date, Amount, Description, Reference
  // Date format: YYYY-MM-DD
  static parseCSV(csvContent: string): RawBankTransaction[] {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    return records.map((record: any) => ({
      date: record.Date,
      amount: record.Amount,
      description: record.Description,
      reference: record.Reference
    }));
  }
}
