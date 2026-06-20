/**
 * Off-chain property metadata.
 *
 * The chain is the source of truth for ownership/rent/listings; this is the
 * rich descriptive layer (title, location, imagery, valuation). In production
 * it lives in Postgres (see app/api/properties) with the JSON also pinned to
 * IPFS. The static seed below keeps the app fully demoable before a database
 * is connected, keyed by on-chain token id.
 */
export type PropertyMeta = {
  id: number;
  title: string;
  location: string;
  description: string;
  image: string;
  valuationUSD: number;
  propertyType: string;
};

export const STATIC_PROPERTIES: PropertyMeta[] = [
  {
    id: 0,
    title: "Marina Sea-View Apartment",
    location: "Bandra West, Mumbai",
    description:
      "A 3BHK sea-facing apartment in one of Mumbai's most sought-after neighbourhoods, leased to a long-term corporate tenant.",
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=70",
    valuationUSD: 1_000_000,
    propertyType: "Residential",
  },
  {
    id: 1,
    title: "Downtown Grade-A Office",
    location: "Lower Parel, Mumbai",
    description:
      "Premium commercial floor in a Grade-A tower with a blue-chip tenant on a 9-year lease. Stable, inflation-linked rental yield.",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=70",
    valuationUSD: 2_500_000,
    propertyType: "Commercial",
  },
  {
    id: 2,
    title: "Hillside Luxury Villa",
    location: "Lonavala, Maharashtra",
    description:
      "A boutique 5-bedroom villa operated as a premium short-stay rental, with strong weekend and holiday occupancy.",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=70",
    valuationUSD: 2_500_000,
    propertyType: "Hospitality",
  },
];

export function getStaticProperty(id: number): PropertyMeta | undefined {
  return STATIC_PROPERTIES.find((p) => p.id === id);
}
