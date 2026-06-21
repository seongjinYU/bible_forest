# API 정의서 + DB 스키마 (v1) — Bible / Tree / Forest / Auth / Admin

> 관련: [backend-decisions.md](./backend-decisions.md) · [db-migration-request.md](./db-migration-request.md)
> 공통 규칙은 backend-decisions 4장(코드 컨벤션) 참고. 모든 응답은 **snake_case**.
> Base URL: `/api/v1` · **DB 스키마는 본 문서 §7 참고**
> 아키텍처: Supabase는 **DB(테이블)로만** 사용, 비즈니스 로직(나무 지급 등)은 **백엔드(Next.js route)** 에서 처리.

## 공통 규약

- **인증**: 쿠키 `user_id` 세션. 미로그인 시 사용자 API는 `401 { "message": "로그인이 필요합니다." }`.
- **어드민 인증**: `admin/*`는 별도 `admin_session` 쿠키(값 `"true"`, 8시간) 사용 — §6 참고. 미인증 시 `403`.
- **공개 엔드포인트(세션 불요)**: `POST /auth/register`, `POST /auth/logout`, `GET /teams`, `POST /admin/login`.
- **에러 포맷**: `{ "message": "<한국어 안내>" }` + HTTP status.
- **상태코드**: 200(조회/수정), 201(생성), 400(검증 실패), 401(미로그인), 403(권한/기간), 404(없음), 500(서버).
- **장수/검증 기준**: `constants/bible.ts`의 `NT_BOOKS`(신약 27권) / `TOTAL_NT_CHAPTERS = 260`.

---

## 1. Bible / Progress

### 1-1. `GET /api/v1/bible/progress`
사용자의 신약 장별 체크 현황 + 요약 조회.

**Request**: 없음 (쿠키 세션)

**Response 200**
```json
{
  "checked": [
    { "book_name": "마태복음", "chapter": 1 },
    { "book_name": "마태복음", "chapter": 2 },
    { "book_name": "마가복음", "chapter": 1 }
  ],
  "total_chapters": 3,
  "total_nt_chapters": 260,
  "trees_earned": 0,
  "next_tree_remaining": 7,
  "completed_one_bible": false,
  "special_tree_earned": false
}
```
- `checked`: 체크된 장만 배열로. FE는 `${book_name}-${chapter}` 키로 매핑해 사용.
- 요약 값들은 **서버 계산값**(FE 계산 금지, A2).

---

### 1-2. `PATCH /api/v1/bible/progress` — 권(book) 단위 replace
한 권의 체크 목록을 통째로 교체한다. 나무 지급/회수까지 처리. (로직은 백엔드에서)

**Request Body**
```json
{ "book_name": "마태복음", "chapters": [1, 2, 3, 5] }
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `book_name` | string | 신약 책 이름 (`NT_BOOKS` 중 하나) |
| `chapters` | int[] | 그 권에서 **현재 체크된 장 전체 목록** (빈 배열 `[]` 이면 그 권 전체 해제) |

**처리 (BE)**
1. 활성 챌린지 기간 검증 (C1) → 기간 밖이면 `403`
2. `book_name`/`chapters` 유효성 → 불일치 시 `400`
3. 그 권의 `bible_progress` **전부 삭제 → 새 목록 insert** (bulk replace)
4. 총 장수 재계산
5. `floor(총장수/10)` 기준 일반 나무 **지급 또는 회수** (A1 변경 — 회수 허용)
6. 260장 기준 특별 나무 **지급 또는 회수**

**Response 200**
```json
{
  "book_name": "마태복음",
  "checked_chapters": [1, 2, 3, 5],
  "total_chapters": 20,
  "total_nt_chapters": 260,
  "trees_earned": 2,
  "next_tree_remaining": 10,
  "completed_one_bible": false,
  "special_tree_earned": false,
  "special_tree_newly_earned": false,
  "newly_earned": [
    { "tree_id": "uuid", "tree_type": "normal", "species": "12", "points": 1 }
  ],
  "reclaimed_count": 0
}
```
- `newly_earned`: 이번 요청으로 새로 획득한 나무(없으면 `[]`).
- `reclaimed_count`: 이번 요청으로 **회수(삭제)된 나무 수**.
- ⚠️ **A1 변경(회수 허용)**: 장수가 줄어 기준 미달이면 `obtained_at` **최신순으로 나무를 회수**(삭제). **배치된 나무·특별나무 포함**, `trees_earned`가 **감소할 수 있음**.
- `species`는 팀 테마에 따른 에셋 키(숫자 문자열). special은 `"special"`.

**에러**
| status | message 예시 | 조건 |
|--------|-------------|------|
| 400 | `"올바르지 않은 책 또는 장입니다."` | 책/장 범위 오류 |
| 400 | `"올바르지 않은 요청입니다."` | 형식 오류 |
| 401 | `"로그인이 필요합니다."` | 미로그인 |
| 403 | `"챌린지 기간이 아닙니다."` | 기간 밖 |

---

### 1-3. `GET /api/v1/bible/status`
누적 장수 / 다음 나무까지 남은 장수 등 요약만 경량 조회.

**Response 200**
```json
{
  "total_chapters": 24,
  "total_nt_chapters": 260,
  "trees_earned": 2,
  "next_tree_remaining": 6,
  "completed_one_bible": false,
  "special_tree_earned": false
}
```
- `next_tree_remaining = (trees_earned + 1) * 10 - total_chapters`
- `completed_one_bible = total_chapters >= 260`

---

## 2. Tree / Placement

### 2-1. `GET /api/v1/trees/inventory`
획득했지만 아직 배치하지 않은 나무 목록(`is_planted=false`).

**Response 200**
```json
{
  "trees": [
    { "tree_id": "uuid", "tree_type": "normal", "species": "pine", "points": 1, "obtained_at": "2026-06-10T05:00:00Z" },
    { "tree_id": "uuid", "tree_type": "special", "species": "special", "points": 0, "obtained_at": "2026-06-12T09:00:00Z" }
  ]
}
```

---

### 2-2. `POST /api/v1/trees/place`
획득한 나무를 숲에 배치(좌표 저장). 배치 시 **z_index(렌더 순서)** 를 DB 시퀀스로 부여.

**Request Body**
```json
{ "tree_id": "uuid", "x": 45.5, "y": 80.2 }
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `tree_id` | string(uuid) | 배치할 나무 ID |
| `x` | number | 가로 위치 %, 0~100 (소수 허용) |
| `y` | number | 세로 위치 %, 0~100 (소수 허용) |

**검증 (BE)**
- 세션 사용자 **본인 소유** 나무인지 (아니면 `403`)
- 이미 배치된(`is_planted=true`) 나무면 `400`
- `0 <= x <= 100`, `0 <= y <= 100` 아니면 `400`

**처리**: `is_planted=true`, `x`, `y`, `planted_at=now()`, `z_index=nextval('tree_z_seq')` 설정.

**Response 201**
```json
{
  "tree": {
    "tree_id": "uuid", "tree_type": "normal", "species": "12",
    "x": 45.5, "y": 80.2, "z_index": 7, "planted_at": "2026-06-10T05:10:00Z"
  }
}
```

**에러**
| status | message 예시 | 조건 |
|--------|-------------|------|
| 400 | `"이미 배치된 나무입니다."` / `"좌표 범위를 벗어났습니다."` | 상태/범위 |
| 403 | `"본인 소유의 나무가 아닙니다."` | 소유권 |
| 404 | `"나무를 찾을 수 없습니다."` | 없는 tree_id |

> ❌ `PATCH /trees/move`(위치 수정) API는 **제공하지 않음**.
> ⚠️ **B3 변경**: 단, 읽기 취소로 나무가 회수될 때는 **배치된 나무도 삭제될 수 있음**(1-2 참고).

---

## 3. Forest (팀 숲 조회)

### 3-1. `GET /api/v1/forests/:team_id`
팀 숲 화면용. 팀 요약 + **배치된 나무 목록(좌표 포함)을 한 번에**(B2). 기간 제약 없음.

**Response 200**
```json
{
  "team": { "id": "uuid", "name": "1팀", "member_count": 12, "tree_count": 34, "total_score": 34 },
  "trees": [
    { "tree_id": "uuid", "species": "12",     "tree_type": "normal",  "x": 45.5, "y": 80.2, "z_index": 7,  "nickname": "홍길동" },
    { "tree_id": "uuid", "species": "special", "tree_type": "special", "x": 12.0, "y": 30.5, "z_index": 12, "nickname": "김철수" }
  ]
}
```
- `trees`: `is_planted=true`인 팀 전체 나무. `nickname`은 심은 사람(표시 선택).
- **`z_index` 오름차순으로 정렬**되어 옴 → 클라이언트는 순서대로 그리면 됨(뒤→앞).
- 미배치 나무는 포함하지 않음.

**에러**: `404 { "message": "팀을 찾을 수 없습니다." }`

> 전체 팀 목록/랭킹은 [`GET /api/v1/teams`](#5-2-get-apiv1teams)(§5-2) 사용. 본 API는 단일 팀 숲 상세용.

---

## 4. Auth (인증)

### 4-1. `POST /api/v1/auth/register`
닉네임 + 팀 선택으로 회원가입. 성공 시 `user_id` 세션 쿠키를 발급해 자동 로그인.

**Request Body**
```json
{ "nickname": "홍길동", "team_id": "uuid" }
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `nickname` | string | 사용자 닉네임 (필수) |
| `team_id` | string(uuid) | 소속 팀 ID (필수, 실재하는 팀) |

**처리 (BE)**
1. `nickname`/`team_id` 누락 → `400`
2. `team_id` 실재 여부 확인 → 없으면 `400`
3. `users` insert
4. `user_id` 쿠키 설정 (`httpOnly`, `sameSite=lax`, `maxAge=60일`, `path=/`)

**Response 201**
```json
{
  "user": {
    "id": "uuid",
    "nickname": "홍길동",
    "team_id": "uuid",
    "is_admin": false,
    "trees_earned": 0,
    "special_tree_earned": false,
    "created_at": "2026-06-10T05:00:00Z"
  }
}
```
- `user`: 생성된 `users` 레코드 전체.

**에러**
| status | message | 조건 |
|--------|---------|------|
| 400 | `"닉네임과 팀을 선택해주세요."` | 필수값 누락 |
| 400 | `"유효하지 않은 팀입니다."` | 존재하지 않는 `team_id` |
| 500 | `"회원가입에 실패했습니다."` | DB insert 실패 |

---

### 4-2. `POST /api/v1/auth/logout`
`user_id` 세션 쿠키 삭제.

**Request**: 없음

**Response 200**
```json
{ "message": "로그아웃 되었습니다." }
```

---

### 4-3. `DELETE /api/v1/auth/withdraw`
회원 탈퇴. 세션 사용자 레코드 삭제 + 세션 쿠키 삭제.

**Request**: 없음 (쿠키 세션)

**처리 (BE)**
1. 세션 검증 → 미로그인 시 `401`
2. `users` 레코드 삭제
3. `user_id` 쿠키 삭제

**Response 200**
```json
{ "message": "탈퇴가 완료되었습니다." }
```

**에러**
| status | message | 조건 |
|--------|---------|------|
| 401 | `"로그인이 필요합니다."` | 미로그인 |
| 500 | `"탈퇴에 실패했습니다."` | DB delete 실패 |

> ⚠️ 현재 `users` 삭제만 수행. 연관 `bible_progress`/`trees`의 정리는 DB 제약(FK cascade, §7)에 따름.

---

## 5. User & Team (사용자 / 팀)

### 5-1. `GET /api/v1/users/me`
로그인 사용자 본인 정보 + 팀명 + 누적 점수 조회.

**Request**: 없음 (쿠키 세션)

**Response 200**
```json
{
  "id": "uuid",
  "nickname": "홍길동",
  "team_id": "uuid",
  "team_name": "1팀",
  "trees_earned": 2,
  "special_tree_earned": false,
  "my_score": 5
}
```
| 필드 | 설명 |
|------|------|
| `team_name` | 소속 팀 이름 (조회 실패 시 `""`) |
| `my_score` | 본인 소유 나무 `points` 합계 (서버 계산값) |

**에러**
| status | message | 조건 |
|--------|---------|------|
| 401 | `"로그인이 필요합니다."` | 미로그인 |

---

### 5-2. `GET /api/v1/teams`
전체 팀 목록 + 팀별 집계(인원/나무 수/점수). `total_score` 내림차순 정렬. 회원가입 팀 선택과 랭킹에 사용.

**인증**: 없음 (공개) — 회원가입 전 팀 선택에 쓰이므로 세션 불요.

**Response 200**
```json
{
  "teams": [
    { "id": "uuid", "name": "1팀", "member_count": 12, "tree_count": 34, "total_score": 34 }
  ]
}
```
| 필드 | 설명 |
|------|------|
| `member_count` | 팀 소속 사용자 수 |
| `tree_count` | 팀 나무 수 |
| `total_score` | 팀 나무 `points` 합계 (정렬 기준, 내림차순) |

**에러**
| status | message | 조건 |
|--------|---------|------|
| 500 | `"팀 정보를 불러올 수 없습니다."` | 조회 실패 |

---

## 6. Admin (어드민)

> 어드민 인증은 사용자 세션과 **별도**. `POST /admin/login`으로 발급되는 `admin_session` 쿠키(값 `"true"`, `httpOnly`, `maxAge=8시간`)를 사용. 어드민 API는 이 쿠키가 없으면 `403`.

### 6-1. `POST /api/v1/admin/login`
어드민 비밀번호 검증 후 `admin_session` 쿠키 발급.

**Request Body**
```json
{ "password": "********" }
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `password` | string | 환경변수 `ADMIN_PASSWORD`와 일치해야 함 |

**Response 200**
```json
{ "message": "로그인 되었습니다." }
```

**에러**
| status | message | 조건 |
|--------|---------|------|
| 401 | `"비밀번호가 올바르지 않습니다."` | 미입력 또는 불일치 |

---

### 6-2. `GET /api/v1/admin/dashboard`
전체 사용자 수 + 팀별 통계(인원/체크 장수/진도율/나무/점수) 조회.

**Request**: 없음 (`admin_session` 쿠키)

**Response 200**
```json
{
  "total_users": 120,
  "teams": [
    {
      "team_id": "uuid",
      "team_name": "1팀",
      "member_count": 12,
      "chapters_checked": 340,
      "progress_rate": 11,
      "tree_count": 34,
      "total_score": 34
    }
  ]
}
```
| 필드 | 설명 |
|------|------|
| `total_users` | 전체 사용자 수 |
| `chapters_checked` | 팀원들의 `bible_progress` 총 체크 수 |
| `progress_rate` | `chapters_checked / (member_count × 260) × 100` 반올림 정수(%) |
| `total_score` | 팀 나무 `points` 합계 |

**에러**
| status | message | 조건 |
|--------|---------|------|
| 403 | `"어드민 권한이 필요합니다."` | `admin_session` 쿠키 없음/불일치 |
| 500 | `"데이터를 불러올 수 없습니다."` | 조회 실패 |

---

## 부록: 엔드포인트 요약

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/v1/bible/progress` | user | 체크 현황 + 요약 |
| PATCH | `/api/v1/bible/progress` | user | 장 체크/해제 + 나무 지급(트랜잭션) |
| GET | `/api/v1/bible/status` | user | 요약만 경량 조회 |
| GET | `/api/v1/trees/inventory` | user | 미배치 나무 목록 |
| POST | `/api/v1/trees/place` | user | 나무 배치(1회성) |
| GET | `/api/v1/forests/:team_id` | user | 팀 숲 상세(요약+배치 나무) |
| POST | `/api/v1/auth/register` | 공개 | 회원가입 + 세션 발급 |
| POST | `/api/v1/auth/logout` | 공개 | 세션 쿠키 삭제 |
| DELETE | `/api/v1/auth/withdraw` | user | 회원 탈퇴 |
| GET | `/api/v1/users/me` | user | 본인 정보 + 점수 |
| GET | `/api/v1/teams` | 공개 | 팀 목록/랭킹 |
| POST | `/api/v1/admin/login` | 공개 | 어드민 로그인 |
| GET | `/api/v1/admin/dashboard` | admin | 어드민 통계 |

> **구현 상태**: §1~6 전체 **구현 완료**. (Bible/Tree/Forest는 배치 PATCH · DB-전용 백엔드 처리 기준)

---

## 7. DB 스키마 (Supabase / Postgres)

> 방침: Supabase는 **DB(테이블)로만** 사용. 나무 지급 등 로직은 백엔드(route)에서 처리하므로 **DB 함수(RPC)는 두지 않는다.**
> 운영 DB 적용(스키마 변경)은 [db-migration-request.md](./db-migration-request.md) 참고.

### 7-1. ERD 개요
```
teams (1) ──< users (1) ──< bible_progress
                  │
                  └──< trees >── (team_id 비정규화)

challenges (활성 1개) ── 읽기 체크 기간 제약에만 사용
```

### 7-2. 테이블 정의

**`teams`**
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | |
| name | text | not null | 팀명 (예: "1팀") |
| created_at | timestamptz | default `now()` | |

**`users`**
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | 세션 쿠키 `user_id` |
| nickname | text | not null | 이름(동명이인 허용) |
| team_id | uuid | FK→teams.id, not null | |
| is_admin | boolean | default false | |
| trees_earned | int | not null default 0 | 총 보유 일반나무 수 (A1 변경: 회수 시 **감소 가능**) |
| special_tree_earned | boolean | not null default false | 1독 특별 나무 수령 여부 |
| created_at | timestamptz | default `now()` | |

**`bible_progress`** — 체크된 장 = 행 1개(존재=체크). 해제 시 행 삭제.
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | |
| user_id | uuid | FK→users.id, not null | |
| book_name | text | not null | 신약 책명 (`NT_BOOKS` 기준) |
| chapter | int | not null | 장 번호 |
| checked_at | timestamptz | default `now()` | |
| | | **UNIQUE(user_id, book_name, chapter)** | 중복 방지 — 백엔드 upsert(멱등성)가 의존 |

인덱스: `idx_bible_progress_user (user_id)`

**`trees`** — 획득한 나무 = 행. 미배치/배치를 `is_planted`로 구분.
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | 요청의 `tree_id` |
| user_id | uuid | FK→users.id, not null | 소유자 |
| team_id | uuid | FK→teams.id, not null | 팀 숲 조회 비정규화 |
| tree_type | text | not null, check in ('normal','special') | |
| species | text | not null | 에셋 종류 키(A4, 백엔드에서 랜덤 결정 후 영구 저장) |
| points | int | not null default 1 | 랭킹 합산 점수(B4) |
| is_planted | boolean | not null default false | false=인벤토리, true=배치됨 |
| x | numeric(5,2) | null | 가로 % 0~100 (B1) |
| y | numeric(5,2) | null | 세로 % 0~100 (B1) |
| obtained_at | timestamptz | default `now()` | 획득 시각 |
| planted_at | timestamptz | null | 배치 시각 |
| z_index | bigint | null | 배치 시 시퀀스(`tree_z_seq`)로 부여 — 렌더 순서. 미배치는 null |

인덱스: `idx_trees_user (user_id)`, `idx_trees_team_planted (team_id, is_planted)`

**`challenges`** — 읽기 체크 기간 제약(C1)용. **활성 챌린지는 항상 1개** 전제.
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | |
| name | text | not null | 챌린지명 |
| start_date | date | not null | 시작일 |
| end_date | date | not null | 종료일 |
| is_active | boolean | not null default false | 진행중 여부(어드민 토글). 백엔드 C1 검증이 이 컬럼에 의존 |
| created_by | uuid | null | 챌린지 생성 어드민(앱 로직 미사용) |
| created_at | timestamptz | default `now()` | |

> ⚠️ **운영 DB 주의**: 운영 `challenges`는 초기에 `is_active` 없이 `created_by`만 있는 형태로 생성되어 있었음. `is_active`는 마이그레이션으로 보강(2026-06-17 적용) — [db-migration-request.md](./db-migration-request.md) #6 참고. 신규 환경 셋업 시 §7-3 DDL이 두 컬럼을 모두 포함.

### 7-3. 셋업 SQL (Supabase) — 테이블·인덱스 (RPC 없음)
> 아래 DDL을 Supabase **SQL Editor**에 붙여넣어 실행하면 셋업 완료. (기존 운영 DB 변경은 [db-migration-request.md](./db-migration-request.md) 참고)
```sql
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists users (
  id                  uuid primary key default gen_random_uuid(),
  nickname            text not null,
  team_id             uuid not null references teams(id),
  is_admin            boolean not null default false,
  trees_earned        int  not null default 0,
  special_tree_earned boolean not null default false,
  created_at          timestamptz default now()
);

create table if not exists bible_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  book_name   text not null,
  chapter     int  not null,
  checked_at  timestamptz default now()
);
create unique index if not exists uq_bible_progress
  on bible_progress(user_id, book_name, chapter);
create index if not exists idx_bible_progress_user on bible_progress(user_id);

create table if not exists trees (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  team_id      uuid not null references teams(id),
  tree_type    text not null check (tree_type in ('normal','special')),
  species      text not null,
  points       int  not null default 1,
  is_planted   boolean not null default false,
  x            numeric(5,2),
  y            numeric(5,2),
  obtained_at  timestamptz default now(),
  planted_at   timestamptz,
  z_index      bigint,
  constraint chk_xy check (
    (is_planted = false) or
    (x between 0 and 100 and y between 0 and 100)
  )
);
create index if not exists idx_trees_user on trees(user_id);
create index if not exists idx_trees_team_planted on trees(team_id, is_planted);

create table if not exists challenges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_by  uuid,
  created_at  timestamptz default now()
);

-- 기존 운영 DB에 challenges가 is_active 없이 존재하던 경우 보강
-- (create table if not exists는 기존 테이블의 컬럼을 추가하지 않으므로 필수)
alter table challenges add column if not exists is_active boolean not null default false;

-- 나무 렌더 순서(z_index): 배치 시점에 시퀀스로 순차 부여
-- (next_tree_z()는 시퀀스 값만 꺼내는 얇은 헬퍼 — 비즈니스 로직 아님)
create sequence if not exists tree_z_seq;
alter table trees add column if not exists z_index bigint;
create or replace function next_tree_z() returns bigint
language sql as $$ select nextval('tree_z_seq'); $$;
```
**테스트 시드 (선택)** — 로컬 테스트용 고정 UUID 데이터. ⚠️ **운영 DB에는 넣지 말 것.**
```sql
insert into teams (id, name)
values ('22222222-2222-2222-2222-222222222222', '1팀')
on conflict (id) do nothing;

insert into users (id, nickname, team_id)
values ('11111111-1111-1111-1111-111111111111', '테스트유저',
        '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- 오늘 날짜가 포함된 활성 챌린지 (읽기 체크 기간 검증 통과용)
insert into challenges (name, start_date, end_date, is_active)
values ('2026 신약 1독 챌린지', '2026-06-01', '2026-08-31', true)
on conflict do nothing;
```

### 7-4. 챌린지 기간 검증 (C1) — 백엔드에서 수행
```sql
select 1 from challenges
where is_active = true
  and current_date between start_date and end_date
limit 1;
-- 결과 없으면 → API 403 "챌린지 기간이 아닙니다."
```
- `PATCH /bible/progress`(읽기 체크)에만 적용. 배치/조회/인벤토리/팀숲 API에는 미적용.

### 7-5. RLS 참고
- 서버는 `SUPABASE_SERVICE_ROLE_KEY`로 접근하여 **RLS를 우회**함 (`src/lib/supabase.ts`).
- 따라서 행 단위 권한(본인 나무만 배치 등)은 **백엔드 코드에서 직접 검증**(세션 user_id ↔ 리소스 user_id 비교).
- 클라이언트가 직접 Supabase에 붙지 않는 구조이므로 RLS는 보조 안전망 수준.
