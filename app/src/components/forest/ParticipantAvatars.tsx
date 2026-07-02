import { Plus } from "lucide-react";
import { AVATAR_PALETTE } from "@/constants/avatars";

export interface Participant {
  nickname: string;
  score: number;
  joinedAt: string;
}

export default function ParticipantAvatars({ participants }: { participants: Participant[] }) {
  return (
    <div className="flex items-center">
      {participants.slice(0, 4).map((p, i) => {
        const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
        return (
          <div
            key={i}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-semibold font-pretendard"
            style={{ backgroundColor: bg, color: fg, marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}
          >
            {p.nickname[0]}
          </div>
        );
      })}
      <div
        className="w-[30px] h-[30px] rounded-full bg-black flex items-center justify-center"
        style={{ marginLeft: participants.length > 0 ? -8 : 0 }}
        aria-hidden="true"
      >
        <Plus size={14} className="text-white" />
      </div>
    </div>
  );
}
