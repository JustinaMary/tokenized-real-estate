import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "./chain";

/**
 * Wagmi config for Monad testnet.
 *
 * Uses the injected connector (MetaMask / Rabby / etc.) so the app runs out of
 * the box. To add email / social / passkey sign-in, layer Para's ParaProvider
 * on top per the monskill `wallet-integration` skill — same wagmi config.
 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [monadTestnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
