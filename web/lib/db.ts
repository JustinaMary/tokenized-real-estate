import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Returns a Neon SQL client if DATABASE_URL is configured, else null.
 * The API routes fall back to the static property seed when this is null,
 * so the app is fully demoable without a database.
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

/**
 * One-time schema. Call from a route or script after setting DATABASE_URL.
 * Kept simple for the hackathon; the chain remains the source of truth for
 * ownership/rent/listings.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS properties (
  id            INTEGER PRIMARY KEY,
  title         TEXT NOT NULL,
  location      TEXT NOT NULL,
  description   TEXT NOT NULL,
  image         TEXT NOT NULL,
  valuation_usd BIGINT NOT NULL,
  property_type TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  address      TEXT PRIMARY KEY,
  display_name TEXT,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist (
  address     TEXT NOT NULL,
  property_id INTEGER NOT NULL,
  PRIMARY KEY (address, property_id)
);
`;
