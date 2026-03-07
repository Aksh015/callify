"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export default function DemoPage() {
  const [contextText, setContextText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Welcome to VoiceDesk web demo. Update the context text if needed, then ask a question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [savingContext, setSavingContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/demo/context")
      .then((res) => res.json())
      .then((data: { text?: string }) => {
        setContextText(data.text || "");
      })
      .catch(() => {
        // Keep page usable even if context fetch fails.
      });
  }, []);

  async function saveContext() {
    setSavingContext(true);
    setError("");

    try {
      const res = await fetch("/api/demo/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contextText }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save context.");
      }
      setContextText(data.text || contextText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save context.");
    } finally {
      setSavingContext(false);
    }
  }

  async function sendMessage() {
    const message = input.trim();
    if (!message || loading) return;

    setError("");
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: message }]);

    try {
      const res = await fetch("/api/demo/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            knowledgeBaseId: "demo-barber",
            businessInfo: {
              name: "VoiceDesk Demo Business",
              openingHours: "9 AM - 9 PM",
              address: "Ahmedabad, Gujarat",
              servicePricing: [
                { service: "Haircut", price: "199 INR" },
                { service: "Beard Trim", price: "99 INR" },
              ],
            },
          },
        }),
      });

      const data = (await res.json()) as { responseText?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to get demo response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.responseText || "No response generated.",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get demo response.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Try Demo Chat</h1>
            <p className="mt-1 text-sm text-slate-400">
              One context textbox controls website demo and current Twilio runtime responses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/signup?redirect=/onboarding"
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-900"
            >
              Save & Sign Up
            </Link>
            <Link href="/" className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300">
              Back Home
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Context Text</h2>
            <button
              onClick={() => void saveContext()}
              disabled={savingContext}
              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-slate-900 disabled:opacity-60"
            >
              {savingContext ? "Saving..." : "Save Context"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Keep this short and factual. The Twilio number will answer using this context.
          </p>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            className="mt-3 h-36 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-semibold">Demo Conversation</h2>
          <div className="mt-3 h-[380px] overflow-y-auto rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "ml-auto bg-cyan-400 text-slate-900"
                      : "bg-white/10 text-slate-100"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask a question..."
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
