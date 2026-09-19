import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { PublicKey } from "@solana/web3.js";
import { getBusinessAnalytics } from "@/lib/analytics";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_QUESTION_LENGTH = 300;

// This endpoint calls a paid third-party API on every request, so an
// unrated endpoint here isn't just a spam risk — it's a real money risk.
// Keeping the limit tighter than the other endpoints on purpose.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function isValidSolanaAddress(address: unknown): address is string {
  if (typeof address !== "string") return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `You are a loyalty program analyst for a small local business.
You will be given a JSON summary of the business's real on-chain loyalty data:
daily stamp counts, what hour of day customers usually visit, how many unique
customers there are, how many are repeat visitors, a per-wallet claim count, and
how many customers are exactly one stamp away from a reward.

Answer the merchant's question in plain, friendly language using only this data.
When referring to a specific customer, use their "topCustomersByClaims" entry: if
"name" is set, use that name. If "name" is null, refer to them by the first 4 and
last 4 characters of their address instead (e.g. "9sx1...RTzE"), never the full
raw address.
If one wallet's claim count is noticeably higher than the average across other
wallets (roughly 3-4x or more), mention it as worth a second look — this could be
a customer claiming unusually fast, not necessarily anything wrong, just worth
noting. Keep answers short: two or three sentences unless more detail is clearly
needed. Never invent numbers that aren't in the data you were given.`;

// The three questions the copilot is actually tested against and shown as
// clickable prompts. If the live AI call fails, these three specifically get
// a real, honest fallback answer — computed from the same live data, just
// with plain templating instead of AI phrasing, rather than a fake or static
// canned response.
const FIXED_QUESTIONS = [
  "Who's closest to a reward?",
  "When are we busiest?",
  "Is anything anomalous this week?",
] as const;

function fallbackAnswer(question: string, summary: Awaited<ReturnType<typeof getBusinessAnalytics>>): string | null {
  if (question === FIXED_QUESTIONS[0]) {
    if (summary.customersOneStampAway === 0) {
      return "No customers are currently exactly one stamp away from a reward.";
    }
    return `${summary.customersOneStampAway} customer${summary.customersOneStampAway === 1 ? " is" : "s are"} exactly one stamp away from a reward right now.`;
  }

  if (question === FIXED_QUESTIONS[1]) {
    const days = Object.entries(summary.stampsPerDay);
    const hours = Object.entries(summary.hourDistribution);
    if (days.length === 0) return "There isn't enough claim history yet to say when you're busiest.";

    const busiestDay = days.reduce((a, b) => (b[1] > a[1] ? b : a));
    const busiestHour = hours.reduce((a, b) => (b[1] > a[1] ? b : a));
    return `Your busiest day so far is ${busiestDay[0]} (${busiestDay[1]} stamp${busiestDay[1] === 1 ? "" : "s"}), and the busiest hour is around ${busiestHour[0]}:00.`;
  }

  if (question === FIXED_QUESTIONS[2]) {
    const counts = Object.values(summary.claimsPerWallet);
    if (counts.length < 2) return "There isn't enough activity yet to compare customers against each other.";

    const max = Math.max(...counts);
    const average = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    if (max >= average * 3) {
      return `One customer has claimed ${max} stamps, noticeably more than the average of ${average.toFixed(1)} — worth a second look, though not necessarily anything wrong.`;
    }
    return "Nothing stands out as unusual across your customers right now.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please slow down." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const owner = body?.owner;
  const question = body?.question;

  if (!isValidSolanaAddress(owner)) {
    return NextResponse.json({ error: "owner must be a valid Solana public key" }, { status: 400 });
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  let summary;
  try {
    summary = await getBusinessAnalytics(owner);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 }
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${SYSTEM_PROMPT}\n\nData:\n${JSON.stringify(summary, null, 2)}\n\nQuestion: ${question}`,
    });

    return NextResponse.json({ answer: response.text, usedFallback: false });
  } catch (err) {
    console.error("Live AI call failed, trying fallback:", err);

    const fallback = fallbackAnswer(question, summary);
    if (fallback) {
      return NextResponse.json({ answer: fallback, usedFallback: true });
    }

    return NextResponse.json({
      error: "The AI is temporarily unavailable, and this question doesn't have a canned fallback. Please try again in a moment.",
    });
  }
}