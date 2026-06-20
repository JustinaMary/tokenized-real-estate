"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { maxUint256 } from "viem";
import { mockUSDC, propertyShares, marketplace } from "@/lib/contracts";
import { isConfigured } from "@/lib/contracts";
import { useTx } from "@/lib/useTx";
import { useUsdcAllowance, useIsApprovedForAll } from "@/lib/useAllowance";
import { parseUSDC } from "@/lib/format";
import { Button, Spinner } from "./ui";

type Msg = { role: "user" | "assistant"; content: string };
type Action = { name: string; input: Record<string, unknown> } | null;

/** Render inline **bold** within a line. */
function inline(text: string, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <span key={key}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-fg">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

/** Minimal markdown: paragraphs, "- " bullets, **bold**. No tables. */
function MessageText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={out.length} className="ml-4 list-disc space-y-1">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b, i)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      bullets.push(line.slice(2));
    } else {
      flush();
      out.push(
        <p key={out.length} className="leading-relaxed">
          {inline(line, 0)}
        </p>
      );
    }
  }
  flush();
  return <div className="space-y-2">{out}</div>;
}

export function AgentWidget() {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Terra copilot. Ask me about properties, your portfolio, or rental income — I can also help you buy, claim, or list shares.",
    },
  ]);
  const [pendingAction, setPendingAction] = useState<Action>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const { run, isBusy } = useTx();
  const { allowance, refetch: refetchAllowance } = useUsdcAllowance(
    address,
    propertyShares.address
  );
  const { approved, refetch: refetchApproved } = useIsApprovedForAll(
    propertyShares,
    address,
    marketplace.address
  );

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, loading, pendingAction]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPendingAction(null);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, address }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.action) setPendingAction(data.action);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't reach the copilot." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function execute(action: NonNullable<Action>) {
    const { name, input: a } = action;
    const propertyId = Number(a.propertyId);

    if (name === "propose_buy") {
      const amount = BigInt(Number(a.amount));
      // approve mUSDC if needed (cost is unknown precisely here; approve max)
      if (allowance === 0n) {
        const ok = await run(
          { ...mockUSDC, functionName: "approve", args: [propertyShares.address, maxUint256] },
          { pending: "Approve mUSDC…", success: "Approved" }
        );
        if (!ok) return;
        await refetchAllowance();
      }
      const ok = await run(
        { ...propertyShares, functionName: "buyPrimary", args: [BigInt(propertyId), amount] },
        {
          pending: "Buying shares…",
          success: "Shares purchased",
          activity: { type: "buy", title: `Bought ${amount} shares · property #${propertyId}` },
        }
      );
      if (ok) setPendingAction(null);
    } else if (name === "propose_claim") {
      const ok = await run(
        { ...propertyShares, functionName: "claimRent", args: [BigInt(propertyId)] },
        {
          pending: "Claiming rent…",
          success: "Rent claimed",
          activity: { type: "claim", title: `Claimed rent · property #${propertyId}` },
        }
      );
      if (ok) setPendingAction(null);
    } else if (name === "propose_list") {
      const amount = BigInt(Number(a.amount));
      if (!approved) {
        const ok = await run(
          { ...propertyShares, functionName: "setApprovalForAll", args: [marketplace.address, true] },
          { pending: "Approve marketplace…", success: "Approved" }
        );
        if (!ok) return;
        await refetchApproved();
      }
      const ok = await run(
        {
          ...marketplace,
          functionName: "list",
          args: [BigInt(propertyId), amount, parseUSDC(String(a.pricePerShare))],
        },
        {
          pending: "Creating listing…",
          success: "Listing created",
          activity: { type: "list", title: `Listed ${amount} shares · property #${propertyId}` },
        }
      );
      if (ok) setPendingAction(null);
    }
  }

  function actionLabel(action: NonNullable<Action>): string {
    const a = action.input;
    if (action.name === "propose_buy") return `Buy ${a.amount} shares of property #${a.propertyId}`;
    if (action.name === "propose_claim") return `Claim rent for property #${a.propertyId}`;
    if (action.name === "propose_list")
      return `List ${a.amount} shares of #${a.propertyId} at ${a.pricePerShare} mUSDC`;
    return "Confirm action";
  }

  if (!isConfigured) return null;

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-accent text-[#06281f] shadow-[0_8px_30px_-6px_rgba(52,211,153,0.6)] transition-transform hover:scale-105"
        aria-label="Open AI copilot"
      >
        {open ? "✕" : "✦"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[32rem] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl rise">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Terra Copilot</div>
            <div className="text-xs text-fg-faint">AI investing assistant</div>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-accent/15 text-fg"
                    : "bg-bg-elev text-fg-muted"
                }`}
              >
                {m.role === "assistant" ? <MessageText text={m.content} /> : m.content}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-fg-faint">
                <Spinner /> thinking…
              </div>
            )}

            {pendingAction && (
              <div className="rounded-xl border border-accent/30 bg-accent-dim/30 p-3">
                <div className="mb-2 text-sm text-fg">{actionLabel(pendingAction)}</div>
                <Button
                  className="w-full"
                  loading={isBusy}
                  onClick={() => execute(pendingAction)}
                >
                  Confirm &amp; sign
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about properties or your portfolio…"
                className="flex-1 rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent/50 focus:outline-none"
              />
              <Button onClick={send} loading={loading} disabled={!input.trim()}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
