import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { getStaticProperty, type PropertyMeta } from "@/lib/properties";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  title: string;
  location: string;
  description: string;
  image: string;
  valuation_usd: string;
  property_type: string;
};

/** GET /api/properties/[id] — one property's metadata. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/properties/[id]">) {
  const { id } = await ctx.params;
  const numId = Number(id);

  const sql = getSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM properties WHERE id = ${numId}`) as Row[];
      if (rows[0]) {
        const r = rows[0];
        const meta: PropertyMeta = {
          id: r.id,
          title: r.title,
          location: r.location,
          description: r.description,
          image: r.image,
          valuationUSD: Number(r.valuation_usd),
          propertyType: r.property_type,
        };
        return NextResponse.json(meta);
      }
    } catch {
      // fall through to static
    }
  }

  const fallback = getStaticProperty(numId);
  if (fallback) return NextResponse.json(fallback);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
