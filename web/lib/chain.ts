import { defineChain } from "viem";

const RPC_URL =
  process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";

/** Monad testnet (chainId 10143). */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});
