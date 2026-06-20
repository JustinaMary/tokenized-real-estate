"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { toast } from "./toast";

type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";

/**
 * Wraps a contract write: submits, waits for the receipt, and emits toasts at
 * each stage. Returns a `run` that resolves true on success, false otherwise.
 */
export function useTx() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<TxStatus>("idle");

  const run = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, labels?: { pending?: string; success?: string }) => {
      try {
        setStatus("pending");
        toast(labels?.pending ?? "Confirm in your wallet…", "info");
        const hash = await writeContractAsync(request);
        setStatus("confirming");
        toast("Transaction submitted, waiting for confirmation…", "info");
        await waitForTransactionReceipt(config, { hash });
        setStatus("success");
        toast(labels?.success ?? "Transaction confirmed", "success");
        return true;
      } catch (err: unknown) {
        setStatus("error");
        const message =
          err instanceof Error
            ? err.message.split("\n")[0].slice(0, 120)
            : "Transaction failed";
        toast(message, "error");
        return false;
      }
    },
    [config, writeContractAsync]
  );

  return { run, status, isBusy: status === "pending" || status === "confirming" };
}
