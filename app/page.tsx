"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-charcoal flex flex-col items-center justify-center gap-12 px-8">
      <div className="text-center">
        <p className="font-mono text-4xl font-semibold text-ink mb-3">StampCoin</p>
        <div className="flex justify-center gap-1.5 mb-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-3 h-3 rounded-full border-2 ${
                i < 7 ? "bg-stamp-red border-stamp-red" : "border-line"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-charcoal/60">A digital stamp card, built on Solana</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <Link
          href="/customer"
          className="flex-1 border border-line rounded-xl p-8 bg-white/60 hover:bg-white hover:border-ink transition-colors flex flex-col items-center gap-3 text-center"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-ink"
          >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M3 9h18" />
            <circle cx="7.5" cy="13.5" r="1" fill="currentColor" />
            <circle cx="11.5" cy="13.5" r="1" fill="currentColor" />
          </svg>
          <p className="font-mono text-lg text-ink">I'm a Customer</p>
          <p className="text-sm text-charcoal/60">Collect stamps and redeem rewards</p>
        </Link>

        <Link
          href="/merchant"
          className="flex-1 border border-line rounded-xl p-8 bg-white/60 hover:bg-white hover:border-ink transition-colors flex flex-col items-center gap-3 text-center"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-ink"
          >
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
          </svg>
          <p className="font-mono text-lg text-ink">I'm a Merchant</p>
          <p className="text-sm text-charcoal/60">Issue stamps and manage your business</p>
        </Link>
      </div>
    </div>
  );
}