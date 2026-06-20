/**
 * Para (embedded MPC wallet + social login) is enabled only when an API key is
 * present. Without it the app falls back to injected-wallet connect, so the app
 * always runs. Add NEXT_PUBLIC_PARA_API_KEY (from `para keys create`) to switch
 * on email / passkey / social sign-in.
 */
export const PARA_PUBLIC_API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY ?? "";
export const isParaEnabled = PARA_PUBLIC_API_KEY.length > 0;
export const PARA_APP_NAME = "Terra";
