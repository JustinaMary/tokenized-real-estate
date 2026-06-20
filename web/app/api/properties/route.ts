import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { STATIC_PROPERTIES, type PropertyMeta } from "@/lib/properties";

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

function rowToMeta(r: Row): PropertyMeta {
  return {
    id: r.id,
    title: r.title,
    location: r.location,
    description: r.description,
    image: r.image,
    valuationUSD: Number(r.valuation_usd),
    propertyType: r.property_type,
  };
}

/** GET /api/properties — list property metadata (Postgres or static seed). */
export async function GET() {
  const sql = getSql();
  if (!sql) return NextResponse.json(STATIC_PROPERTIES);
  try {
    const rows = (await sql`SELECT * FROM properties ORDER BY id`) as Row[];
    return NextResponse.json(rows.map(rowToMeta));
  } catch {
    return NextResponse.json(STATIC_PROPERTIES);
  }
}

/** POST /api/properties — upsert metadata for a property (issuer flow). */
export async function POST(request: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured (DATABASE_URL)" },
      { status: 503 }
    );
  }
  const body = (await request.json()) as PropertyMeta;
  if (typeof body.id !== "number" || !body.title) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  try {
    await sql`
      INSERT INTO properties (id, title, location, description, image, valuation_usd, property_type)
      VALUES (${body.id}, ${body.title}, ${body.location}, ${body.description},
              ${body.image}, ${body.valuationUSD}, ${body.propertyType})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, location = EXCLUDED.location,
        description = EXCLUDED.description, image = EXCLUDED.image,
        valuation_usd = EXCLUDED.valuation_usd, property_type = EXCLUDED.property_type
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}
