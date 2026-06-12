-- ============================================================
--  Bible Forest — DB 전체 셋업 (빈 Supabase 프로젝트에 한 번 실행)
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 RUN 하세요.
--
--  방침: Supabase는 "DB(테이블)"로만 사용한다.
--        나무 지급 등 모든 비즈니스 로직은 백엔드(Next.js route)에서 처리하므로
--        DB 함수(RPC)는 만들지 않는다.
--
--  포함: 모든 테이블 + 인덱스 + 테스트용 시드 데이터 1세트
-- ============================================================

-- 1) 테이블 --------------------------------------------------
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
-- 멱등성(중복 체크 방지) — 백엔드 upsert(ignoreDuplicates)가 이 제약에 의존
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
  created_at  timestamptz default now()
);

-- 2) 테스트용 시드 데이터 ------------------------------------
--    고정 UUID로 만들어서, 쿠키 user_id 에 이 값을 넣고 바로 테스트 가능.
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
