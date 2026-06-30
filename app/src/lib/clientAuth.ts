/**
 * 세션 만료(401) 공통 처리.
 * API 응답이 401이면 로그인이 끊긴 것이므로, 사용자가 작성 중이던 내용을 잃지 않게
 * 안내 후 회원가입/로그인 화면으로 보낸다.
 */
export function handleSessionExpired(): void {
  if (typeof window === "undefined") return;
  alert("로그인이 만료되었어요. 다시 로그인해 주세요.");
  window.location.href = "/register";
}

/** 응답이 401이면 세션 만료 처리를 하고 true를 반환한다. */
export function isSessionExpired(res: Response): boolean {
  if (res.status === 401) {
    handleSessionExpired();
    return true;
  }
  return false;
}
