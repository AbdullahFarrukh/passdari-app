import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getBusinessAnalytics } from "@/lib/analytics";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a loyalty program analyst for a small local business.
You will be given a JSON summary of the business's real on-chain loyalty data:
daily stamp counts, what hour of day customers usually visit, how many unique
customers there are, how many are repeat visitors, a per-wallet claim count, and
how many customers are exactly one stamp away from a reward.

Answer the merchant's question in plain, friendly language using only this data.
If one wallet's claim count is noticeably higher than the average across other
wallets (roughly 3-4x or more), mention it as worth a second look — this could be
a customer claiming unusually fast, not necessarily anything wrong, just worth
noting. Keep answers short: two or three sentences unless more detail is clearly
needed. Never invent numbers that aren't in the data you were given.`;

export async function POST(request: NextRequest) {
  const { owner, question } = await request.json();

  if (!owner || !question) {
    return NextResponse.json({ error: "owner and question are required" }, { status: 400 });
  }

  try {
    const summary = await getBusinessAnalytics(owner);

    const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
      contents: `${SYSTEM_PROMPT}\n\nData:\n${JSON.stringify(summary, null, 2)}\n\nQuestion: ${question}`,
    });

    return NextResponse.json({ answer: response.text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 }
    );
  }
}