# 동시성·타임존 버그 수정 내역

> 대상: `concurrency-checklist.md` 제기 이슈 4건
> 브랜치: BER → dev 머지 예정

---

## 1. 챌린지 기간 타임존 보정 (1순위)

**파일**: `src/app/api/v1/bible/progress/route.ts`

```ts
// 전 — UTC 기준, 한국 자정~오전 9시 사이 날짜 어긋남
const today = new Date().toISOString().slice(0, 10);

// 후 — KST(UTC+9) 보정
const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
```

---

## 2. forests 페이지 타임스탬프 KST 통일 (5순위)

**파일**: `src/app/forests/page.tsx`

```ts
// 전
const now = new Date();
// getHours() 등 로컬 메서드 사용 → 서버 UTC 환경에서 9시간 어긋남

// 후
const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
// getUTCHours() 등 UTC 메서드로 통일 → KST 정확히 표시
```

---

## 3. 닉네임 중복 race condition 처리 (2순위)

**파일**: `src/app/api/v1/auth/register/route.ts`

unique violation(에러코드 `23505`) 발생 시 재조회 후 기존 계정으로 로그인 처리.
동시 가입 요청으로 중복 계정이 생성되는 것을 방지.

> ⚠️ DB 작업 별도 필요 — Supabase SQL Editor에서 실행:
> ```sql
> CREATE UNIQUE INDEX IF NOT EXISTS uq_users_team_nickname
>   ON users(team_id, nickname);
> ```

---

## 4. 팀 테마 Lost Update 방지 (3순위)

**파일**: `src/app/api/v1/teams/[team_id]/theme/route.ts`

```ts
// 전 — 조건 없이 무조건 덮어씀
.update({ theme }).eq('id', team_id)

// 후 — theme이 null인 경우만 업데이트, 0 row면 409 반환
.update({ theme }).eq('id', team_id).is('theme', null)
```

---

## 5. z_index Read-Then-Write race 제거 (4순위)

**파일**: `src/app/api/v1/trees/place/route.ts`

```ts
// 전 — max(z_index) SELECT 후 +1 → 동시 요청 시 같은 값 충돌 가능
const z = (maxRow?.z_index ?? 0) + 1;

// 후 — 밀리초 타임스탬프로 원자적 결정, DB 읽기 제거
const z = Date.now();
```
