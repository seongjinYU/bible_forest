# DB 변경 요청서 (마이그레이션)

> 요청자: BER-ryul · 대상: DB/Supabase 담당
> 목적: 새로 구현한 **성경읽기·나무·팀숲 API**(api-spec 1-1~3-1)가 동작하려면 현재 DB에 아래 변경이 필요합니다.
> 방침: **Supabase는 DB(테이블)로만 사용**합니다. 나무 지급 등 로직은 **백엔드(Next.js route)** 에서 처리하므로, DB 함수(RPC)는 요청하지 않습니다. (스키마 변경만 필요)
> 관련 문서: [api-spec.md](./api-spec.md) (§7 DB 스키마) · [backend-decisions.md](./backend-decisions.md)

---

## 0. 한눈에 보는 변경 요약

| # | 대상 | 변경 내용 | 이유(결정) |
|---|------|----------|-----------|
| 1 | `trees` 컬럼 | `x_ratio → x`, `y_ratio → y` **이름 변경** | B1 (좌표 %로 저장) |
| 2 | `trees` 컬럼 | `species` text **추가** | A4 (나무 종류 저장) |
| 3 | `trees` 컬럼 | `x`, `y` 타입 `numeric(5,2)`로 고정 | B1 |
| 4 | `bible_progress` | UNIQUE(user_id, book_name, chapter) **인덱스 추가** | 멱등성(백엔드 upsert가 의존) |
| 5 | `challenges` | 테이블 **신설(없을 경우)** | C1 (읽기 기간 제약) |
| 6 | `challenges` 컬럼 | `is_active` boolean **추가** | C1 백엔드 검증이 의존 (**2026-06-17 운영 적용 완료**) |
| 7 | `trees` 컬럼 + 시퀀스/함수 | `z_index` bigint + `tree_z_seq` 시퀀스 + `next_tree_z()` **추가** | 나무 렌더 순서(배치 시 부여) |

> 🔄 **결정 변경 반영**: 성경 체크는 **권(book) 단위 replace** 방식으로 변경. A1(나무 회수 **허용**), B3(회수 시 **배치된 나무도 삭제 가능**). 상세는 [api-spec.md](./api-spec.md) §1-2.

> ⚠️ **데이터 의미 주의(1번)**: 기존 `x_ratio/y_ratio`가 **0~1 비율**이었다면, 새 `x/y`는 **0~100 퍼센트(%)** 입니다. 이미 배치된 데이터가 있으면 `값 * 100` 변환이 필요합니다. (테스트 단계로 실데이터가 없으면 무시 가능)

> ⚠️ **데이터 의미 주의(6번)**: 운영 `challenges`는 초기에 `is_active` 없이 `created_by` 컬럼만 있는 형태로 생성되어 있었음. `create table if not exists`는 기존 테이블의 컬럼을 추가하지 않으므로, 아래 **5-1) ALTER**로 `is_active`를 별도 보강해야 함. (보강 없으면 `PATCH /bible/progress`가 항상 403)

---

## 1. 실행할 SQL (기존 DB에 안전하게 — 반복 실행 가능)

```sql
-- 1) trees: 좌표 컬럼명 변경 (이미 바뀌어 있으면 건너뜀)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'trees' and column_name = 'x_ratio') then
    alter table trees rename column x_ratio to x;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name = 'trees' and column_name = 'y_ratio') then
    alter table trees rename column y_ratio to y;
  end if;
end $$;

-- 2) trees: species 추가 (기존 행은 임시로 'pine')
alter table trees add column if not exists species text not null default 'pine';

-- 3) trees: 좌표 타입 고정
alter table trees alter column x type numeric(5,2) using x::numeric(5,2);
alter table trees alter column y type numeric(5,2) using y::numeric(5,2);

-- 4) bible_progress: 멱등성 유니크 인덱스 (백엔드 upsert가 이 제약에 의존)
create unique index if not exists uq_bible_progress
  on bible_progress(user_id, book_name, chapter);

-- 5) challenges: 신설 (없을 때만 생성)
create table if not exists challenges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_by  uuid,
  created_at  timestamptz default now()
);

-- 5-1) challenges: is_active 보강 (★필수)
-- 운영 DB에 challenges가 is_active 없이(created_by만) 이미 존재했으므로,
-- create table if not exists로는 컬럼이 안 생긴다. 아래로 명시 보강.
alter table challenges add column if not exists is_active boolean not null default false;

-- 7) trees.z_index + 시퀀스 + 헬퍼 함수 (나무 렌더 순서, 배치 시 부여)
create sequence if not exists tree_z_seq;
alter table trees add column if not exists z_index bigint;
create or replace function next_tree_z() returns bigint
language sql as $$ select nextval('tree_z_seq'); $$;
```

> 💡 나무 지급/체크 로직은 **백엔드 코드**(`src/app/api/v1/bible/progress/route.ts`)에서 처리합니다. DB 함수(`check_chapter` 등)는 필요 없습니다.

---

## 2. 코드(타입) 동반 수정 — `src/types/database.ts`

DB 변경에 맞춰 `Tree` 인터페이스도 수정 필요:

```diff
 export interface Tree {
   id: string
   user_id: string
   team_id: string
   tree_type: 'normal' | 'special'
+  species: string
   points: number
   is_planted: boolean
-  x_ratio: number | null
-  y_ratio: number | null
+  x: number | null
+  y: number | null
   obtained_at: string
   planted_at: string | null
+  z_index: number | null
 }
```

`challenges` 테이블용 인터페이스 추가:
```ts
export interface Challenge {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string | null
  created_at: string
}
```

---

## 3. 활성 챌린지 1건 필요 (읽기 체크 동작 조건)

`PATCH /bible/progress`는 **활성 챌린지 기간 안**에서만 동작합니다(C1). 운영용으로 1건 등록:

```sql
insert into challenges (name, start_date, end_date, is_active)
values ('2026 신약 1독 챌린지', '2026-06-01', '2026-08-31', true);
```

---

## 4. 검증 체크리스트 (적용 후)

- [x] `trees`에 `x`, `y`, `species` 컬럼 존재 — 2026-06-17 검증
- [x] `bible_progress`에 UNIQUE(user_id, book_name, chapter) 존재 — 2026-06-17 검증
- [x] `challenges` 테이블에 **`is_active` 컬럼 존재** — 2026-06-17 보강·검증 (#6)
- [ ] `challenges` 활성 1건 존재 (운영용 — `is_active=true` 챌린지 등록 필요)
- [x] `GET /api/v1/forests/:team_id` 정상 200 — 2026-06-17 검증
- [x] `PATCH /api/v1/bible/progress` 배치 호출 시 나무 정상 지급 — 2026-06-17 검증
- [ ] `trees`에 `z_index` 컬럼 + `tree_z_seq` 시퀀스 + `next_tree_z()` 함수 존재 (#7)
- [ ] 권 단위 replace로 장수 줄였을 때 나무 **회수** 정상 동작 (A1 변경)
- [ ] 나무 배치 시 `z_index` 부여 + `forests`가 z_index 순서로 반환
