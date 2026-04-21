import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 토큰으로 유저 확인
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  try {
    // DB 데이터 삭제
    await supabaseAdmin.from("battle_votes").delete().eq("user_id", user.id);
    await supabaseAdmin.from("attendance").delete().eq("user_id", user.id);
    await supabaseAdmin.from("users").delete().eq("id", user.id);

    // Auth 유저 삭제
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[delete-account]", e);
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했어요" }, { status: 500 });
  }
}
