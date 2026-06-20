"use client";

import type { ReactNode } from "react";
import { isParaEnabled } from "@/lib/para";
import { BasicProviders } from "./providers-basic";
import { ParaProviders } from "./providers-para";

/**
 * Picks the wallet layer at build time: Para (email/social/passkey) when
 * NEXT_PUBLIC_PARA_API_KEY is set, otherwise injected-wallet connect. Both
 * expose Wagmi context, so the rest of the app is identical either way.
 */
export function Providers({ children }: { children: ReactNode }) {
  if (isParaEnabled) return <ParaProviders>{children}</ParaProviders>;
  return <BasicProviders>{children}</BasicProviders>;
}
