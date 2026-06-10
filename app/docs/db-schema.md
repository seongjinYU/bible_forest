# DB 정의서 (Supabase / Postgres)

> 관련: [backend-decisions.md](./backend-decisions.md) · [api-spec.md](./api-spec.md)
> 기존 타입 정의: [src/types/database.ts](../src/types/database.ts)
> 이번 작업 변경점: `trees`에 `species` 추가 · `x_ratio/y_ratio → x/y` 변경 · `challenges` 신설

---

## 1. ERD 개요

```
teams (1) ──< users (1) ──< bible_progress
                  │
                  └──< trees >── (team_id 비정규화)

challenges (활성 1개) ── 읽기 체크 기간 제약에만 사용
```

---

## 2. 테이블 정의

### 2-1. `teams`
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | |
| name | text | not null | 팀명 (예: "1팀") |
| created_at | timestamptz | default `now()` | |

### 2-2. `users`
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | 세션 쿠키 `user_id` |
| nickname | text | not null | 이름(동명이인 허용) |
| team_id | uuid | FK→teams.id, not null | |
| is_admin | boolean | default false | |
| trees_earned | int | not null default 0 | **총 보유 나무 수(단조 증가, A1)** |
| special_tree_earned | boolean | not null default false | 1독 특별 나무 수령 여부 |
| created_at | timestamptz | default `now()` | |

### 2-3. `bible_progress`
**체크된 장 = 행 1개** (존재=체크). 해제 시 행 삭제.
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | |
| user_id | uuid | FK→users.id, not null | |
| book_name | text | not null | 신약 책명 (`NT_BOOKS` 기준) |
| chapter | int | not null | 장 번호 |
| checked_at | timestamptz | default `now()` | |
| | | **UNIQUE(user_id, book_name, chapter)** | 중복 체크 방지(멱등성) |

인덱스: `idx_bible_progress_user (user_id)`

### 2-4. `trees`
획득한 나무 = 행. 미배치/배치를 `is_planted`로 구분(별도 Reward 테이블 없음).
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | 요청의 `tree_id` |
| user_id | uuid | FK→users.id, not null | 소유자 |
| team_id | uuid | FK→teams.id, not null | 팀 숲 조회 비정규화 |
| tree_type | text | not null, check in ('normal','special') | |
| species | text | not null | **에셋 종류 키(A4, 랜덤 결정 후 영구 저장)** |
| points | int | not null default 1 | 랭킹 합산 점수(B4) |
| is_planted | boolean | not null default false | false=인벤토리, true=배치됨 |
| x | numeric(5,2) | null | 가로 % 0~100 (B1) |
| y | numeric(5,2) | null | 세로 % 0~100 (B1) |
| obtained_at | timestamptz | default `now()` | 획득 시각 |
| planted_at | timestamptz | null | 배치 시각 |

인덱스: `idx_trees_user (user_id)`, `idx_trees_team_planted (team_id, is_planted)`

> **변경점**: 기존 [database.ts](../src/types/database.ts)의 `x_ratio/y_ratio`(number\|null) → `x/y`로 변경, `species`(string) 추가. 머지 시 타입도 함께 수정.

### 2-5. `challenges` (신설)
읽기 체크 기간 제약(C1)용. **활성 챌린지는 항상 1개** 전제.
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default `gen_random_uuid()` | |
| name | text | not null | 챌린지명 |
| start_date | date | not null | 시작일 |
| end_date | date | not null | 종료일 |
| is_active | boolean | not null default false | 진행중 여부(어드민 토글) |
| created_at | timestamptz | default `now()` | |

> FE [admin/challenges](../src/app/admin/challenges/page.tsx)의 `startDate/endDate/active`와 매핑(snake_case로 통일).

---

## 3. DDL (Supabase SQL)

```sql
-- teams / users / bible_progress / trees 가 이미 있다면 ALTER만 적용.

-- trees: 컬럼 변경 (신규 환경 기준 전체 정의)
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
  constraint chk_xy check (
    (is_planted = false) or
    (x between 0 and 100 and y between 0 and 100)
  )
);
create index if not exists idx_trees_user on trees(user_id);
create index if not exists idx_trees_team_planted on trees(team_id, is_planted);

-- 기존 trees 가 있을 경우:
-- alter table trees rename column x_ratio to x;
-- alter table trees rename column y_ratio to y;
-- alter table trees add column if not exists species text not null default 'pine';

create table if not exists challenges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_at  timestamptz default now()
);

create unique index if not exists uq_bible_progress
  on bible_progress(user_id, book_name, chapter);
```

---

## 4. 트랜잭션 RPC — `check_chapter()` (A1·A3·A5 핵심)

PATCH `/bible/progress`가 호출. **체크/해제 → 재계산 → 나무 지급**을 원자적으로 처리.

```sql
create or replace function check_chapter(
  p_user_id   uuid,
  p_book_name text,
  p_chapter   int,
  p_checked   boolean
) returns json
language plpgsql
as $$
declare
  v_total    int;
  v_earned   int;   -- 기존 trees_earned (high-water)
  v_target   int;   -- floor(total/10)
  v_team_id  uuid;
  v_special  boolean;
  v_special_new boolean := false;
  v_new      json := '[]'::json;
  v_rows     json;
begin
  -- 1) 체크/해제 (멱등)
  if p_checked then
    insert into bible_progress(user_id, book_name, chapter)
    values (p_user_id, p_book_name, p_chapter)
    on conflict (user_id, book_name, chapter) do nothing;
  else
    delete from bible_progress
    where user_id = p_user_id and book_name = p_book_name and chapter = p_chapter;
  end if;

  -- 2) 사용자 잠금 + 현재 상태
  select trees_earned, special_tree_earned, team_id
    into v_earned, v_special, v_team_id
    from users where id = p_user_id for update;

  select count(*) into v_total from bible_progress where user_id = p_user_id;

  -- 3) 일반 나무 지급 (단조 증가 — A1)
  v_target := floor(v_total / 10);
  if v_target > v_earned then
    insert into trees(user_id, team_id, tree_type, species, points)
    select p_user_id, v_team_id, 'normal', pick_random_species(), 1
    from generate_series(1, v_target - v_earned)
    returning json_build_object(
      'tree_id', id, 'tree_type', tree_type, 'species', species, 'points', points
    );
    -- 위 returning을 모으려면 CTE로 변경(아래 주석 참고)
    update users set trees_earned = v_target where id = p_user_id;
    v_earned := v_target;
  end if;

  -- 4) 신약 1독 특별 나무 (A5, 보너스 점수는 TBD → 임시 0)
  if v_total >= 260 and not v_special then
    insert into trees(user_id, team_id, tree_type, species, points)
    values (p_user_id, v_team_id, 'special', 'special', 0);
    update users set special_tree_earned = true where id = p_user_id;
    v_special := true;
    v_special_new := true;
  end if;

  -- 5) 결과 반환
  return json_build_object(
    'total_chapters',      v_total,
    'total_nt_chapters',   260,
    'trees_earned',        v_earned,
    'next_tree_remaining', (v_earned + 1) * 10 - v_total,
    'completed_one_bible', v_total >= 260,
    'special_tree_earned', v_special,
    'special_tree_newly_earned', v_special_new
    -- 'newly_earned' 는 CTE returning 결과를 합쳐 포함
  );
end;
$$;
```

> **구현 메모**: 새로 지급된 나무 목록(`newly_earned`)을 응답에 담으려면 3단계 insert를 CTE(`with inserted as (insert ... returning ...)`)로 묶어 `json_agg`로 모으세요. 위 코드는 흐름 설명용 스켈레톤입니다.

### 랜덤 종류 선택 — `pick_random_species()` (A4 ① 균등 랜덤 확정)
```sql
create or replace function pick_random_species() returns text
language sql
as $$
  select (array['pine','maple','birch','oak','willow'])[floor(random()*5)+1];
$$;
-- 균등 랜덤 확정. 배열의 에셋 키 목록은 FE constants/trees.ts 와 반드시 동기화(목록 확정 시 교체).
```

---

## 5. 챌린지 기간 검증 (C1)

PATCH `/bible/progress` 진입 시 (RPC 호출 전 또는 RPC 내부에서) 검증:
```sql
select 1 from challenges
where is_active = true
  and current_date between start_date and end_date
limit 1;
-- 결과 없으면 → API 403 "챌린지 기간이 아닙니다."
```
- 배치/조회/인벤토리/팀숲 API에는 적용하지 않음.

---

## 6. RLS 정책 참고
- 서버는 `SERVICE_ROLE_KEY`로 접근하여 **RLS를 우회**함([supabase.ts](../src/lib/supabase.ts)).
- 따라서 행 단위 권한(본인 나무만 배치 등)은 **앱 코드에서 직접 검증**해야 함(세션 user_id ↔ 리소스 user_id 비교).
- 클라이언트가 직접 Supabase에 붙지 않는 구조이므로 RLS는 보조 안전망 수준으로만 검토.
