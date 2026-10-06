import type { NextConfig } from "next";

// The only origin the browser talks to for Solana reads and sends is the RPC endpoint the app is
// configured with. Derive it from the same variable the app uses, so the policy can't drift from it.
const rpcOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? "https://api.devnet.solana.com").origin;
  } catch {
    return "https://api.devnet.solana.com";
  }
})();

// Scripts keep 'unsafe-inline' because Next.js injects inline bootstrap scripts; a nonce-based policy
// would remove it but needs a middleware change. Everything else is locked to this origin.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${rpcOrigin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@anchor-lang/core"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
