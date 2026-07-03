import type { Rank } from "@/constants/rankings";

const RAINBOW_GRADIENT = "linear-gradient(135deg, #FF5F6D, #FFC371, #F9F871, #6FE38F, #4FC3F7, #B388FF, #FF6EC7)";

const RANK_STYLE: Record<Rank, { background: string; fg: string }> = {
  B: { background: "#E7E4FB", fg: "#6C5CE7" },
  A: { background: "#FFF1D6", fg: "#E0932C" },
  S: { background: RAINBOW_GRADIENT, fg: "#FFFFFF" },
};

interface RankBadgeProps {
  rank: Rank;
  /** "chip": 텍스트 옆 사각 칩(기본). "overlay": 원형 썸네일 위에 얹는 동그란 배지. */
  variant?: "chip" | "overlay";
}

export default function RankBadge({ rank, variant = "chip" }: RankBadgeProps) {
  const { background, fg } = RANK_STYLE[rank];

  if (variant === "overlay") {
    return (
      <span
        className="flex items-center justify-center w-[20px] h-[20px] rounded-full border-[1.5px] border-white text-[11px] font-bold font-pretendard shrink-0"
        style={{ background, color: fg, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
      >
        {rank}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center h-[18px] px-[6px] rounded-[4px] text-[11px] font-bold font-pretendard shrink-0"
      style={{ background, color: fg }}
    >
      {rank}
    </span>
  );
}
