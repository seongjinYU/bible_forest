import { ChevronLeft } from "lucide-react";

interface AppBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
}

export default function AppBar({ title, onBack, right, className = "" }: AppBarProps) {
  return (
    <div className={`h-[60px] flex items-center px-4 ${className}`}>
      {onBack ? (
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center shrink-0"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={24} />
        </button>
      ) : (
        <div className="w-10 h-10 shrink-0" />
      )}

      {title && (
        <h1 className="flex-1 text-center text-[18px] font-medium font-noto">
          {title}
        </h1>
      )}

      <div className="w-10 h-10 flex items-center justify-center shrink-0">
        {right}
      </div>
    </div>
  );
}
