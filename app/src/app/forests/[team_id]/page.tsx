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

function TreeIllustration() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, #C8ECFF 0%, #A8D870 55%, #5CBD50 100%)" }}
    >
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 390 240"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <path
          d="M0 240 L0 160 Q60 100 130 130 Q200 160 270 110 Q330 75 390 120 L390 240 Z"
          fill="#6BC46B"
        />
        <path
          d="M0 240 L0 185 Q55 145 115 165 Q180 188 250 148 Q310 118 390 158 L390 240 Z"
          fill="#3DB340"
        />
        <circle cx="90"  cy="120" r="11" fill="#228B22" />
        <circle cx="108" cy="113" r="8"  fill="#1A7A1A" />
        <circle cx="195" cy="102" r="10" fill="#228B22" />
        <circle cx="212" cy="97"  r="7"  fill="#1A7A1A" />
        <circle cx="310" cy="108" r="9"  fill="#228B22" />
        <circle cx="60"  cy="156" r="12" fill="#1E7A1E" />
        <circle cx="80"  cy="148" r="9"  fill="#165F16" />
        <circle cx="160" cy="142" r="13" fill="#1E7A1E" />
        <circle cx="180" cy="136" r="9"  fill="#165F16" />
        <circle cx="300" cy="145" r="11" fill="#1E7A1E" />
        <circle cx="320" cy="139" r="8"  fill="#165F16" />
        <circle cx="350" cy="152" r="10" fill="#1E7A1E" />
      </svg>
    </div>
  );
}

function StarIllustration() {
  const stars = [
    { x: "15%", y: "12%" }, { x: "72%", y: "8%"  }, { x: "88%", y: "20%" },
    { x: "28%", y: "25%" }, { x: "55%", y: "15%" }, { x: "40%", y: "40%" },
    { x: "80%", y: "38%" }, { x: "10%", y: "50%" }, { x: "65%", y: "55%" },
    { x: "92%", y: "60%" }, { x: "25%", y: "65%" }, { x: "50%", y: "72%" },
    { x: "35%", y: "18%" }, { x: "60%", y: "32%" }, { x: "82%", y: "48%" },
    { x: "18%", y: "78%" }, { x: "70%", y: "22%" }, { x: "45%", y: "85%" },
  ];
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, #2D0566 0%, #7B3FC8 100%)" }}
    >
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: s.x,
            top: s.y,
            width: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
            height: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
            opacity: 0.6 + (i % 4) * 0.1,
          }}
        />
      ))}
      <div
        className="absolute rounded-full"
        style={{
          width: 90,
          height: 90,
          left: "55%",
          top: "30%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle at 35% 35%, #E0B0FF, #8040C0)",
          boxShadow: "0 0 30px 8px rgba(180, 100, 255, 0.35)",
        }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: 48,
          height: 48,
          left: "22%",
          top: "22%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 20px 6px rgba(255, 255, 255, 0.4)",
        }}
      />
    </div>
  );
}

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
  const isStarTheme = theme === "night";
  const isOceanTheme = theme === "ocean";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* 배경 일러스트 */}
      <div className="absolute inset-0">
        {theme === "forest" && <TreeIllustration />}
        {theme === "night"  && <StarIllustration />}
        {isOceanTheme && <div className="absolute inset-0 bg-white" />}
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col min-h-dvh">
        <div className="h-11" />

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          {/* 통계 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
            <p
              className={`text-[15px] font-pretendard mb-0.5 ${
                isOceanTheme ? "text-[#555555]" : "text-white/80"
              }`}
            >
              현재 {team.name}의 {themeLabel}은?
            </p>
            <div className="flex items-center gap-[3px] mb-1">
              <span
                className={`text-[24px] font-semibold font-pretendard ${
                  isOceanTheme ? "text-[#222222]" : "text-white"
                }`}
              >
                {treeCount}
              </span>
              <span
                className={`text-[24px] font-pretendard ${
                  isOceanTheme ? "text-[#222222]" : "text-white"
                }`}
              >
                그루
              </span>
              <div
                className={`w-1 h-1 rounded-full mx-[5px] ${
                  isOceanTheme ? "bg-[#2E9200]" : "bg-white/60"
                }`}
              />
              <span
                className={`text-[24px] font-semibold font-pretendard ${
                  isOceanTheme ? "text-[#222222]" : "text-white"
                }`}
              >
                {score}
              </span>
              <span
                className={`text-[24px] font-pretendard ${
                  isOceanTheme ? "text-[#222222]" : "text-white"
                }`}
              >
                점
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`text-[18px] font-pretendard ${
                  isOceanTheme ? "text-[#555555]" : "text-white/80"
                }`}
              >
                참여중
              </span>
              <span
                className={`text-[18px] font-semibold font-pretendard ${
                  isOceanTheme ? "text-[#222222]" : "text-white"
                }`}
              >
                {participants}
              </span>
              <span
                className={`text-[18px] font-pretendard ${
                  isOceanTheme ? "text-[#555555]" : "text-white/80"
                }`}
              >
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
              isStarTheme
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
