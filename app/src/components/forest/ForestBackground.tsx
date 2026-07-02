import type { ThemeKey } from "@/constants/themes";
import { getItemDisplaySize } from "@/constants/itemSizes";

export interface PlantedTree {
  species: string;
  x: number;
  y: number;
}

interface ForestBackgroundProps {
  theme: ThemeKey;
  plantedTrees: PlantedTree[];
  className?: string;
}

export default function ForestBackground({ theme, plantedTrees, className }: ForestBackgroundProps) {
  return (
    <div className={className ?? "absolute inset-0"}>
      <img src={`/assets/${theme}/bg.png`} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {plantedTrees.map((tree, i) => {
          const num = Number(tree.species);
          if (isNaN(num) || num <= 0) return null;
          const size = getItemDisplaySize(theme, num);
          return (
            <img
              key={i}
              src={`/assets/${theme}/${num}.png`}
              alt=""
              className="absolute object-contain"
              style={{
                width: size,
                height: size,
                left: `${tree.x}%`,
                top: `${tree.y}%`,
                transform: "translate(-50%, -90%)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
