export default function ClosedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-white px-6 text-center gap-3">
      <img src="/assets/forest/9.png" alt="" className="w-[64px] h-[64px] object-contain" />
      <h1 className="text-[20px] font-medium leading-[28px] tracking-[-0.03em] text-[#222222] font-noto">
        서비스가 종료되었습니다.
      </h1>
      <p className="text-[15px] font-normal leading-[140%] tracking-[-0.025em] text-[#666666] font-pretendard">
        그동안 숲을 이용해주셔서 감사합니다!
      </p>
    </div>
  );
}
