-- ============================================================
--  Bible Forest — 백엔드 셋업 SQL (Supabase SQL Editor에 붙여넣어 실행)
--  관련 문서: docs/db-schema.md, docs/api-spec.md, docs/backend-decisions.md
--
--  포함:
--   1) trees / challenges 테이블 + 인덱스
--   2) bible_progress 멱등성용 UNIQUE 인덱스
--   3) pick_random_species()  — 나무 종류 균등 랜덤 (결정 A4)
--   4) check_chapter()        — PATCH /bible/progress 트랜잭션 RPC (A1·A3·A5)
--
--  ⚠️ users / teams / bible_progress 기본 테이블은 feat/auth,admin-api 브랜치에서
--     이미 만든다는 전제. 없다면 db-schema.md의 DDL을 먼저 실행하세요.
-- ============================================================

-- 1) trees -----------------------------------------------------
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

-- 2) challenges ------------------------------------------------
create table if not exists challenges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_at  timestamptz default now()
);

-- 3) bible_progress 멱등성 (중복 체크 방지) --------------------
create unique index if not exists uq_bible_progress
  on bible_progress(user_id, book_name, chapter);

-- 4) 나무 종류 균등 랜덤 (A4 ① 균등 랜덤) ----------------------
--    배열의 키 목록은 FE src/constants/trees.ts 와 반드시 동기화(목록 확정 시 교체).
create or replace function pick_random_species() returns text
language sql
as $$
  select (array['pine','maple','birch','oak','willow'])[floor(random()*5)+1];
$$;

-- 5) check_chapter() — 체크/해제 + 재계산 + 나무 지급 (원자적) --
create or replace function check_chapter(
  p_user_id   uuid,
  p_book_name text,
  p_chapter   int,
  p_checked   boolean
) returns json
language plpgsql
as $$
declare
  v_total       int;
  v_earned      int;     -- 기존 trees_earned (high-water mark)
  v_target      int;     -- floor(total/10)
  v_team_id     uuid;
  v_special     boolean;
  v_special_new boolean := false;
  v_newly       json := '[]'::json;
begin
  -- (1) 체크/해제 — 멱등 처리
  if p_checked then
    insert into bible_progress(user_id, book_name, chapter)
    values (p_user_id, p_book_name, p_chapter)
    on conflict (user_id, book_name, chapter) do nothing;
  else
    delete from bible_progress
    where user_id = p_user_id and book_name = p_book_name and chapter = p_chapter;
  end if;

  -- (2) 사용자 행 잠금 + 현재 상태
  select trees_earned, special_tree_earned, team_id
    into v_earned, v_special, v_team_id
    from users where id = p_user_id
    for update;

  select count(*) into v_total
    from bible_progress where user_id = p_user_id;

  -- (3) 일반 나무 지급 — 단조 증가(A1). 새로 지급된 나무는 CTE로 모아 newly_earned 에 담음.
  v_target := floor(v_total / 10);
  if v_target > v_earned then
    with inserted as (
      insert into trees(user_id, team_id, tree_type, species, points)
      select p_user_id, v_team_id, 'normal', pick_random_species(), 1
      from generate_series(1, v_target - v_earned)
      returning id, tree_type, species, points
    )
    select coalesce(
      json_agg(json_build_object(
        'tree_id', id, 'tree_type', tree_type, 'species', species, 'points', points
      )), '[]'::json)
    into v_newly
    from inserted;

    update users set trees_earned = v_target where id = p_user_id;
    v_earned := v_target;
  end if;

  -- (4) 신약 1독(260장) 특별 나무 — 보너스 점수는 TBD(A5, 임시 0)
  if v_total >= 260 and not v_special then
    insert into trees(user_id, team_id, tree_type, species, points)
    values (p_user_id, v_team_id, 'special', 'special', 0);
    update users set special_tree_earned = true where id = p_user_id;
    v_special := true;
    v_special_new := true;
  end if;

  -- (5) 명세(1-2)와 동일한 모양의 요약 반환
  return json_build_object(
    'total_chapters',            v_total,
    'total_nt_chapters',         260,
    'trees_earned',              v_earned,
    'next_tree_remaining',       (v_earned + 1) * 10 - v_total,
    'completed_one_bible',       v_total >= 260,
    'special_tree_earned',       v_special,
    'special_tree_newly_earned', v_special_new,
    'newly_earned',              v_newly
  );
end;
$$;
