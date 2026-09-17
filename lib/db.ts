type CustomerNameStore = {
  setCustomerName: (address: string, name: string) => void;
  getCustomerNames: (addresses: string[]) => Record<string, string>;
};

let store: CustomerNameStore | null = null;
let attempted = false;

function getStore(): CustomerNameStore | null {
  if (attempted) return store;
  attempted = true;

  try {
    // node:sqlite is a relatively new Node built-in — not guaranteed to
    // exist in every deployment environment, Vercel's serverless
    // functions included. The module name is built from two pieces
    // rather than written as one literal string, specifically so
    // TypeScript never tries to statically resolve its types at build
    // time — this feature is pure decoration (a chosen display name
    // shown instead of a truncated address), so its absence should be a
    // quiet runtime fallback, never a build failure.
    const moduleName = "node:" + "sqlite";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require(moduleName) as any;
    const path = require("node:path");

    const dbPath = path.join(process.cwd(), "customer-names.db");
    const db = new DatabaseSync(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_names (
        address TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    store = {
      setCustomerName(address: string, name: string) {
        const stmt = db.prepare(
          "INSERT INTO customer_names (address, name) VALUES (?, ?) ON CONFLICT(address) DO UPDATE SET name = excluded.name"
        );
        stmt.run(address, name);
      },
      getCustomerNames(addresses: string[]): Record<string, string> {
        if (addresses.length === 0) return {};
        const placeholders = addresses.map(() => "?").join(",");
        const stmt = db.prepare(
          `SELECT address, name FROM customer_names WHERE address IN (${placeholders})`
        );
        const rows = stmt.all(...addresses) as { address: string; name: string }[];
        const result: Record<string, string> = {};
        for (const row of rows) result[row.address] = row.name;
        return result;
      },
    };
  } catch (err) {
    console.warn("Customer display names unavailable in this environment — falling back to addresses.", err);
    store = null;
  }

  return store;
}

export function setCustomerName(address: string, name: string) {
  getStore()?.setCustomerName(address, name);
}

export function getCustomerNames(addresses: string[]): Record<string, string> {
  return getStore()?.getCustomerNames(addresses) ?? {};
}