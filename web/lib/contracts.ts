import { MockUSDCABI, PropertySharesABI, MarketplaceABI } from "./abis";

type Hex = `0x${string}`;

/**
 * Deployed contract addresses. Set these in `.env.local` after running the
 * Foundry deploy script (see contracts/script/Deploy.s.sol). They are public
 * (NEXT_PUBLIC_) because the frontend reads/writes them directly.
 */
export const addresses = {
  mockUSDC: (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ?? "") as Hex,
  propertyShares: (process.env.NEXT_PUBLIC_PROPERTY_SHARES_ADDRESS ?? "") as Hex,
  marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ?? "") as Hex,
} as const;

export const isConfigured =
  addresses.mockUSDC.length === 42 &&
  addresses.propertyShares.length === 42 &&
  addresses.marketplace.length === 42;

export const mockUSDC = { address: addresses.mockUSDC, abi: MockUSDCABI } as const;
export const propertyShares = {
  address: addresses.propertyShares,
  abi: PropertySharesABI,
} as const;
export const marketplace = {
  address: addresses.marketplace,
  abi: MarketplaceABI,
} as const;

/** mUSDC uses 6 decimals. */
export const USDC_DECIMALS = 6;
