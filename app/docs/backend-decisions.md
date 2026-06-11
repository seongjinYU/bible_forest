# 백엔드 개발 의사결정 & 개발 가이드

> 대상 API: 성경읽기/달성(Bible·Progress), 나무/배치(Tree·Placement), 팀 숲 조회(Forest)
> 작성 기준: `main` 브랜치 + `feat/auth,admin-api` 브랜치의 기존 구현 컨벤션
> 관련 문서: [api-spec.md](./api-spec.md) · [db-schema.md](./db-schema.md) · [planning.md](./planning.md)

---

## 0. 한눈에 보는 결정 요약

| # | 항목 | 결정 | 상태 |
|---|------|------|------|
| A1 | 체크 취소 시 나무 회수 | **회수하지 않음**(나무 수는 단조 증가, high-water mark) | ✅ 확정(추천안 채택) |
| A2 | 카운트 책임 | **서버가 총 장수·총 나무 수를 계산해서 내려줌**, FE는 표시만 | ✅ 확정 |
| A3 | 지급 트랜잭션 | FE는 "어느 장 체크/해제"만 전송, **BE가 판단 후 1 트랜잭션 처리** | ✅ 확정 |
| A4 | 나무 에셋 랜덤 | **서버 지급 시점에 ① 균등 랜덤으로 결정 후 `species` 컬럼에 저장** | ✅ 확정(① 균등 랜덤) |
| A5 | 1독 보너스 | special 나무 지급은 A3과 동일 트랜잭션, **보너스 점수 값은 추후 확정** | ✅ 확정(점수 TBD) |
| B1 | 좌표 | **% 값(0~100)을 숫자 그대로 저장** | ✅ 확정 |
| B2 | 팀별 배치 나무 | 필요. 단 **팀 숲 조회 API에서 한 번에 반환** | ✅ 확정 |
| B3 | 배치 취소/수정/삭제 | **제공하지 않음**(배치는 1회성·영구) | ✅ 확정 |
| B4 | 점수/랭킹 | 나무 `points` **합산으로 랭킹 산정**(기존 로직 유지) | ✅ 확정 |
| C1 | 챌린지 기간 제약 | **읽기 체크(PATCH)만 기간 제약**, 나머지(배치·조회)는 제약 없음 | ✅ 확정 |
| C2 | 인증 기준 | 쿠키 `user_id` 세션 기준(`getSessionUser`), 모든 API 로그인 필수 | ✅ 확정 |
| C3 | 코드 스타일 | 기존 컨벤션 그대로(아래 4장) | ✅ 확정 |

> 모든 핵심 결정 확정 완료 → API 구현 가능. 미정 항목(에셋 키 목록·점수 값)은 API 제작에 필수 아님(2장 참고).

---

## 1. 논의가 필요했던 항목별 정리 & 의견

### A1. 체크 취소 시 나무 회수 — **회수하지 않음 (추천)**

**문제**: 9장→10장 체크로 나무를 받은 뒤 1장을 해제하면 9장이 됨. 받은 나무를 회수할 것인가?

**의견 (회수하지 않음 권장)**
- B3에서 **배치 취소/삭제를 막기로** 결정했음. 즉 한번 숲에 심은 나무는 좌표가 고정됨.
- 만약 회수를 허용하면 "이미 배치된 나무를 강제로 뽑아야 하는" 모순이 생김 → 숲 시각 데이터가 깨짐.
- 따라서 **나무 보유 수(`trees_earned`)는 단조 증가**시키는 것이 일관적이고 안전함.

**규칙 (high-water mark 방식)**
```
재계산 시:
  target = floor(현재_총_체크_장수 / 10)
  if target > trees_earned:   # 신기록 달성
      (target - trees_earned)그루 지급
      trees_earned = target
  if target <= trees_earned:  # 해제로 줄었거나 동일
      아무 동작 안 함 (회수 X, 재지급 X)
```
- 효과: 잘못 체크 후 해제해도 나무는 유지. 같은 장을 다시 체크해도 **과거 최고치를 넘기 전까지 중복 지급 없음**.
- `다음 나무까지 남은 장수 = (trees_earned + 1) * 10 - 현재_총_체크_장수`

> ✅ **확정**: 추천안(회수 안 함, 단조 증가) 채택. db-schema의 `check_chapter()` RPC가 이 규칙으로 구현됨.

---

### A2. 카운트는 서버가 계산해서 내려준다 — 추가로 전달할 정보

FE가 직접 계산하지 않도록, **PATCH 응답과 status 응답에 다음을 모두 포함**합니다.

| 필드 | 의미 | 어디서 쓰나 |
|------|------|------------|
| `total_chapters` | 현재 누적 체크 장수 | 누적 N장 표시 |
| `total_nt_chapters` | 신약 전체 장수(260, 상수) | "N/260" 진행률 |
| `trees_earned` | 총 보유 나무 수(배치 포함) | 나무 N그루 표시 |
| `next_tree_remaining` | 다음 나무까지 남은 장수 | "앞으로 N장" 안내 |
| `completed_one_bible` | 신약 1독 완료 여부 | 완독 배지 |
| `special_tree_earned` | 특별 나무 수령 여부 | 중복 알림 방지 |
| `newly_earned`(PATCH 한정) | 이번 요청으로 새로 획득한 나무 배열 | 획득 팝업 |

→ FE는 위 값을 **그대로 표시만** 하면 됨. `floor(total/10)` 같은 계산 일절 제거.

---

### A3 & A5. 트랜잭션 — BE가 한 번에 처리

**FE → BE 전송**: "어느 장을 체크/해제했는가" 만.
```json
PATCH /api/v1/bible/progress
{ "book_name": "마태복음", "chapter": 5, "checked": true }
```

**BE 단일 트랜잭션 내 처리 순서**
1. 챌린지 기간 검증 (C1)
2. `book_name`/`chapter` 유효성 검증 (신약 책·장 범위)
3. `bible_progress` insert(체크) 또는 delete(해제)
4. 총 장수 재계산
5. A1 규칙으로 일반 나무 지급 여부·개수 판단 → `trees` insert + `users.trees_earned` 갱신
6. 총 260장 달성 & 미수령이면 special 나무 지급 + `users.special_tree_earned=true`
7. 위 3~6을 **하나의 트랜잭션**으로 커밋 (실패 시 전체 롤백)

> 구현은 **Postgres 함수(RPC)** 로 원자성 보장 권장 → [db-schema.md](./db-schema.md)의 `check_chapter()` 참고.
> 앱 레벨 다단계 쓰기는 중간 실패 시 정합성이 깨지므로 지양.

**보너스 점수(A5)**: special 나무의 `points` 값은 **추후 확정**. 그전까지 상수 `REWARD.SPECIAL_TREE_POINTS = TBD`(임시값)로 두고 한 곳에서만 관리.

---

### A4. 나무 에셋 랜덤 지급 — **① 균등 랜덤 확정** ✅

전제: 여러 나무 에셋 존재. 지급 시점에 **서버가 종류를 결정**하고 `trees.species`(text 키)에 저장. FE는 `species` 키로 에셋을 매핑해 렌더.

- **방식: ① 균등 랜덤** — 에셋 목록에서 동일 확률로 1개 선택. (가중치/덱 방식은 미채택)
- 구현: `db-schema.md`의 `pick_random_species()` 가 균등 랜덤으로 1개 반환.

**공통 구현 포인트**
- 에셋 종류 목록은 **단일 소스**로 관리: `app/src/constants/trees.ts`에 `TREE_SPECIES` 배열 정의 (목록 확정은 미정 — API 제작엔 불필요, 임시 키로 진행 가능).
- special 나무는 랜덤 풀에서 제외(고정 `species`, 예: `"special"`).
- 랜덤 선정은 지급 트랜잭션(RPC) 내부에서 수행해 결과를 `species`에 영구 저장 → 한번 정해지면 변하지 않음.
- **나무 ID는 그루마다 개별 uuid**로 발급되며, 이 ID로 각 나무를 구분/배치함(요청 `tree_id`).

---

### B1. 좌표 저장
- 단위: **% (0~100), 소수 1자리 허용** (예: 45.5). FE [place-tree](../src/app/place-tree/page.tsx)가 이미 % 계산 중.
- DB: `trees.x`, `trees.y` 를 `numeric(5,2)`로 저장(숫자 그대로). 기존 타입의 `x_ratio/y_ratio`는 `x/y`로 명칭 변경.
- 검증: `0 <= x <= 100`, `0 <= y <= 100`.

### B2. 팀 숲 조회
- 별도 "팀별 나무 조회" 엔드포인트를 따로 호출하지 않고, **`GET /api/v1/forests/:team_id` 하나로** 팀 요약 + 배치된 나무 목록(좌표 포함)을 함께 반환.

### B3. 배치 불변
- `POST /trees/place` 만 제공. **move / delete / cancel 엔드포인트 없음.**
- 한번 배치하면 좌표 수정 불가 → FE에서도 수정 UI 비활성.

### B4. 점수/랭킹
- 랭킹 = 팀 보유 나무들의 `points` 합. 기존 [teams](../src/app/api/v1/teams/route.ts) / [admin/dashboard](../src/app/api/v1/admin/dashboard/route.ts) 로직 그대로 유효.
- 일반 나무 `points` 기본값은 상수로 관리(`REWARD.NORMAL_TREE_POINTS`, 기본 1). special 보너스는 TBD(A5).

### C1. 챌린지 기간 제약
- **읽기 체크(PATCH /bible/progress)에만 적용.** 활성 챌린지의 `start_date ~ end_date` 밖이면 거부.
- 나무 배치/조회/인벤토리/팀 숲 조회는 기간 제약 **없음**.
- 활성 챌린지 정보는 `challenges` 테이블(`is_active=true`)에서 조회 → [db-schema.md](./db-schema.md).

### C2. 인증 기준
- 모든 사용자 API는 쿠키 `user_id` 기반 [getSessionUser()](../src/lib/auth.ts) 필수. 없으면 `401 {message}`.
- 어드민 API는 쿠키 `admin_session` 검사(기존과 동일).
- 소유권 검증: 나무 배치 시 해당 `tree_id`가 **본인 소유인지** 반드시 확인.

### C3. 코드 스타일 — 기존 컨벤션 준수 (아래 4장)

---

## 2. 개발 전 반드시 확정해야 할 것 (체크리스트)

**확정 완료 (API 구현 가능)**
- [x] **A1 회수 규칙** — 회수 안 함(단조 증가) 채택
- [x] **A4 랜덤 방식** — ① 균등 랜덤
- [x] `trees.id` 타입 — **그루마다 개별 uuid**, 요청 `tree_id`도 문자열. (명세 예시의 `123`은 예시일 뿐, 이 ID로 나무 구분)

**미정 — API 제작에 필수 아님 (추후 확정, 임시값으로 진행)**
- [ ] `TREE_SPECIES` 에셋 키 목록 (FE 에셋 파일명과 매핑) — 임시 키로 개발 후 교체
- [ ] 일반 나무 `points` 기본값 (임시 1)
- [ ] special 나무 보너스 `points` (A5, 임시 0)
- [ ] 활성 챌린지 운영 전제: 동시 활성 챌린지 1개

---

## 3. 개발자가 참고해야 할 것 (현재 코드 사실관계)

- **백엔드 = Next.js 16 App Router의 `src/app/api/v1/**/route.ts`**. 별도 서버 없음.
- **DB = Supabase(Postgres)**. 서버에서 [createSupabaseServerClient()](../src/lib/supabase.ts)로 `SERVICE_ROLE_KEY` 사용 → **RLS 우회 중**. 즉 권한 검증은 **앱 코드 책임**(소유권/세션 직접 확인 필수).
- 기존 테이블: `teams`, `users`, `bible_progress`, `trees` (타입 [database.ts](../src/types/database.ts)). 이번 작업에서 `trees`에 `species` 추가 + `x_ratio/y_ratio→x/y` 변경, `challenges` 테이블 신설.
- 성경 데이터/총장수: [constants/bible.ts](../src/constants/bible.ts) (`NT_BOOKS`, `TOTAL_NT_CHAPTERS = 260`). **검증·총장수 계산의 단일 기준**.
- 현재 FE는 모두 `localStorage` 기반(`reading_checked`, `reading_trees`, `tree_placements`). 이번 API 연동으로 **교체** 예정 — FE 작업도 수반됨.
- `feat/auth,admin-api` 브랜치가 미머지 상태. 이번 작업은 그 브랜치(또는 머지 후) 기준으로 진행해야 기존 auth 유틸을 재사용할 수 있음.

---

## 4. 코드 컨벤션 (기존 스타일 — C3)

기존 [auth/register](../src/app/api/v1/auth/register/route.ts) 등에서 추출한 규칙. 신규 API도 동일하게.

1. **경로**: `src/app/api/v1/<도메인>/<액션>/route.ts`, App Router `export async function GET/POST/PATCH`.
2. **응답 네이밍**: **snake_case** (`team_id`, `trees_earned`, `book_name`). 요청 바디도 snake_case 권장(`tree_id`, `book_name`).
3. **에러 응답**: `NextResponse.json({ message: '한국어 메시지' }, { status })`. 상태코드 — 400(검증), 401(미로그인), 403(권한/기간), 404, 500.
4. **성공 응답**: 생성은 `201`, 조회/수정은 `200`. 객체를 그대로 또는 `{ key: [...] }` 형태로 반환.
5. **세션**: `const user = await getSessionUser(); if (!user) return 401`.
6. **DB 접근**: `const supabase = createSupabaseServerClient()`. 다중 조회는 `Promise.all`. **다중 쓰기는 RPC로 트랜잭션 처리.**
7. **TS 타입**: `src/types/database.ts`에 테이블 인터페이스 유지·갱신.
8. **상수 재사용**: 성경/팀/에셋 등은 `src/constants/*`에서 import (하드코딩 금지).
