// Recipe: Clean up a customer VAT list before a VIES batch run
//
// The problem: a finance team exports thousands of customer VAT numbers for
// a quarterly VIES re-verification, and running every row through VIES —
// typos, copy-paste artifacts and all — wastes the rate-limited quota on
// input that was never going to pass.
import { validateVAT } from "@alosha/eu-validate";

// Stand-in for a `customers.csv` export — same shape, just inline.
const csv = `customer_id,vat_number
1001,NL123456782B01
1002,NL123456781B01
1003,DE123456789
1004,not-a-vat-number`;

const rows = csv
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split(","));

const clean = [];
const rejected = [];

for (const [customerId, vat] of rows) {
  const result = validateVAT(vat);
  if (result.valid) {
    clean.push({ customerId, vat: result.normalized });
  } else {
    rejected.push({ customerId, vat, error: result.errors[0] });
  }
}

console.log("Clean (worth a VIES call):", clean);
console.log("Rejected (never leaves the process):", rejected);
