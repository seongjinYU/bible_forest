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
      .select("id, tree_type, species, points, obtained_at")
      .eq("user_id", user.id)
      .eq("is_planted", false)
      .order("obtained_at", { ascending: true }),
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
  }[];

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="h-11" />

      {/* AppBar */}
      <div className="h-[60px] flex items-center px-2">
        <h1 className="flex-1 text-center text-[17px] font-semibold font-pretendard text-[#222222]">
          내 보관함
        </h1>
      </div>

      {trees.length === 0 ? (
        <>
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[17px] font-semibold font-pretendard text-[#222222]">
                보관함이 비어있어요
              </p>
              <p className="text-[14px] font-pretendard text-[#999999] text-center leading-relaxed">
                성경을 읽고 인증해보세요!
              </p>
            </div>
          </div>
          <div className="px-5 pb-safe pt-3 shrink-0">
            <Link
              href="/"
              className="w-full h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[20px] font-medium font-noto flex items-center justify-center"
            >
              이전으로
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 pt-2">
            <p className="text-[14px] font-pretendard text-[#999999] mb-4">
              총{" "}
              <span className="font-semibold text-[#222222]">{trees.length}개</span>
              의 요소를 보유하고 있어요
            </p>

            <div className="grid grid-cols-3 gap-3">
              {trees.map((tree) => {
                const speciesNum = Number(tree.species);
                const isNumbered = !isNaN(speciesNum) && speciesNum > 0;
                const elementName = isNumbered
                  ? (ELEMENT_NAMES[theme]?.[speciesNum] ?? tree.species)
                  : tree.species;
                const imgSrc = isNumbered
                  ? `/assets/${theme}/${speciesNum}.png`
                  : null;
                const obtainedDate = new Date(tree.obtained_at).toLocaleDateString(
                  "ko-KR",
                  { month: "long", day: "numeric" },
                );

                return (
                  <div
                    key={tree.id}
                    className="bg-[#F8F8F8] rounded-[12px] p-3 flex flex-col items-center gap-2"
                  >
                    {imgSrc && (
                      <div className="w-[72px] h-[72px] flex items-center justify-center">
                        <img
                          src={imgSrc}
                          alt={elementName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <p className="text-[12px] font-pretendard text-[#222222] text-center leading-snug">
                      {elementName}
                    </p>
                    <p className="text-[11px] font-pretendard text-[#999999]">
                      {obtainedDate}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-5 pb-safe pt-3 shrink-0">
            <Link
              href="/"
              className="w-full h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[20px] font-medium font-noto flex items-center justify-center"
            >
              이전으로
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
