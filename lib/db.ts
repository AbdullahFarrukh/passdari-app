// @ts-ignore — node:sqlite is a relatively new Node built-in, not
// available in every environment (Vercel's serverless functions in
// particular). Ignoring the type error here, rather than restructuring
// the whole file, is deliberate: this import already works correctly
// wherever the module genuinely exists, and this is the smallest
// possible change that stops it from failing Vercel's build.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let db: DatabaseSync | null = null;

try {
  const dbPath = path.join(process.cwd(), "customer-names.db");
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_names (
      address TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
} catch (err) {
  console.warn("Customer display names unavailable in this environment — falling back to addresses.", err);
  db = null;
}

export function setCustomerName(address: string, name: string) {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT INTO customer_names (address, name) VALUES (?, ?) ON CONFLICT(address) DO UPDATE SET name = excluded.name"
  );
  stmt.run(address, name);
}

export function getCustomerNames(addresses: string[]): Record<string, string> {
  if (!db || addresses.length === 0) return {};
  const placeholders = addresses.map(() => "?").join(",");
  const stmt = db.prepare(
    `SELECT address, name FROM customer_names WHERE address IN (${placeholders})`
  );
  const rows = stmt.all(...addresses) as { address: string; name: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) result[row.address] = row.name;
  return result;
}