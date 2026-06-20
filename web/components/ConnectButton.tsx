"use client";

import { isParaEnabled } from "@/lib/para";
import { InjectedConnectButton } from "./InjectedConnectButton";
import { ParaConnectButton } from "./ParaConnectButton";

/**
 * Renders the Para sign-in button (email/social/passkey) when Para is
 * configured, otherwise the injected-wallet connect button.
 */
export function ConnectButton() {
  return isParaEnabled ? <ParaConnectButton /> : <InjectedConnectButton />;
}
