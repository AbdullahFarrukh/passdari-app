import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "customer-names.db");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_names (
    address TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

export function setCustomerName(address: string, name: string) {
  const stmt = db.prepare(
    "INSERT INTO customer_names (address, name) VALUES (?, ?) ON CONFLICT(address) DO UPDATE SET name = excluded.name"
  );
  stmt.run(address, name);
}

export function getCustomerNames(addresses: string[]): Record<string, string> {
  if (addresses.length === 0) return {};
  const placeholders = addresses.map(() => "?").join(",");
  const stmt = db.prepare(
    `SELECT address, name FROM customer_names WHERE address IN (${placeholders})`
  );
  const rows = stmt.all(...addresses) as { address: string; name: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.address] = row.name;
  }
  return result;
}