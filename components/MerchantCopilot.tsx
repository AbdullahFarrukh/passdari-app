"use client";

import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import { signCopilotRequest } from "@/lib/copilotAuth";
import { Button } from "@/components/ui/Button";
import { ChatIcon, CloseIcon, LockIcon } from "@/components/ui/icons";

type Message = { role: "user" | "assistant"; text: string; usedFallback?: boolean };

const SUGGESTED_QUESTIONS = [
  "Who's closest to a reward?",
  "When are we busiest?",
  "Is anything anomalous this week?",
];

export function MerchantCopilot({ keypair }: { keypair: Keypair }) {
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
        // Signed here in the browser with the merchant's own key, so the
        // server can tell the request really comes from this business.
        body: JSON.stringify(signCopilotRequest(keypair, q)),
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="Business copilot" className="surface flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Ask about your business</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close copilot"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink">
              <CloseIcon />
            </button>
          </div>

          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="mb-1 text-sm text-muted">Try one of these:</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} type="button" onClick={() => ask(q)}
                    className="min-h-10 rounded-lg border border-line bg-paper px-3 py-2 text-left text-sm hover:border-ink hover:bg-paper-2">
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg p-2.5 text-sm ${m.role === "user" ? "self-end bg-paper-2 text-right" : "bg-ink/5 text-ink"}`}>
                {m.text}
                {m.usedFallback && (
                  <p className="mt-1 text-xs text-stamp-red">
                    (Live AI was unavailable — this is a plain-data answer, not an AI response.)
                  </p>
                )}
              </div>
            ))}
            {loading && <p className="font-mono text-sm text-muted">Thinking…</p>}
          </div>

          <form onSubmit={handleAsk} className="flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question"
              aria-label="Your question" className="field min-w-0 flex-1 text-sm" />
            <Button type="submit" disabled={loading}>Ask</Button>
          </form>

          {error && <p role="alert" className="text-sm text-stamp-red">{error}</p>}

          <p className="flex items-start gap-1.5 border-t border-line pt-2 text-xs text-muted">
            <LockIcon size={14} className="mt-0.5 shrink-0" />
            Each question is signed with your merchant wallet, so only you can ask about your customers.
          </p>
        </section>
      )}

      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        aria-label={open ? "Close copilot" : "Open copilot"}
        className="flex size-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg hover:bg-ink-deep">
        <ChatIcon size={24} />
      </button>
    </div>
  );
}
