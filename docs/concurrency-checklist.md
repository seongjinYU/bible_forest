# 동시성·타임존 점검 체크리스트

> 작성자: FE 담당 · 대상: BE/DB 담당
> 목적: 두 사용자가 거의 동시에 같은 자원을 건드릴 때 발생하는 race condition 3건과, 서버 시간대(UTC) 관련 버그 1건을 발견했습니다. FE에서는 같은 클라이언트 안에서의 중복 클릭(더블클릭) 방어와 세션 만료 처리까지만 가능하고, 서버에서 실행되는 코드(API route, 서버 컴포넌트)는 손댈 수 없어 정리해서 넘깁니다.

---

## 1. 팀 테마 동시 변경 — `teams.theme` Lost Update

**파일**: `src/app/api/v1/teams/[team_id]/theme/route.ts`

```ts
const { error } = await supabase
  .from('teams')
  .update({ theme })
  .eq('id', team_id)
```

조건 없는 단순 UPDATE라, 같은 팀의 두 멤버가 거의 동시에 다른 테마를 선택하면 **나중에 도착한 요청이 조용히 덮어씁니다.** 둘 다 200 응답을 받으니 먼저 선택한 사람은 자기 선택이 무시된 걸 알 방법이 없습니다.

**요청사항**
- 이미 테마가 설정된 팀은 변경 불가하도록 조건부 업데이트로 변경 (`.is('theme', null)` 등)
- 조건에 안 걸려 0 row가 업데이트되면 409 등으로 "이미 다른 팀원이 설정했습니다" 응답

---

## 2. 나무 배치 z_index — Read-Then-Write Race

**파일**: `src/app/api/v1/trees/place/route.ts` (58~69번 줄)

```ts
// 1) 현재 최대값 조회
const { data: maxRow } = await supabase
  .from("trees")
  .select("z_index")
  .eq("team_id", user.team_id)
  .order("z_index", { ascending: false })
  .limit(1)
  .maybeSingle();
const z = (maxRow?.z_index ?? 0) + 1;   // ← 조회와 쓰기 사이에 시간차 발생

// 2) 쓰기
.update({ ..., z_index: z, ... })
```

같은 팀 두 멤버가 거의 동시에 배치하면 둘 다 같은 `maxRow`를 읽어 같은 `z_index`를 받을 수 있습니다. `is_planted=false` 조건부 업데이트로 "같은 나무 중복 배치"는 막혀 있지만, **서로 다른 나무 2개가 같은 z_index를 갖는 것**은 막지 못합니다(렌더 순서만 영향, 데이터 유실은 아님).

**요청사항**
- `z_index`를 애플리케이션에서 read-then-write로 계산하지 말고, DB 시퀀스나 RPC 함수(`nextval` 또는 팀별 카운터 원자적 증가)로 받도록 변경
- 급하지 않다면 우선순위 가장 낮게 둬도 무방 — 시각적 렌더 순서만 영향, 기능 깨짐은 아님

---

## 3. 닉네임 중복 가입 — TOCTOU + UNIQUE 제약 부재

**파일**: `src/app/api/v1/auth/check-nickname/route.ts` (체크) → `src/app/api/v1/auth/register/route.ts` (등록)

흐름: FE가 `GET check-nickname`으로 중복 확인 → 없으면 `POST register`로 INSERT. 이 두 요청 사이에 다른 사용자가 같은 (team_id, nickname)으로 끼어들면 **중복 계정이 생성됩니다.**

```ts
// register/route.ts 40~51번 줄
if (!user) {
  const { data: created, error } = await supabase
    .from('users')
    .insert({ nickname, team_id })   // ← UNIQUE 제약 없음
    ...
}
```

FE 쪽에서 제출 직전 팀 목록을 재조회해 race window를 줄이는 보강은 해뒀지만(`register/page.tsx`), 근본 차단은 DB 제약만 가능합니다.

**요청사항**
- `users` 테이블에 `UNIQUE(team_id, nickname)` 인덱스 추가
- `insert` 실패 시(unique violation) "이미 사용 중인 닉네임" 같은 명확한 에러 메시지로 매핑해서 응답

---

## 4. 서버 시간대 — UTC 기준으로 동작 중 (한국시간 아님)

**파일 1**: `src/app/api/v1/bible/progress/route.ts` (117번 줄)

```ts
// 5) 챌린지 기간 검증 (C1)
const today = new Date().toISOString().slice(0, 10);
const { data: challenge } = await supabase
  .from("challenges")
  .select("id")
  .eq("is_active", true)
  .lte("start_date", today)
  .gte("end_date", today)
  .limit(1)
  .maybeSingle();
```

`.toISOString()`은 항상 UTC 기준 날짜를 반환합니다. 이 코드는 **API route, 즉 서버에서 실행**되고(`runtime` 명시가 없어 Node 기본 런타임 → 보통 UTC로 동작), 별도 TZ 설정도 없어 `today`가 한국 날짜와 어긋날 수 있습니다.

**구체적 영향**: 한국 시간(KST, UTC+9) 기준 자정~오전 9시 사이에는 `today`가 실제 한국 날짜보다 하루 이전으로 계산됩니다. 챌린지 `start_date`/`end_date` 경계일의 이 시간대에:
- 챌린지가 시작됐는데도 "기간이 아닙니다"(403) 오류가 날 수 있음
- 챌린지가 끝났는데도 9시간 더 인증이 허용될 수 있음

**파일 2**: `src/app/forests/page.tsx` (87~89번 줄)

```ts
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const fetchedAtLabel = `${String(now.getFullYear()).slice(-2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
```

이것도 서버 컴포넌트(`async function`, `"use client"` 없음)라 서버에서 렌더링됩니다. `getHours()` 등 로컬 타임존 메서드를 쓰지만, 서버 프로세스의 로컬 타임존이 한국이 아니라면(UTC 추정) 사용자에게 "26.07.01 22:10:00 기준" 같은 화면 텍스트가 실제 한국 시각과 9시간 어긋나게 표시됩니다. 이쪽은 화면 텍스트만 틀리는 것이라 기능 영향은 없습니다.

**요청사항**
- 배포 환경(Vercel)에 `TZ=Asia/Seoul` 환경변수를 설정하거나
- 코드에서 명시적으로 KST 오프셋(UTC+9)을 적용해 날짜를 계산하도록 변경 (예: `new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)` 또는 `Intl.DateTimeFormat`에 `timeZone: "Asia/Seoul"` 지정)
- 두 파일 다 동일한 방식으로 통일해서 적용 권장

---

## 우선순위 제안

| 순위 | 항목 | 이유 |
|---|---|---|
| 1 | 챌린지 기간(`today`) 타임존 보정 | 챌린지 시작/종료 경계일에 실사용자가 직접 영향받는 기능 버그 |
| 2 | 닉네임 UNIQUE 제약 | 가입 몰리는 시점에 가장 자주 발생할 수 있고, 중복 계정은 이후 데이터 정합성 문제로 번짐 |
| 3 | 테마 조건부 업데이트 | 빈도는 낮지만(팀당 1회성 이벤트) 한쪽 선택이 말없이 사라지는 건 사용자 경험상 치명적 |
| 4 | z_index 원자적 증가 | 영향이 시각적 렌더 순서로 제한적, 급하지 않음 |
| 5 | forests 페이지 타임스탬프 타임존 보정 | 화면 텍스트만 틀림, 기능 영향 없음 |
