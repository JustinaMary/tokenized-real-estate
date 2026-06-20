"use client";

import "@getpara/react-sdk/styles.css";
import { Environment, ParaProvider } from "@getpara/react-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";
import { useState, type ReactNode } from "react";
import { monadTestnet } from "@/lib/chain";
import {
  PARA_PUBLIC_API_KEY,
  PARA_APP_NAME,
  WALLETCONNECT_PROJECT_ID,
} from "@/lib/para";

/**
 * Para provider: embedded MPC wallets with email / passkey / social login, plus
 * external-wallet connect. Monad testnet is wired through
 * externalWalletConfig.evmConnector.config (Para's v2 shape — there is no
 * separate wagmi createConfig). Active only when NEXT_PUBLIC_PARA_API_KEY is set.
 */
export function ParaProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{ apiKey: PARA_PUBLIC_API_KEY, env: Environment.BETA }}
        config={{ appName: PARA_APP_NAME }}
        paraModalConfig={{
          // Email + passkey only for the demo. Empty oAuthMethods hides all
          // social buttons so there are no dead tiles. To add Google/Apple etc.,
          // enable those providers on the Para project, then list them here.
          oAuthMethods: [],
          disablePhoneLogin: true,
          recoverySecretStepEnabled: true,
        }}
        externalWalletConfig={{
          // Email/passkey embedded wallet AND external-wallet connect, both on
          // Monad testnet. WalletConnect needs a project id (free, cloud.reown.com)
          // — included only when set so injected wallets still work without it.
          ...(WALLETCONNECT_PROJECT_ID
            ? { walletConnect: { projectId: WALLETCONNECT_PROJECT_ID } }
            : {}),
          evmConnector: {
            config: {
              chains: [monadTestnet],
              transports: { [monadTestnet.id]: http() },
            },
          },
          wallets: ["METAMASK", "COINBASE", "WALLETCONNECT", "RAINBOW", "ZERION", "RABBY"],
        }}
      >
        {children}
      </ParaProvider>
    </QueryClientProvider>
  );
}
