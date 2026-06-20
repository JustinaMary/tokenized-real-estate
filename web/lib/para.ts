/**
 * Para (embedded MPC wallet + social login) is enabled only when an API key is
 * present. Without it the app falls back to injected-wallet connect, so the app
 * always runs. Add NEXT_PUBLIC_PARA_API_KEY (from `para keys create`) to switch
 * on email / passkey / social sign-in.
 */
export const PARA_PUBLIC_API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY ?? "";
export const isParaEnabled = PARA_PUBLIC_API_KEY.length > 0;
export const PARA_APP_NAME = "Terra";

/**
 * WalletConnect project ID — required by external-wallet connectors
 * (WalletConnect/Coinbase/Rainbow/etc.). Free from https://cloud.reown.com.
 * Optional: without it, injected wallets (MetaMask/Rabby) still work, but Para
 * shows a setup warning and WalletConnect-based wallets won't connect.
 */
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
