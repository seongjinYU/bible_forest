import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { THEMES } from "@/constants/themes";
import { ELEMENT_NAMES } from "@/constants/elements";
import type { ThemeKey } from "@/constants/themes";

export default async function StoragePage() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();

  const [teamRes, treesRes] = await Promise.all([
    supabase.from("teams").select("theme").eq("id", user.team_id).single(),
    supabase
      .from("trees")
      .select("id, tree_type, species, points, obtained_at, is_planted")
      .eq("user_id", user.id)
      .order("is_planted", { ascending: true })
      .order("obtained_at", { ascending: false }),
  ]);

  const rawTheme = (teamRes.data as { theme?: string | null } | null)?.theme;
  const theme: ThemeKey =
    rawTheme && rawTheme in THEMES ? (rawTheme as ThemeKey) : "forest";

  const trees = (treesRes.data ?? []) as {
    id: string;
    tree_type: string;
    species: string;
    points: number;
    obtained_at: string;
    is_planted: boolean;
  }[];

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="h-11" />

      {/* AppBar */}
      <div className="h-[60px] flex items-center px-4 shrink-0">
        <h1 className="flex-1 text-center text-[17px] font-semibold font-pretendard text-[#222222]">
          내 보관함
        </h1>
      </div>

      {trees.length === 0 ? (
        <>
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <p className="text-[17px] font-semibold font-pretendard text-[#222222]">
              보관함이 비어있어요
            </p>
            <p className="text-[14px] font-pretendard text-[#999999] text-center leading-relaxed mt-1.5">
              성경을 읽고 인증해보세요!
            </p>
          </div>
          <div className="px-5 pb-safe pt-3 shrink-0">
            <Link
              href="/"
              className="w-full h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[17px] font-medium font-noto flex items-center justify-center"
            >
              이전
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <ul className="px-5">
              {trees.map((tree) => {
                const speciesNum = Number(tree.species);
                const isNumbered = !isNaN(speciesNum) && speciesNum > 0;
                const elementName = isNumbered
                  ? (ELEMENT_NAMES[theme]?.[speciesNum] ?? tree.species)
                  : tree.species;
                const imgSrc = isNumbered
                  ? `/assets/${theme}/${speciesNum}.png`
                  : null;
                const d = new Date(tree.obtained_at);
                const dateLabel = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.${d.getDate()}`;

                return (
                  <li
                    key={tree.id}
                    className="flex items-center gap-4 py-4 border-b border-[#F0F0F0] last:border-0"
                  >
                    {/* 썸네일 */}
                    <div className="w-[60px] h-[60px] rounded-full bg-[#F3F3F3] flex items-center justify-center shrink-0">
                      {imgSrc && (
                        <img
                          src={imgSrc}
                          alt={elementName}
                          className="w-[40px] h-[40px] object-contain"
                        />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold font-pretendard text-[#222222] leading-snug truncate">
                        {elementName} · {tree.points}점
                      </p>
                      <p className="text-[13px] font-pretendard text-[#AAAAAA] mt-0.5">
                        {dateLabel}
                      </p>
                    </div>

                    {/* 액션 버튼 */}
                    {tree.is_planted ? (
                      <button
                        disabled
                        className="shrink-0 h-[36px] px-4 rounded-full bg-[#F0F0F0] text-[#AAAAAA] text-[14px] font-pretendard"
                      >
                        배치완료
                      </button>
                    ) : (
                      <button className="shrink-0 h-[36px] px-4 rounded-full border border-[#222222] text-[#222222] text-[14px] font-pretendard">
                        배치하기
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* 안내 메시지 */}
            <div className="mx-5 pt-4 pb-4 border-t border-[#EEEEEE] flex flex-col gap-2">
              <p className="text-[13px] font-pretendard text-[#999999] leading-relaxed">
                • 신약일독 달성 시 추가 점수가 부여됩니다.
              </p>
              <p className="text-[13px] font-pretendard text-[#999999] leading-relaxed">
                • 아이템을 배치하지 않으면 팀 점수에 집계되지 않습니다.
              </p>
            </div>
          </div>

          <div className="px-5 pb-safe pt-3 shrink-0">
            <Link
              href="/"
              className="w-full h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[17px] font-medium font-noto flex items-center justify-center"
            >
              이전
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
