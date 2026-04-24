import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import type { ReportContent }        from "@/app/lib/gemini";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 인증 헬퍼 ────────────────────────────────────────────────
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

// ── GET: 리포트 목록 조회 or 특정 주 조회 ─────────────────────
// ?week=2026-04-21&market=kr  → 특정 리포트 1건
// (파라미터 없음)              → 전체 목록 (최근 12주)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const week   = searchParams.get("week");
  const market = searchParams.get("market");

  // 특정 리포트 1건 조회
  if (week && market) {
    const { data, error } = await supabaseAdmin
      .from("ai_weekly_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", week)
      .eq("market", market)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ report: data });
  }

  // 전체 목록 (최근 12주)
  const { data, error } = await supabaseAdmin
    .from("ai_weekly_reports")
    .select("id, week_start, week_end, market, generated_at, content")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(24); // KR + US 각각 12주

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

// ── POST: 옵트인 등록 ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      report_opted_in:    true,
      report_opted_in_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
