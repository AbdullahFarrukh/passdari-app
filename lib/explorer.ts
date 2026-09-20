// Where the "view on Solana Explorer" links point. The app runs on devnet, so that is the default.
// Set NEXT_PUBLIC_SOLANA_CLUSTER=localnet when running against a local validator, or mainnet-beta later.
const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export const PROGRAM_ID = "HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL";
export const CLUSTER_LABEL = cluster === "mainnet-beta" ? "mainnet" : cluster;

function clusterQuery(): string {
  if (cluster === "mainnet-beta") return "";
  if (cluster === "localnet") return `?cluster=custom&customUrl=${encodeURIComponent("http://localhost:8899")}`;
  return `?cluster=${cluster}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}${clusterQuery()}`;
}

// "6Wi1…ZbU": enough to recognise an address, the full one is a click or a hover away.
export function shortAddress(address: string, edge = 4): string {
  return address.length <= edge * 2 + 1 ? address : `${address.slice(0, edge)}…${address.slice(-edge)}`;
}
