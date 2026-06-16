# 🌳 Bible Forest

신약 성경 1독 챌린지 웹앱. 사용자가 신약 260장을 읽으며 장을 체크하면 **나무**를 얻고, 그 나무를 **팀 숲**에 심어 팀별로 숲을 키워가는 서비스입니다.

- **읽기 체크** → 10장마다 나무 1그루 지급 (260장 완독 시 특별 나무)
- **나무 배치** → 팀 숲의 원하는 좌표에 1회성 배치
- **팀 숲 / 랭킹** → 팀별 나무 수·점수 집계

## 기술 스택

| 영역 | 사용 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 백엔드 | Next.js Route Handlers (`/api/v1/*`) |
| DB | Supabase (Postgres) — **테이블 저장소로만 사용**, 로직은 백엔드에서 처리 |
| 스타일 | Tailwind CSS |
| 배포 | Vercel |

## 프로젝트 구조

```
bible_forest/
├─ app/                # 실제 Next.js 애플리케이션 (작업·배포 기준 디렉토리)
│  ├─ src/app/api/v1/  # 백엔드 API (auth, users, teams, admin, bible, trees, forests)
│  ├─ src/             # 페이지·컴포넌트·lib·types·constants
│  ├─ docs/            # API 명세 / DB 스키마 / 의사결정 문서
│  └─ .env.example     # 환경변수 템플릿
└─ README.md
```

> ⚠️ 모든 명령은 `app/` 디렉토리에서 실행합니다. (`cd app`)

## 빠른 시작

```bash
cd app
npm install
cp .env.example .env.local   # 값 채우기 (아래 환경변수 참고)
npm run dev                  # http://localhost:3000
```

### 환경변수 (`app/.env.local`)

| 키 | 설명 | 노출 |
|----|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키 | 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 (RLS 우회) — **서버 전용, 노출 금지** | 서버 |
| `ADMIN_PASSWORD` | 어드민 로그인 비밀번호 | 서버 |

### DB 셋업

Supabase SQL Editor에서 아래 순서로 실행:

1. **신규 환경**: [`app/docs/api-spec.md`](app/docs/api-spec.md) §7-3 셋업 DDL 실행
2. **기존 운영 DB 변경**: [`app/docs/db-migration-request.md`](app/docs/db-migration-request.md)의 마이그레이션 SQL 실행
3. `PATCH /api/v1/bible/progress`(읽기 체크)는 **활성 챌린지 1건**이 있어야 동작 — `challenges`에 `is_active=true` row 등록 필요

## API

전체 명세: [`app/docs/api-spec.md`](app/docs/api-spec.md)

| 그룹 | 엔드포인트 |
|------|-----------|
| 인증 | `POST /auth/register`, `POST /auth/logout`, `DELETE /auth/withdraw` |
| 사용자/팀 | `GET /users/me`, `GET /teams` |
| 어드민 | `POST /admin/login`, `GET /admin/dashboard` |
| 성경 | `GET·PATCH /bible/progress`, `GET /bible/status` |
| 나무 | `GET /trees/inventory`, `POST /trees/place` |
| 숲 | `GET /forests/:team_id` |

> 개발 중 API를 브라우저에서 직접 눌러볼 수 있는 테스트 페이지: `/api-test`

## 빌드 & 배포 (Vercel)

```bash
cd app
npm run build   # 프로덕션 빌드 검증
```

**Vercel 배포 시 주의 (monorepo):**

1. Vercel 프로젝트 **Root Directory**를 `app` 으로 설정 (저장소 루트가 아님 — lockfile 충돌 방지)
2. 환경변수 4개를 Vercel Project Settings → Environment Variables 에 등록
3. Framework Preset: **Next.js** (자동 감지), Build Command/Output 기본값 사용

## 문서

- [API 명세 + DB 스키마](app/docs/api-spec.md)
- [백엔드 의사결정](app/docs/backend-decisions.md)
- [DB 마이그레이션 요청서](app/docs/db-migration-request.md)
