"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useConfig, useAccount } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { toast } from "./toast";
import { recordActivity, type ActivityType } from "./activity";

type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";

type RunOpts = {
  pending?: string;
  success?: string;
  /** When set, records an entry in the user's activity feed on success. */
  activity?: { type: ActivityType; title: string };
};

/**
 * Wraps a contract write: submits, waits for the receipt, emits toasts, and
 * records the user's activity feed. Returns a `run` that resolves true on
 * success, false otherwise.
 */
export function useTx() {
  const config = useConfig();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<TxStatus>("idle");

  const run = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, opts?: RunOpts) => {
      try {
        setStatus("pending");
        toast(opts?.pending ?? "Confirm in your wallet…", "info");
        const hash = await writeContractAsync(request);
        setStatus("confirming");
        toast("Transaction submitted, waiting for confirmation…", "info");
        await waitForTransactionReceipt(config, { hash });
        setStatus("success");
        toast(opts?.success ?? "Transaction confirmed", "success");
        if (opts?.activity && address) {
          recordActivity(address, { ...opts.activity, txHash: hash });
        }
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
    [config, writeContractAsync, address]
  );

  return { run, status, isBusy: status === "pending" || status === "confirming" };
}
