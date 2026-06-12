# API 명세 (구현 완료분) — Bible / Tree / Forest

> 기준: 실제 구현·동작 확인된 코드 (2026-06-12)
> 방침: Supabase는 **DB로만** 사용, 비즈니스 로직은 **백엔드(route)** 에서 처리.
> 관련: [api-spec.md](./api-spec.md)(팀 원본 스펙) · [db-migration-request.md](./db-migration-request.md)

## 공통 규약
- **Base URL**: `/api/v1`
- **인증**: 쿠키 `user_id` 세션. 미로그인 시 모든 사용자 API는 `401 { "message": "로그인이 필요합니다." }`
- **에러 포맷**: `{ "message": "<한국어>" }` + HTTP status
- **상태코드**: 200(조회/수정), 201(생성), 400(검증), 401(미로그인), 403(권한/기간), 404(없음), 500(서버)
- 모든 응답 키는 **snake_case**
- 검증 기준: `constants/bible.ts`의 `NT_BOOKS`(신약 27권) / `TOTAL_NT_CHAPTERS = 260`

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
    { "book_name": "마태복음", "chapter": 2 }
  ],
  "total_chapters": 2,
  "total_nt_chapters": 260,
  "trees_earned": 0,
  "next_tree_remaining": 8,
  "completed_one_bible": false,
  "special_tree_earned": false
}
```
- `checked`: 체크된 장만 배열로. 요약값은 서버 계산(A2).

---

### 1-2. `PATCH /api/v1/bible/progress` — **여러 장 한 번에(배치)**
여러 장을 한 번에 읽기 완료/취소 + 나무 지급.

**Request Body (배치)**
```json
{
  "checked": true,
  "chapters": [
    { "book_name": "마태복음", "chapter": 1 },
    { "book_name": "마태복음", "chapter": 2 },
    { "book_name": "마가복음", "chapter": 1 }
  ]
}
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `checked` | boolean | `true`=체크 / `false`=해제 (배치 전체에 적용) |
| `chapters` | array | `{ book_name, chapter }` 목록 (여러 책 혼합 가능) |
| `chapters[].book_name` | string | 신약 책 이름(`NT_BOOKS`) |
| `chapters[].chapter` | int | 1 ~ 그 책의 최대 장수 |

> 하위호환: 단건 `{ "book_name": "마태복음", "chapter": 1, "checked": true }` 도 허용(내부에서 길이 1 배열로 처리).

**처리 (백엔드)**
1. 챌린지 기간 검증(C1) → 기간 밖이면 `403`
2. 각 항목 유효성 검증 → 불일치 시 `400`
3. `checked`에 따라 `bible_progress` upsert(중복 무시) / delete
4. 총 장수 재계산
5. 단조 증가(A1)로 일반 나무를 **한 번에** 지급 (`floor(총장수/10)` 기준)
6. 260장 달성 & 미수령이면 special 나무 지급

**Response 200**
```json
{
  "total_chapters": 20,
  "total_nt_chapters": 260,
  "trees_earned": 2,
  "next_tree_remaining": 10,
  "completed_one_bible": false,
  "special_tree_earned": false,
  "special_tree_newly_earned": false,
  "newly_earned": [
    { "tree_id": "uuid", "tree_type": "normal", "species": "birch", "points": 1 }
  ]
}
```
- `newly_earned`: 이번 요청으로 새로 획득한 나무(없으면 `[]`). 배치로 여러 그루가 한 번에 들어올 수 있음.
- 취소로 장수가 줄어도 `trees_earned`는 감소하지 않음(A1).

**에러**
| status | message 예시 | 조건 |
|--------|-------------|------|
| 400 | `"올바르지 않은 책 또는 장입니다."` | 책/장 범위 오류 |
| 400 | `"체크할 장이 없습니다."` | `chapters` 빈 배열/누락 |
| 401 | `"로그인이 필요합니다."` | 미로그인 |
| 403 | `"챌린지 기간이 아닙니다."` | 기간 밖 |

---

### 1-3. `GET /api/v1/bible/status`
요약만 경량 조회.

**Response 200**
```json
{
  "total_chapters": 20,
  "total_nt_chapters": 260,
  "trees_earned": 2,
  "next_tree_remaining": 10,
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
    { "tree_id": "uuid", "tree_type": "normal", "species": "pine", "points": 1, "obtained_at": "2026-06-12T10:00:00Z" }
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
| `x` | number | 가로 % 0~100 |
| `y` | number | 세로 % 0~100 |

**검증**: 본인 소유(아니면 403) · 이미 배치면 400 · 좌표 범위 0~100(아니면 400) · 없는 ID(404)

**Response 201**
```json
{
  "tree": {
    "tree_id": "uuid", "tree_type": "normal", "species": "pine",
    "x": 45.5, "y": 80.2, "planted_at": "2026-06-12T10:10:00Z"
  }
}
```

**에러**
| status | message 예시 | 조건 |
|--------|-------------|------|
| 400 | `"이미 배치된 나무입니다."` / `"좌표 범위를 벗어났습니다."` | 상태/범위 |
| 403 | `"본인 소유의 나무가 아닙니다."` | 소유권 |
| 404 | `"나무를 찾을 수 없습니다."` | 없는 tree_id |

> ❌ `PATCH /trees/move`, 배치 삭제 API는 제공하지 않음(B3).

---

## 3. Forest

### 3-1. `GET /api/v1/forests/:team_id`
팀 숲 화면용. 팀 요약 + 배치된 나무 목록(좌표 포함)을 한 번에(B2). 기간 제약 없음.

**Response 200**
```json
{
  "team": { "id": "uuid", "name": "1팀", "member_count": 12, "tree_count": 34, "total_score": 34 },
  "trees": [
    { "tree_id": "uuid", "species": "pine", "tree_type": "normal", "x": 45.5, "y": 80.2, "nickname": "홍길동" }
  ]
}
```
- `trees`: `is_planted=true`인 팀 전체 나무. 미배치 나무는 제외.

**에러**: `404 { "message": "팀을 찾을 수 없습니다." }`

---

## 부록: 엔드포인트 요약

| Method | Path | 인증 | 설명 | 상태 |
|--------|------|------|------|------|
| GET | `/api/v1/bible/progress` | user | 체크 현황 + 요약 | ✅ |
| PATCH | `/api/v1/bible/progress` | user | **여러 장 체크/해제(배치) + 나무 지급** | ✅ |
| GET | `/api/v1/bible/status` | user | 요약 경량 조회 | ✅ |
| GET | `/api/v1/trees/inventory` | user | 미배치 나무 목록 | ✅ |
| POST | `/api/v1/trees/place` | user | 나무 배치(1회성) | ✅ |
| GET | `/api/v1/forests/:team_id` | user | 팀 숲 상세 | ✅ |

> 위는 이번에 구현한 사용자 API입니다. 인증/유저/팀/어드민(`auth/register`, `users/me`, `teams`, `admin/*`)은 팀(`feat/auth,admin-api`) 구현분으로, [api-spec.md](./api-spec.md)를 참고하세요.
