"use client";

import "@getpara/react-sdk/styles.css";
import { Environment, ParaProvider } from "@getpara/react-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";
import { useState, type ReactNode } from "react";
import { monadTestnet } from "@/lib/chain";
import { PARA_PUBLIC_API_KEY, PARA_APP_NAME } from "@/lib/para";

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
          oAuthMethods: ["GOOGLE", "APPLE", "DISCORD", "TWITTER", "FACEBOOK", "FARCASTER"],
          disablePhoneLogin: false,
          recoverySecretStepEnabled: true,
        }}
        externalWalletConfig={{
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
