"use client";

import { useQuery } from "@tanstack/react-query";
import { STATIC_PROPERTIES, type PropertyMeta } from "./properties";

async function fetchProperties(): Promise<PropertyMeta[]> {
  try {
    const res = await fetch("/api/properties");
    if (!res.ok) throw new Error("bad response");
    const data = (await res.json()) as PropertyMeta[];
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // fall through to static seed
  }
  return STATIC_PROPERTIES;
}

/** Property metadata from the API (Postgres), falling back to the static seed. */
export function useProperties() {
  return useQuery({ queryKey: ["properties"], queryFn: fetchProperties });
}
