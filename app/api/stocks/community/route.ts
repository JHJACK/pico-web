import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const cache = new Map<string, { holders: number; ts: number }>();
const TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "";

  if (!ticker) return Response.json({ holders: 0 });

  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.ts < TTL) {
    return Response.json({ holders: cached.holders });
  }

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await db
      .from("mock_investments")
      .select("user_id")
      .eq("ticker", ticker)
      .eq("status", "holding");

    const holders = new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id)).size;
    cache.set(ticker, { holders, ts: Date.now() });
    return Response.json({ holders });
  } catch (e) {
    console.error("[/api/stocks/community]", e);
    return Response.json({ holders: 0 });
  }
}
