
import { parse } from 'csv-parse/sync';

const csv = [
  'Date,Amount,Description,Reference',
  '2023-11-02,12500.00,WIRE: DIAMOND CO RETAIL,NV-1001',
  '2023-11-07,4250.00,ACH: ANTWERP LOGISTICS,NV-1002',
  '2023-11-20,-50.00,MONTHLY SERVICE FEE,NON-REF'
].join('\n');

console.log("--- Raw CSV ---");
console.log(csv);

try {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log("\n--- Parsed Records ---");
  console.log(records);

  console.log("\n--- Date Parsing Test ---");
  records.forEach((r: any) => {
    const d = new Date(r.Date);
    console.log(`Input: "${r.Date}" -> JS Date: ${d.toISOString()} (Timestamp: ${d.getTime()})`);
  });

} catch (error) {
  console.error("Parsing Error:", error);
}
