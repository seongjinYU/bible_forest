"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * 방향성 화면 전환 셸.
 *
 * 루트 layout 에 ViewTransition 을 그냥 두면 라우트 이동 시 부모·자신이 모두
 * 유지된 채 children 만 바뀌어 React 가 이를 "update"(크로스페이드)로만 처리한다.
 * → enter/exit(nav-forward/nav-back) 가 발동하지 않아 슬라이드가 안 보인다.
 *
 * pathname 을 key 로 줘서 이동마다 ViewTransition 인스턴스를 unmount→mount 시키면
 * exit(이전 화면) + enter(새 화면) 가 발동하고, transitionTypes 에 따라 방향 슬라이드가 적용된다.
 * 태그 없는 이동(어드민·최초 로딩)은 default:"none" 으로 무애니메이션 유지.
 */
export default function TransitionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
