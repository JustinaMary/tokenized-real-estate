import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

const DDL = `CREATE TABLE IF NOT EXISTS activity (
  address    TEXT NOT NULL,
  id         TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  tx_hash    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (address, id)
)`;

const isAddr = (a: string) => /^0x[a-f0-9]{40}$/.test(a);

/** GET /api/activity?address= — durable per-address activity (Postgres). */
export async function GET(request: Request) {
  const sql = getSql();
  const address = (new URL(request.url).searchParams.get("address") ?? "").toLowerCase();
  if (!sql || !isAddr(address)) return NextResponse.json([]);
  try {
    await sql.query(DDL);
    const rows = (await sql`
      SELECT id, type, title, tx_hash, (extract(epoch from created_at) * 1000)::bigint AS ts
      FROM activity WHERE address = ${address} ORDER BY created_at DESC LIMIT 100
    `) as { id: string; type: string; title: string; tx_hash: string; ts: string }[];
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        txHash: r.tx_hash,
        timestamp: Number(r.ts),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

/** POST /api/activity — record one on-chain action (idempotent per id). */
export async function POST(request: Request) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ ok: false, error: "no database" }, { status: 503 });
  const b = (await request.json()) as {
    address?: string;
    id?: string;
    type?: string;
    title?: string;
    txHash?: string;
  };
  const address = (b.address ?? "").toLowerCase();
  if (!isAddr(address) || !b.txHash || !b.type) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const id = b.id ?? `${b.txHash}-${b.type}`;
  try {
    await sql.query(DDL);
    await sql`
      INSERT INTO activity (address, id, type, title, tx_hash)
      VALUES (${address}, ${id}, ${b.type}, ${b.title ?? ""}, ${b.txHash})
      ON CONFLICT (address, id) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "db error" },
      { status: 500 }
    );
  }
}
