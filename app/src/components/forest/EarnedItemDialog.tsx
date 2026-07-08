"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ELEMENT_NAMES } from "@/constants/elements";
import { getSpeciesRank } from "@/constants/rankings";
import type { ThemeKey } from "@/constants/themes";
import RankBadge from "./RankBadge";

interface EarnedItemDialogProps {
  theme: ThemeKey;
  species: string[];
  onClose: () => void;
}

export default function EarnedItemDialog({ theme, species, onClose }: EarnedItemDialogProps) {
  const [index, setIndex] = useState(0);

  const currentSpecies = species[index] ?? null;
  const speciesNum = Number(currentSpecies);
  const isNumbered = !isNaN(speciesNum) && speciesNum > 0;
  const name = isNumbered ? (ELEMENT_NAMES[theme]?.[speciesNum] ?? "") : "";
  const rank = isNumbered ? getSpeciesRank(theme, speciesNum) : null;
  const total = species.length;
  const isLast = index === total - 1;

  function next() {
    if (!isLast) setIndex((i) => i + 1);
    else onClose();
  }

  return (
    <Dialog open={species.length > 0} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="p-0 gap-0 rounded-[12px]">
        <div className="flex items-center justify-end px-4 pt-4">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
            <X size={20} className="text-[#222222]" />
          </button>
        </div>
        <div className="px-5 pb-6 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[20px] font-bold text-[#222222] text-center font-noto leading-snug">
              와! 새로운 아이템을 획득했어요!
            </DialogTitle>
            {total > 1 && (
              <p className="text-[13px] text-[#0FC8B8] font-pretendard font-medium">
                {index + 1} / {total}
              </p>
            )}
            <p className="text-[14px] text-[#888888] text-center font-noto">
              [내 보관함]에서 확인하고 아이템을 심어보세요!
            </p>
          </div>
          <div className="relative">
            <div className="w-[120px] h-[120px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
              {isNumbered && (
                <img
                  src={`/assets/${theme}/${speciesNum}.png`}
                  alt={name}
                  className="w-[80px] h-[80px] object-contain"
                />
              )}
            </div>
            {rank && (
              <div className="absolute bottom-1 right-1">
                <RankBadge rank={rank} variant="overlay" />
              </div>
            )}
          </div>
          {name && (
            <p className="text-[15px] font-pretendard text-[#222222] -mt-2">{name}</p>
          )}
          <button onClick={next} className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto">
            {isLast ? "확인" : "다음"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
