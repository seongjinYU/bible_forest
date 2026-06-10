# API 정의서 (v1) — Bible / Tree / Forest

> 관련: [backend-decisions.md](./backend-decisions.md) · [db-schema.md](./db-schema.md)
> 공통 규칙은 backend-decisions 4장(코드 컨벤션) 참고. 모든 응답은 **snake_case**.
> Base URL: `/api/v1`

## 공통 규약

- **인증**: 쿠키 `user_id` 세션. 미로그인 시 모든 사용자 API는 `401 { "message": "로그인이 필요합니다." }`.
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

### 1-2. `PATCH /api/v1/bible/progress`
특정 장 읽기 완료/취소. **나무 지급 판단·지급까지 단일 트랜잭션으로 처리**(A3).

**Request Body**
```json
{ "book_name": "마태복음", "chapter": 10, "checked": true }
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `book_name` | string | 신약 책 이름 (`NT_BOOKS` 중 하나) |
| `chapter` | int | 1 ~ 해당 책의 최대 장수 |
| `checked` | boolean | `true`=완료, `false`=취소 |

**처리 (BE, 트랜잭션)** — [db-schema.md](./db-schema.md) `check_chapter()` RPC
1. 활성 챌린지 기간 검증 (C1) → 기간 밖이면 `403`
2. `book_name`/`chapter` 유효성 → 불일치 시 `400`
3. `checked`에 따라 `bible_progress` insert(중복은 무시) / delete
4. 총 장수 재계산
5. A1 규칙(단조 증가)으로 일반 나무 지급
6. 260장 달성 & 미수령이면 special 나무 지급

**Response 200**
```json
{
  "total_chapters": 10,
  "total_nt_chapters": 260,
  "trees_earned": 1,
  "next_tree_remaining": 10,
  "completed_one_bible": false,
  "special_tree_earned": false,
  "newly_earned": [
    { "tree_id": "uuid", "tree_type": "normal", "species": "pine", "points": 1 }
  ]
}
```
- `newly_earned`: 이번 요청으로 새로 획득한 나무(없으면 `[]`). FE 획득 팝업에 사용.
- 취소로 장수가 줄어도 `trees_earned`는 감소하지 않음(A1).

**에러**
| status | message 예시 | 조건 |
|--------|-------------|------|
| 400 | `"올바르지 않은 책 또는 장입니다."` | 책/장 범위 오류 |
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
획득한 나무를 숲에 배치(좌표 저장). **1회성, 이후 수정/취소 불가(B3).**

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

**처리**: `is_planted=true`, `x`, `y`, `planted_at=now()` 설정.

**Response 201**
```json
{
  "tree": {
    "tree_id": "uuid", "tree_type": "normal", "species": "pine",
    "x": 45.5, "y": 80.2, "planted_at": "2026-06-10T05:10:00Z"
  }
}
```

**에러**
| status | message 예시 | 조건 |
|--------|-------------|------|
| 400 | `"이미 배치된 나무입니다."` / `"좌표 범위를 벗어났습니다."` | 상태/범위 |
| 403 | `"본인 소유의 나무가 아닙니다."` | 소유권 |
| 404 | `"나무를 찾을 수 없습니다."` | 없는 tree_id |

> ❌ `PATCH /trees/move`, 배치 삭제 API는 **제공하지 않음**(B3).

---

## 3. Forest (팀 숲 조회)

### 3-1. `GET /api/v1/forests/:team_id`
팀 숲 화면용. 팀 요약 + **배치된 나무 목록(좌표 포함)을 한 번에**(B2). 기간 제약 없음.

**Response 200**
```json
{
  "team": { "id": "uuid", "name": "1팀", "member_count": 12, "tree_count": 34, "total_score": 34 },
  "trees": [
    { "tree_id": "uuid", "species": "pine",   "tree_type": "normal",  "x": 45.5, "y": 80.2, "nickname": "홍길동" },
    { "tree_id": "uuid", "species": "special","tree_type": "special", "x": 12.0, "y": 30.5, "nickname": "김철수" }
  ]
}
```
- `trees`: `is_planted=true`인 팀 전체 나무. `nickname`은 심은 사람(표시 선택).
- 미배치 나무는 포함하지 않음.

**에러**: `404 { "message": "팀을 찾을 수 없습니다." }`

> 전체 팀 목록/랭킹은 기존 [`GET /api/v1/teams`](../src/app/api/v1/teams/route.ts) 사용. 본 API는 단일 팀 숲 상세용.

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

> 기존 구현(참고): `auth/register`, `auth/logout`, `auth/withdraw`, `users/me`, `teams`, `admin/login`, `admin/dashboard`.
