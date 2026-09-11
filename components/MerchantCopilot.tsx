"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; text: string; usedFallback?: boolean };

const SUGGESTED_QUESTIONS = [
  "Who's closest to a reward?",
  "When are we busiest?",
  "Is anything anomalous this week?",
];

export function MerchantCopilot({ ownerAddress }: { ownerAddress: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: ownerAddress, question: q }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: data.answer, usedFallback: data.usedFallback }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    ask(question);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="w-80 flex flex-col gap-3 border border-line rounded-lg p-4 bg-white shadow-lg mb-3">
          <div className="flex justify-between items-center">
            <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">
              Ask about your business
            </p>
            <button onClick={() => setOpen(false)} className="text-charcoal/50 text-sm">
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-charcoal/50 mb-1">Try one of these:</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="text-left text-sm border border-line rounded-md px-2 py-1.5 hover:bg-paper"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-md ${
                  m.role === "user" ? "bg-paper self-end text-right" : "bg-ink/5 text-ink"
                }`}
              >
                {m.text}
                {m.usedFallback && (
                  <p className="text-xs text-stamp-red mt-1">
                    (Live AI was unavailable — this is a plain-data answer, not an AI response.)
                  </p>
                )}
              </div>
            ))}
            {loading && <p className="text-sm text-charcoal/50 font-mono">Thinking…</p>}
          </div>

          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question"
              className="flex-1 border border-line rounded-md px-3 py-2 bg-white text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Ask
            </button>
          </form>

          {error && <p className="text-stamp-red text-sm">{error}</p>}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-ink text-paper shadow-lg flex items-center justify-center"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>
    </div>
  );
}