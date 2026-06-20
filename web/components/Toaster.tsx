"use client";

import { useEffect, useState } from "react";
import type { ToastDetail } from "@/lib/toast";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastDetail[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      setToasts((cur) => [...cur, detail]);
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== detail.id));
      }, 5000);
    }
    window.addEventListener("terra:toast", onToast);
    return () => window.removeEventListener("terra:toast", onToast);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rise rounded-xl border bg-bg-card px-4 py-3 text-sm shadow-lg"
          style={{
            borderColor:
              t.type === "success"
                ? "var(--accent)"
                : t.type === "error"
                  ? "var(--danger)"
                  : "var(--border-strong)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{
                background:
                  t.type === "success"
                    ? "var(--accent)"
                    : t.type === "error"
                      ? "var(--danger)"
                      : "var(--fg-muted)",
              }}
            />
            <span className="text-fg">{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
