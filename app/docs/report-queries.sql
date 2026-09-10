-- =====================================================================
--  팀숲(Bible Forest) 완료 보고서 — 데이터 추출 쿼리 (실제 스키마 반영판)
--  기준: docs/api-spec.md 스키마 + 운영 DB 실측 확인
--
--  [확인 1] ⚠️ 가장 중요 — checked_at은 "그 장을 실제로 읽은 시점"이 아니라
--           "그 권을 마지막으로 저장한 시점"입니다.
--           PATCH /api/v1/bible/progress가 저장 시 그 권 전체를
--           DELETE 후 다시 INSERT하는 구조라서, 이미 예전에 체크해둔 장이라도
--           같은 책에 새 장 하나만 추가로 저장하면 그 책의 기존 장들
--           checked_at까지 전부 오늘 날짜로 갱신됩니다.
--           → 예상하신 "후자" 케이스가 맞습니다. checked_at 기반의
--             날짜/시각 지표는 전부 제거했습니다:
--             [쿼리 2] active_users, chapters 제거 → new_users(가입 추이)만 유지
--             [쿼리 1] active_days, first_read_at, last_read_at 제거
--
--  [확인 2] created_at 타입: bible_progress.checked_at은 timestamptz가 맞습니다.
--           → AT TIME ZONE 'Asia/Seoul' 한 번만 쓰면 됩니다 (원본 쿼리 방식 그대로).
--
--  [확인 3] (user_id, book_name, chapter) 유니크 인덱스가 이미 걸려 있습니다
--           (uq_bible_progress). DB 레벨에서 중복 row 자체가 불가능합니다.
--           원본 쿼리의 dedupe 로직은 안전장치로만 남겨뒀습니다(영향 없음).
--
--  [확인 4] book 컬럼 표기는 "마태"가 아니라 "마태복음"처럼 정식 이름입니다.
--           요한1서/2서/3서도 "요한일서"/"요한이서"/"요한삼서"(한글)입니다.
--           아래 쿼리에 27권 정식 표기로 전부 교체해뒀습니다.
--
--  [확인 5] 실제 컬럼명:
--           - bible_progress.book       → book_name
--           - bible_progress.created_at → checked_at
--           - users.created_at          → 그대로 (맞음)
--           - teams.theme               → 실제로 존재 확인함(운영 DB 조회 완료)
--           - trees.user_id / is_planted → 그대로 (맞음)
--
--  ▸ 제외 대상: 이번 추출에서는 아무도 제외하지 않습니다.
--    (예전에 실제로 있었던 테스트 계정 32개는 이미 삭제 완료했고,
--     실명 계정은 그대로 포함)
--
--  ▸ 기간: 2026-07-01 (배포일) ~ 2026-08-22 (수련회 종료일 8/21 다음날, exclusive)
-- =====================================================================


-- =====================================================================
--  [쿼리 1] 개인별 집계  → CSV ①  (1행 = 1명)
-- =====================================================================
WITH params AS (
  -- KST 자정을 명시적으로 UTC 시각으로 못박아둔다. checked_at/created_at은
  -- timestamptz(UTC 저장)이므로, 그냥 DATE 리터럴과 비교하면 UTC 자정 기준으로
  -- 해석되어 KST 자정과 최대 9시간 어긋난다(예: KST 07-01 00~09시 가입자가
  -- d_start 이전으로 밀려 누락될 수 있음). 아래처럼 타임존을 박아 넣으면
  -- "KST 기준 7/1 00:00 ~ 8/22 00:00 직전"을 정확히 가리키게 된다.
  SELECT (DATE '2026-07-01')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_start,
         (DATE '2026-08-22')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_end   -- 수련회 종료일(8/21) 다음날, KST 기준
),
prog AS (
  -- 장 단위: 유니크 인덱스가 있어 이론상 중복 불가하지만 안전장치로 유지
  SELECT bp.user_id, bp.book_name, bp.chapter, MIN(bp.checked_at) AS checked_at
  FROM bible_progress bp, params
  WHERE bp.checked_at >= params.d_start
    AND bp.checked_at <  params.d_end
  GROUP BY bp.user_id, bp.book_name, bp.chapter
),
tr AS (
  -- 나무(요소) 집계는 유저별 1행으로 먼저 접어야 함 (LEFT JOIN 뻥튀기 방지)
  SELECT t2.user_id,
         COUNT(*)                              AS items_total,
         COUNT(*) FILTER (WHERE t2.is_planted) AS items_planted
  FROM trees t2
  GROUP BY t2.user_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY u.id)                AS user_no,
  t.name                                           AS team,
  t.theme                                          AS team_theme,
  (u.created_at AT TIME ZONE 'Asia/Seoul')         AS joined_at,
  COUNT(p.*)                                       AS total_ch,
  COUNT(*) FILTER (WHERE p.book_name = '마태복음') AS mt_ch,
  COUNT(*) FILTER (WHERE p.book_name = '마가복음') AS mk_ch,
  COUNT(*) FILTER (WHERE p.book_name = '누가복음') AS lk_ch,
  COUNT(*) FILTER (WHERE p.book_name = '요한복음') AS jn_ch,
  COUNT(*) FILTER (WHERE p.book_name IN ('마태복음','마가복음','누가복음','요한복음'))
                                                   AS gospel_ch,   -- 사복음서 합 (89장 만점)
  COALESCE(tr.items_total, 0)                      AS items_total,
  COALESCE(tr.items_planted, 0)                    AS items_planted
FROM users u
LEFT JOIN teams t ON t.id = u.team_id   -- team_id NULL 대비 LEFT JOIN
LEFT JOIN prog p ON p.user_id = u.id
LEFT JOIN tr    ON tr.user_id = u.id
GROUP BY u.id, t.name, t.theme, u.created_at, tr.items_total, tr.items_planted
ORDER BY total_ch DESC;


-- =====================================================================
--  [쿼리 2] 일자별 활동  → CSV ②
--  ⚠️ [확인 1] 결과에 따라 active_users / chapters는 신뢰할 수 없어 제외.
--     new_users(가입 추이)만 제공합니다.
-- =====================================================================
WITH params AS (
  -- d_start_date/d_end_date: generate_series로 KST 날짜 목록을 만드는 용도(순수 날짜).
  -- d_start_ts/d_end_ts: created_at(timestamptz, UTC 저장)과 비교하는 용도.
  --   DATE를 그냥 timestamptz로 캐스팅하면 세션 타임존(보통 UTC) 자정으로 해석되어
  --   KST 자정과 최대 9시간 어긋난다. naive timestamp로 먼저 만든 뒤
  --   AT TIME ZONE 'Asia/Seoul'을 적용해야 "KST 자정의 정확한 UTC 시각"이 된다.
  SELECT DATE '2026-07-01' AS d_start_date,
         DATE '2026-08-22' AS d_end_date,
         (DATE '2026-07-01')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_start_ts,
         (DATE '2026-08-22')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_end_ts
),
d AS (
  SELECT generate_series(params.d_start_date, params.d_end_date - 1, INTERVAL '1 day')::date AS date_kst
  FROM params
),
reg AS (
  SELECT (u.created_at AT TIME ZONE 'Asia/Seoul')::date AS d, COUNT(*) AS nu
  FROM users u, params
  WHERE u.created_at >= params.d_start_ts AND u.created_at < params.d_end_ts
  GROUP BY 1
)
SELECT d.date_kst,
       COALESCE(reg.nu, 0) AS new_users
FROM d
LEFT JOIN reg ON reg.d = d.date_kst
ORDER BY d.date_kst;


-- =====================================================================
--  [쿼리 3] 권별 읽힌 정도  → CSV ③  (신약 27권, 27행)
-- =====================================================================
WITH params AS (
  SELECT (DATE '2026-07-01')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_start,
         (DATE '2026-08-22')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_end
),
prog AS (
  SELECT bp.user_id, bp.book_name, bp.chapter
  FROM bible_progress bp, params
  WHERE bp.checked_at >= params.d_start AND bp.checked_at < params.d_end
  GROUP BY bp.user_id, bp.book_name, bp.chapter
),
nt(ord, book_name, total_ch) AS (VALUES
  (1,'마태복음',28),(2,'마가복음',16),(3,'누가복음',24),(4,'요한복음',21),(5,'사도행전',28),
  (6,'로마서',16),(7,'고린도전서',16),(8,'고린도후서',13),(9,'갈라디아서',6),
  (10,'에베소서',6),(11,'빌립보서',4),(12,'골로새서',4),(13,'데살로니가전서',5),
  (14,'데살로니가후서',3),(15,'디모데전서',6),(16,'디모데후서',4),(17,'디도서',3),
  (18,'빌레몬서',1),(19,'히브리서',13),(20,'야고보서',5),(21,'베드로전서',5),
  (22,'베드로후서',3),(23,'요한일서',5),(24,'요한이서',1),(25,'요한삼서',1),
  (26,'유다서',1),(27,'요한계시록',22)
),
per AS (
  SELECT nt.ord, nt.book_name, nt.total_ch, p.user_id, COUNT(p.*) AS ch
  FROM nt
  LEFT JOIN prog p ON p.book_name = nt.book_name
  GROUP BY nt.ord, nt.book_name, nt.total_ch, p.user_id
)
SELECT ord                                     AS book_order,
       book_name                               AS book,
       total_ch,
       COUNT(user_id)                          AS readers,
       COUNT(*) FILTER (WHERE ch >= total_ch)  AS finishers,
       COALESCE(SUM(ch), 0)                    AS chapters_read
FROM per
GROUP BY ord, book_name, total_ch
ORDER BY ord;


-- =====================================================================
--  [쿼리 4] 검산용 — 퍼널 4숫자 (CSV 파일로 추출하는거 아님, 단순 대조 확인용)
--  사복음서 = 마태복음28 + 마가복음16 + 누가복음24 + 요한복음21 = 89장
--  신약 1독 = 260장
-- =====================================================================
WITH params AS (
  SELECT (DATE '2026-07-01')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_start,
         (DATE '2026-08-22')::timestamp AT TIME ZONE 'Asia/Seoul' AS d_end
),
prog AS (
  SELECT bp.user_id, bp.book_name, bp.chapter
  FROM bible_progress bp, params
  WHERE bp.checked_at >= params.d_start AND bp.checked_at < params.d_end
  GROUP BY bp.user_id, bp.book_name, bp.chapter
),
pu AS (
  SELECT u.id,
         COUNT(p.*) AS total_ch,
         COUNT(*) FILTER (WHERE p.book_name IN ('마태복음','마가복음','누가복음','요한복음')) AS gospel_ch
  FROM users u
  LEFT JOIN prog p ON p.user_id = u.id
  GROUP BY u.id
)
SELECT COUNT(*)                                AS "가입",
       COUNT(*) FILTER (WHERE total_ch > 0)    AS "1장이상",
       COUNT(*) FILTER (WHERE gospel_ch >= 89) AS "사복음서완독",
       COUNT(*) FILTER (WHERE total_ch >= 260) AS "신약1독"
FROM pu;
