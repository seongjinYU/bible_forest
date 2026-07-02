import { Plus } from "lucide-react";
import { AVATAR_PALETTE } from "@/constants/avatars";

export interface Participant {
  nickname: string;
  score: number;
  joinedAt: string;
}

export default function ParticipantAvatars({ participants }: { participants: Participant[] }) {
  const shown = participants.slice(0, 4);
  return (
    <div className="flex items-center">
      {shown.map((p, i) => {
        const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
        return (
          <div
            key={i}
            className="w-[24px] h-[24px] rounded-full flex items-center justify-center font-noto text-center"
            style={{
              backgroundColor: bg,
              color: fg,
              marginLeft: i > 0 ? -4 : 0,
              zIndex: i + 1,
              fontWeight: 500,
              fontSize: 13,
              lineHeight: "100%",
              letterSpacing: "-0.03em",
            }}
          >
            {p.nickname[0]}
          </div>
        );
      })}
      <div
        className="w-[24px] h-[24px] rounded-full bg-black flex items-center justify-center"
        style={{ marginLeft: participants.length > 0 ? -4 : 0, zIndex: shown.length + 1 }}
        aria-hidden="true"
      >
        <Plus size={14} className="text-white" />
      </div>
    </div>
  );
}
