import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

type ThemeKey = "forest" | "night" | "ocean";

const THEME_LABELS: Record<ThemeKey, string> = {
  forest: "숲",
  night:  "밤하늘",
  ocean:  "바다",
};

export default async function ForestDetailPage({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const { team_id } = await params;
  const supabase = createSupabaseServerClient();

  type UserRow = { bible_progress: { count: number }[] };

  const [teamRes, usersRes, treesRes] = await Promise.all([
    supabase.from("teams").select("id, name, theme").eq("id", team_id).maybeSingle(),
    supabase.from("users").select("bible_progress(count)").eq("team_id", team_id),
    supabase.from("trees").select("id").eq("team_id", team_id),
  ]);

  if (!teamRes.data) redirect("/forests");

  const team = teamRes.data as { id: string; name: string; theme: string | null };
  const rawTheme = team.theme ?? "forest";
  const theme: ThemeKey = (["forest", "night", "ocean"] as const).includes(rawTheme as ThemeKey)
    ? (rawTheme as ThemeKey)
    : "forest";

  const users = (usersRes.data ?? []) as UserRow[];
  const participants = users.length;
  const score = users.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0);
  const treeCount = (treesRes.data ?? []).length;

  const themeLabel = THEME_LABELS[theme];
  const isDarkBg = theme !== "forest";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* 전체화면 배경 */}
      <div className="absolute inset-0">
        <img src={`/assets/${theme}/bg.png`} alt="" className="w-full h-full object-cover" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col min-h-dvh">
        <div className="h-11" />

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          {/* 통계 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
            <p className={`text-[15px] font-pretendard mb-0.5 ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
              현재 {team.name}의 {themeLabel}은?
            </p>
            <div className="flex items-center gap-[3px] mb-1">
              <span className={`text-[24px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                {treeCount}
              </span>
              <span className={`text-[24px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                그루
              </span>
              <div className={`w-1 h-1 rounded-full mx-[5px] ${isDarkBg ? "bg-white/60" : "bg-[#2E9200]"}`} />
              <span className={`text-[24px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                {score}
              </span>
              <span className={`text-[24px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                점
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[18px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
                참여중
              </span>
              <span className={`text-[18px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                {participants}
              </span>
              <span className={`text-[18px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
                명
              </span>
            </div>
          </div>
        </div>

        {/* 다른 숲 구경하러 가기 */}
        <div className="px-6 pb-safe pt-3">
          <Link
            href="/forests"
            className={`w-full h-[48px] rounded-[8px] text-[16px] font-pretendard flex items-center justify-center ${
              isDarkBg
                ? "bg-white/15 text-white backdrop-blur-sm"
                : "bg-white/80 backdrop-blur-sm border border-white/60 text-[#222222]"
            }`}
          >
            다른 숲 구경하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
