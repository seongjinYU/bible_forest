# 팀 숲 성경읽기 백엔드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 16 Route Handlers와 Supabase(PostgreSQL)를 사용해 팀 숲 챌린지 백엔드 API 15개를 구현한다.

**Architecture:** Next.js 16 App Router의 Route Handlers를 API 서버로 사용하고, Supabase를 PostgreSQL 데이터베이스로 연결한다. 인증은 httpOnly 쿠키(`user_id`)에 기반한 커스텀 세션 방식을 사용하며 Supabase Auth는 사용하지 않는다. 모든 DB 접근은 서버사이드 Service Role Key로 수행하여 RLS를 사용하지 않는다.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), TypeScript, @supabase/supabase-js, PostgreSQL (Supabase), Jest + ts-jest (unit tests)

---

## 파일 구조

```
frontend/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── v1/
│   │           ├── auth/
│   │           │   ├── register/route.ts     # POST — 사용자 등록 + user_id 쿠키 발급
│   │           │   ├── logout/route.ts       # POST — user_id 쿠키 삭제
│   │           │   └── withdraw/route.ts     # DELETE — 유저 삭제(Cascade) + 쿠키 삭제
│   │           ├── users/
│   │           │   └── me/route.ts           # GET — 내 정보(팀, 닉네임, 점수) 조회
│   │           ├── teams/
│   │           │   ├── route.ts              # GET — 전체 팀 랭킹
│   │           │   └── [teamId]/
│   │           │       └── forest/route.ts   # GET — 팀 숲 나무 데이터
│   │           ├── admin/
│   │           │   ├── login/route.ts        # POST — 어드민 로그인 (비밀번호 검증)
│   │           │   ├── dashboard/route.ts    # GET — 전체 통계 대시보드
│   │           │   └── challenges/route.ts   # POST — 챌린지 기간 설정
│   │           ├── bible/
│   │           │   ├── progress/route.ts     # GET/PATCH — 장별 체크 현황 조회 및 업데이트
│   │           │   └── status/route.ts       # GET — 누적 장수 및 나무까지 남은 장수
│   │           └── trees/
│   │               ├── inventory/route.ts    # GET — 미배치 나무 목록
│   │               ├── place/route.ts        # POST — 나무 배치 (좌표 저장)
│   │               └── move/route.ts         # PATCH — 배치된 나무 좌표 수정
│   ├── lib/
│   │   ├── supabase.ts       # Supabase 서버 클라이언트 팩토리
│   │   ├── auth.ts           # getCurrentUser / requireUser / requireAdmin 헬퍼
│   │   ├── bible-data.ts     # 신약 27권 책/장 상수 데이터 (총 260장)
│   │   └── tree-rewards.ts   # 나무 지급 계산 로직 (순수 함수)
│   ├── types/
│   │   └── database.ts       # DB 테이블 TypeScript 타입 정의
│   └── __tests__/
│       ├── bible-data.test.ts    # bible-data 합계 검증
│       └── tree-rewards.test.ts  # 나무 지급 로직 유닛 테스트
├── jest.config.ts            # Jest 설정
└── .env.local                # Supabase 환경 변수 (git 제외)
```

---

## Task 1: Supabase 프로젝트 설정 & SQL 스키마 생성

**Files:**
- 없음 (Supabase 대시보드에서 직접 실행)

> **중요:** 이 태스크는 수동 단계를 포함한다. Supabase 대시보드(supabase.com)에서 진행한다.

- [ ] **Step 1: Supabase 프로젝트 생성**

  Supabase 대시보드에서 새 프로젝트 생성.
  프로젝트명: `bible-forest`, DB 비밀번호 안전하게 저장.

- [ ] **Step 2: SQL Editor에서 스키마 생성**

  Supabase 대시보드 → SQL Editor → New Query에 다음 SQL을 붙여넣고 실행:

  ```sql
  -- 팀 테이블
  CREATE TABLE teams (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- 사용자 테이블
  CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname            TEXT NOT NULL,
    team_id             UUID NOT NULL REFERENCES teams(id),
    is_admin            BOOLEAN DEFAULT false,
    trees_earned        INT DEFAULT 0,
    special_tree_earned BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ DEFAULT now()
  );

  -- 챌린지 테이블
  CREATE TABLE challenges (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date   DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- 성경 체크 테이블 (체크된 장만 저장, lazy 방식)
  CREATE TABLE bible_progress (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_name  TEXT NOT NULL,
    chapter    INT NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, book_name, chapter)
  );

  -- 나무 테이블
  CREATE TABLE trees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id     UUID NOT NULL REFERENCES teams(id),
    tree_type   TEXT NOT NULL CHECK (tree_type IN ('normal', 'special')),
    points      INT NOT NULL DEFAULT 1,
    is_planted  BOOLEAN DEFAULT false,
    x_ratio     DOUBLE PRECISION,
    y_ratio     DOUBLE PRECISION,
    obtained_at TIMESTAMPTZ DEFAULT now(),
    planted_at  TIMESTAMPTZ
  );

  -- RLS 비활성화 (모든 접근은 서버사이드 Service Role Key로만)
  ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
  ALTER TABLE bible_progress DISABLE ROW LEVEL SECURITY;
  ALTER TABLE trees DISABLE ROW LEVEL SECURITY;

  -- 팀 시드 데이터 (4팀)
  INSERT INTO teams (name) VALUES ('1팀'), ('2팀'), ('3팀'), ('4팀');
  ```

- [ ] **Step 3: API 키 수집**

  Supabase 대시보드 → Project Settings → API에서:
  - `Project URL` 복사
  - `anon public` 키 복사
  - `service_role` 키 복사 (노출 금지)

---

## Task 2: 의존성 설치 & 환경 변수 설정

**Files:**
- Create: `frontend/.env.local`
- Modify: `frontend/package.json`

- [ ] **Step 1: Supabase 및 테스트 라이브러리 설치**

  ```bash
  cd frontend
  npm install @supabase/supabase-js
  npm install --save-dev jest ts-jest @types/jest
  ```

- [ ] **Step 2: Jest 설정 파일 생성**

  Create: `frontend/jest.config.ts`

  ```typescript
  import type { Config } from 'jest'

  const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
  }

  export default config
  ```

- [ ] **Step 3: .env.local 생성**

  Create: `frontend/.env.local`

  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ADMIN_PASSWORD=your-admin-password
  ```

  > `SUPABASE_SERVICE_ROLE_KEY`와 `ADMIN_PASSWORD`는 절대 클라이언트에 노출되면 안 된다. `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

- [ ] **Step 4: .gitignore 확인**

  `frontend/.gitignore`에 `.env.local`이 포함되어 있는지 확인. 없으면 추가:

  ```
  .env.local
  ```

---

## Task 3: DB 타입 정의

**Files:**
- Create: `frontend/src/types/database.ts`

- [ ] **Step 1: 타입 정의 파일 생성**

  ```typescript
  export type Team = {
    id: string
    name: string
    created_at: string
  }

  export type User = {
    id: string
    nickname: string
    team_id: string
    is_admin: boolean
    trees_earned: number
    special_tree_earned: boolean
    created_at: string
  }

  export type Challenge = {
    id: string
    name: string
    start_date: string
    end_date: string
    created_by: string | null
    created_at: string
  }

  export type BibleProgressRow = {
    id: string
    user_id: string
    book_name: string
    chapter: number
    checked_at: string
  }

  export type Tree = {
    id: string
    user_id: string
    team_id: string
    tree_type: 'normal' | 'special'
    points: number
    is_planted: boolean
    x_ratio: number | null
    y_ratio: number | null
    obtained_at: string
    planted_at: string | null
  }
  ```

---

## Task 4: Supabase 클라이언트 & 인증 헬퍼

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/lib/auth.ts`

- [ ] **Step 1: Supabase 서버 클라이언트 생성**

  Create: `frontend/src/lib/supabase.ts`

  ```typescript
  import { createClient } from '@supabase/supabase-js'

  export function createSupabaseServerClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  ```

- [ ] **Step 2: 인증 헬퍼 생성**

  Create: `frontend/src/lib/auth.ts`

  ```typescript
  import { cookies } from 'next/headers'
  import { createSupabaseServerClient } from './supabase'
  import type { User } from '@/types/database'

  export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    if (!userId) return null

    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    return data ?? null
  }

  export async function requireUser(): Promise<User> {
    const user = await getCurrentUser()
    if (!user) throw new Error('UNAUTHORIZED')
    return user
  }

  export async function isAdminSession(): Promise<boolean> {
    const cookieStore = await cookies()
    return cookieStore.get('admin_session')?.value === 'valid'
  }

  export async function requireAdmin(): Promise<void> {
    const ok = await isAdminSession()
    if (!ok) throw new Error('FORBIDDEN')
  }
  ```

---

## Task 5: 성경 데이터 & 나무 리워드 로직

**Files:**
- Create: `frontend/src/lib/bible-data.ts`
- Create: `frontend/src/lib/tree-rewards.ts`
- Create: `frontend/src/__tests__/bible-data.test.ts`
- Create: `frontend/src/__tests__/tree-rewards.test.ts`

- [ ] **Step 1: 성경 데이터 상수 생성**

  Create: `frontend/src/lib/bible-data.ts`

  ```typescript
  export type BibleBook = {
    name: string
    chapters: number
  }

  export const NEW_TESTAMENT: BibleBook[] = [
    { name: '마태복음', chapters: 28 },
    { name: '마가복음', chapters: 16 },
    { name: '누가복음', chapters: 24 },
    { name: '요한복음', chapters: 21 },
    { name: '사도행전', chapters: 28 },
    { name: '로마서', chapters: 16 },
    { name: '고린도전서', chapters: 16 },
    { name: '고린도후서', chapters: 13 },
    { name: '갈라디아서', chapters: 6 },
    { name: '에베소서', chapters: 6 },
    { name: '빌립보서', chapters: 4 },
    { name: '골로새서', chapters: 4 },
    { name: '데살로니가전서', chapters: 5 },
    { name: '데살로니가후서', chapters: 3 },
    { name: '디모데전서', chapters: 6 },
    { name: '디모데후서', chapters: 4 },
    { name: '디도서', chapters: 3 },
    { name: '빌레몬서', chapters: 1 },
    { name: '히브리서', chapters: 13 },
    { name: '야고보서', chapters: 5 },
    { name: '베드로전서', chapters: 5 },
    { name: '베드로후서', chapters: 3 },
    { name: '요한일서', chapters: 5 },
    { name: '요한이서', chapters: 1 },
    { name: '요한삼서', chapters: 1 },
    { name: '유다서', chapters: 1 },
    { name: '요한계시록', chapters: 22 },
  ]

  export const TOTAL_NT_CHAPTERS = NEW_TESTAMENT.reduce(
    (sum, b) => sum + b.chapters,
    0,
  ) // 260

  export const CHAPTERS_PER_TREE = 10
  ```

- [ ] **Step 2: bible-data 유닛 테스트 작성 후 실행 (실패 확인)**

  Create: `frontend/src/__tests__/bible-data.test.ts`

  ```typescript
  import { NEW_TESTAMENT, TOTAL_NT_CHAPTERS } from '@/lib/bible-data'

  describe('bible-data', () => {
    it('신약 총 장수는 260장이다', () => {
      expect(TOTAL_NT_CHAPTERS).toBe(260)
    })

    it('신약은 27권이다', () => {
      expect(NEW_TESTAMENT).toHaveLength(27)
    })

    it('요한계시록은 22장이다', () => {
      const revelation = NEW_TESTAMENT.find((b) => b.name === '요한계시록')
      expect(revelation?.chapters).toBe(22)
    })
  })
  ```

  ```bash
  cd frontend && npx jest src/__tests__/bible-data.test.ts --no-coverage
  ```

  Expected: PASS (상수가 이미 정의되어 있으므로)

- [ ] **Step 3: 나무 리워드 로직 테스트 작성 (실패 확인)**

  Create: `frontend/src/__tests__/tree-rewards.test.ts`

  ```typescript
  import { calculateTreeRewards } from '@/lib/tree-rewards'

  describe('calculateTreeRewards', () => {
    it('10장 미만이면 새 나무 없음', () => {
      const result = calculateTreeRewards(9, 0, false)
      expect(result.newNormalTrees).toBe(0)
      expect(result.newSpecialTree).toBe(false)
    })

    it('정확히 10장이면 일반 나무 1그루', () => {
      const result = calculateTreeRewards(10, 0, false)
      expect(result.newNormalTrees).toBe(1)
    })

    it('25장 체크, 이미 나무 2그루 → 추가 없음', () => {
      const result = calculateTreeRewards(25, 2, false)
      expect(result.newNormalTrees).toBe(0)
    })

    it('30장 체크, 이미 나무 2그루 → 나무 1그루 추가', () => {
      const result = calculateTreeRewards(30, 2, false)
      expect(result.newNormalTrees).toBe(1)
    })

    it('체크 취소로 9장이 되어도 이미 획득한 나무는 회수 안 함', () => {
      const result = calculateTreeRewards(9, 1, false)
      expect(result.newNormalTrees).toBe(0)
    })

    it('260장 완독 시 특별 나무 지급', () => {
      const result = calculateTreeRewards(260, 26, false)
      expect(result.newSpecialTree).toBe(true)
    })

    it('이미 특별 나무를 받은 경우 중복 지급 없음', () => {
      const result = calculateTreeRewards(260, 26, true)
      expect(result.newSpecialTree).toBe(false)
    })
  })
  ```

  ```bash
  cd frontend && npx jest src/__tests__/tree-rewards.test.ts --no-coverage
  ```

  Expected: FAIL (모듈 미존재)

- [ ] **Step 4: 나무 리워드 로직 구현**

  Create: `frontend/src/lib/tree-rewards.ts`

  ```typescript
  import { CHAPTERS_PER_TREE, TOTAL_NT_CHAPTERS } from './bible-data'

  export type TreeRewardResult = {
    newNormalTrees: number
    newSpecialTree: boolean
  }

  export function calculateTreeRewards(
    totalChecked: number,
    treesEarned: number,
    specialTreeEarned: boolean,
  ): TreeRewardResult {
    const shouldHaveNormal = Math.floor(totalChecked / CHAPTERS_PER_TREE)
    const newNormalTrees = Math.max(0, shouldHaveNormal - treesEarned)
    const newSpecialTree = totalChecked >= TOTAL_NT_CHAPTERS && !specialTreeEarned

    return { newNormalTrees, newSpecialTree }
  }
  ```

- [ ] **Step 5: 테스트 재실행 (통과 확인)**

  ```bash
  cd frontend && npx jest src/__tests__/ --no-coverage
  ```

  Expected: 모든 테스트 PASS

---

## Task 6: Auth APIs — Register, Logout, Withdraw

**Files:**
- Create: `frontend/src/app/api/v1/auth/register/route.ts`
- Create: `frontend/src/app/api/v1/auth/logout/route.ts`
- Create: `frontend/src/app/api/v1/auth/withdraw/route.ts`

- [ ] **Step 1: 디렉토리 생성**

  ```bash
  mkdir -p frontend/src/app/api/v1/auth/register
  mkdir -p frontend/src/app/api/v1/auth/logout
  mkdir -p frontend/src/app/api/v1/auth/withdraw
  ```

- [ ] **Step 2: 사용자 등록 Route Handler 생성**

  Create: `frontend/src/app/api/v1/auth/register/route.ts`

  ```typescript
  import { cookies } from 'next/headers'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function POST(request: Request) {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.nickname !== 'string' || typeof body.team_id !== 'string') {
      return Response.json({ error: '닉네임과 팀 ID가 필요합니다.' }, { status: 400 })
    }

    const nickname = body.nickname.trim()
    if (nickname.length === 0 || nickname.length > 20) {
      return Response.json({ error: '닉네임은 1~20자여야 합니다.' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('id', body.team_id)
      .single()

    if (!team) {
      return Response.json({ error: '존재하지 않는 팀입니다.' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({ nickname, team_id: body.team_id })
      .select()
      .single()

    if (error || !user) {
      return Response.json({ error: '사용자 등록에 실패했습니다.' }, { status: 500 })
    }

    const cookieStore = await cookies()
    cookieStore.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return Response.json({ user }, { status: 201 })
  }
  ```

- [ ] **Step 3: 로그아웃 Route Handler 생성**

  Create: `frontend/src/app/api/v1/auth/logout/route.ts`

  ```typescript
  import { cookies } from 'next/headers'

  export async function POST() {
    const cookieStore = await cookies()
    cookieStore.delete('user_id')
    return Response.json({ message: '로그아웃되었습니다.' })
  }
  ```

- [ ] **Step 4: 회원 탈퇴 Route Handler 생성**

  Create: `frontend/src/app/api/v1/auth/withdraw/route.ts`

  ```typescript
  import { cookies } from 'next/headers'
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function DELETE() {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()
    const { error } = await supabase.from('users').delete().eq('id', user.id)

    if (error) {
      return Response.json({ error: '탈퇴 처리에 실패했습니다.' }, { status: 500 })
    }

    const cookieStore = await cookies()
    cookieStore.delete('user_id')

    return Response.json({ message: '탈퇴가 완료되었습니다.' })
  }
  ```

- [ ] **Step 5: 개발 서버 실행 후 curl로 검증**

  ```bash
  cd frontend && npm run dev &
  sleep 3
  ```

  ```bash
  # 1. 팀 목록 조회 (등록 전 팀 ID 확인용 — Task 7에서 구현되지만 SQL로 미리 ID 확인)
  # Supabase Dashboard > Table Editor > teams 에서 1팀 ID 복사

  # 2. 사용자 등록
  curl -s -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"nickname":"테스트유저","team_id":"<1팀-UUID>"}' \
    -c /tmp/cookies.txt | python3 -m json.tool

  # Expected: {"user": {"id": "...", "nickname": "테스트유저", ...}}

  # 3. 로그아웃
  curl -s -X POST http://localhost:3000/api/v1/auth/logout \
    -b /tmp/cookies.txt -c /tmp/cookies.txt | python3 -m json.tool

  # Expected: {"message": "로그아웃되었습니다."}
  ```

---

## Task 7: User & Team APIs

**Files:**
- Create: `frontend/src/app/api/v1/users/me/route.ts`
- Create: `frontend/src/app/api/v1/teams/route.ts`

- [ ] **Step 1: 디렉토리 생성**

  ```bash
  mkdir -p frontend/src/app/api/v1/users/me
  mkdir -p frontend/src/app/api/v1/teams
  ```

- [ ] **Step 2: 내 정보 조회 Route Handler**

  Create: `frontend/src/app/api/v1/users/me/route.ts`

  ```typescript
  import { getCurrentUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function GET() {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    const { data: team } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', user.team_id)
      .single()

    const { count: treeCount } = await supabase
      .from('trees')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: trees } = await supabase
      .from('trees')
      .select('points')
      .eq('user_id', user.id)

    const myScore = (trees ?? []).reduce((sum, t) => sum + t.points, 0)

    return Response.json({
      id: user.id,
      nickname: user.nickname,
      team,
      my_score: myScore,
      total_trees: treeCount ?? 0,
      trees_earned: user.trees_earned,
      special_tree_earned: user.special_tree_earned,
    })
  }
  ```

- [ ] **Step 3: 전체 팀 랭킹 Route Handler**

  Create: `frontend/src/app/api/v1/teams/route.ts`

  ```typescript
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function GET() {
    const supabase = createSupabaseServerClient()

    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name')

    if (error || !teams) {
      return Response.json({ error: '팀 조회 실패' }, { status: 500 })
    }

    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const { count: memberCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)

        const { data: treesData } = await supabase
          .from('trees')
          .select('points')
          .eq('team_id', team.id)

        const totalScore = (treesData ?? []).reduce((sum, t) => sum + t.points, 0)
        const totalTrees = (treesData ?? []).length

        return {
          id: team.id,
          name: team.name,
          member_count: memberCount ?? 0,
          total_score: totalScore,
          total_trees: totalTrees,
        }
      }),
    )

    const sorted = teamStats.sort((a, b) => b.total_score - a.total_score)
    return Response.json({ teams: sorted })
  }
  ```

- [ ] **Step 4: curl로 검증**

  ```bash
  # 팀 목록 조회
  curl -s http://localhost:3000/api/v1/teams | python3 -m json.tool
  # Expected: {"teams": [{"id":"...","name":"1팀","member_count":0,...}, ...]}

  # 내 정보 조회 (등록된 쿠키 필요 — Task 6 Step 5에서 저장된 /tmp/cookies.txt 사용)
  # 먼저 재등록 후 쿠키 저장
  TEAM_ID=$(curl -s http://localhost:3000/api/v1/teams | python3 -c "import sys,json; print(json.load(sys.stdin)['teams'][0]['id'])")
  curl -s -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"nickname\":\"테스트유저\",\"team_id\":\"$TEAM_ID\"}" \
    -c /tmp/cookies.txt

  curl -s http://localhost:3000/api/v1/users/me -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"id":"...","nickname":"테스트유저","team":{"id":"...","name":"1팀"},...}
  ```

---

## Task 8: Admin Login & Dashboard API

**Files:**
- Create: `frontend/src/app/api/v1/admin/login/route.ts`
- Create: `frontend/src/app/api/v1/admin/dashboard/route.ts`

- [ ] **Step 1: 디렉토리 생성**

  ```bash
  mkdir -p frontend/src/app/api/v1/admin/login
  mkdir -p frontend/src/app/api/v1/admin/dashboard
  mkdir -p frontend/src/app/api/v1/admin/challenges
  ```

- [ ] **Step 2: 어드민 로그인 Route Handler**

  Create: `frontend/src/app/api/v1/admin/login/route.ts`

  ```typescript
  import { cookies } from 'next/headers'

  export async function POST(request: Request) {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.password !== 'string') {
      return Response.json({ error: '비밀번호가 필요합니다.' }, { status: 400 })
    }

    if (body.password !== process.env.ADMIN_PASSWORD) {
      return Response.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'valid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    return Response.json({ message: '어드민 로그인 성공' })
  }
  ```

- [ ] **Step 3: 어드민 대시보드 Route Handler**

  Create: `frontend/src/app/api/v1/admin/dashboard/route.ts`

  ```typescript
  import { requireAdmin } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'
  import { TOTAL_NT_CHAPTERS } from '@/lib/bible-data'

  export async function GET() {
    try {
      await requireAdmin()
    } catch {
      return Response.json({ error: '어드민 권한이 필요합니다.' }, { status: 403 })
    }

    const supabase = createSupabaseServerClient()

    const { data: teams } = await supabase.from('teams').select('id, name')
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { data: activeChallenge } = await supabase
      .from('challenges')
      .select('*')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const teamStats = await Promise.all(
      (teams ?? []).map(async (team) => {
        const { data: members } = await supabase
          .from('users')
          .select('id')
          .eq('team_id', team.id)

        const memberIds = (members ?? []).map((m) => m.id)
        let totalChecked = 0

        if (memberIds.length > 0) {
          const { count } = await supabase
            .from('bible_progress')
            .select('*', { count: 'exact', head: true })
            .in('user_id', memberIds)
          totalChecked = count ?? 0
        }

        const teamTotalChapters = memberIds.length * TOTAL_NT_CHAPTERS
        const completionRate =
          teamTotalChapters > 0
            ? Math.round((totalChecked / teamTotalChapters) * 100) / 100
            : 0

        const { count: totalTrees } = await supabase
          .from('trees')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)

        return {
          id: team.id,
          name: team.name,
          member_count: memberIds.length,
          total_checked_chapters: totalChecked,
          completion_rate: completionRate,
          total_trees: totalTrees ?? 0,
          certification_count: totalChecked,
        }
      }),
    )

    return Response.json({
      teams: teamStats,
      total_users: totalUsers ?? 0,
      active_challenge: activeChallenge,
    })
  }
  ```

- [ ] **Step 4: curl로 검증**

  ```bash
  # 어드민 로그인
  curl -s -X POST http://localhost:3000/api/v1/admin/login \
    -H "Content-Type: application/json" \
    -d '{"password":"your-admin-password"}' \
    -c /tmp/admin-cookies.txt | python3 -m json.tool
  # Expected: {"message": "어드민 로그인 성공"}

  # 대시보드 조회
  curl -s http://localhost:3000/api/v1/admin/dashboard \
    -b /tmp/admin-cookies.txt | python3 -m json.tool
  # Expected: {"teams":[...],"total_users":1,"active_challenge":null}

  # 미로그인 시 403
  curl -s http://localhost:3000/api/v1/admin/dashboard | python3 -m json.tool
  # Expected: {"error": "어드민 권한이 필요합니다."}
  ```

---

## Task 9: Challenges API

**Files:**
- Create: `frontend/src/app/api/v1/admin/challenges/route.ts`

- [ ] **Step 1: 챌린지 Route Handler 생성**

  Create: `frontend/src/app/api/v1/admin/challenges/route.ts`

  ```typescript
  import { requireAdmin } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function POST(request: Request) {
    try {
      await requireAdmin()
    } catch {
      return Response.json({ error: '어드민 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body.name !== 'string' ||
      typeof body.start_date !== 'string' ||
      typeof body.end_date !== 'string'
    ) {
      return Response.json(
        { error: 'name, start_date, end_date가 필요합니다.' },
        { status: 400 },
      )
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(body.start_date) || !datePattern.test(body.end_date)) {
      return Response.json(
        { error: '날짜 형식은 YYYY-MM-DD여야 합니다.' },
        { status: 400 },
      )
    }

    if (body.start_date > body.end_date) {
      return Response.json(
        { error: '시작일이 종료일보다 늦을 수 없습니다.' },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServerClient()
    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        name: body.name.trim(),
        start_date: body.start_date,
        end_date: body.end_date,
      })
      .select()
      .single()

    if (error || !challenge) {
      return Response.json({ error: '챌린지 생성 실패' }, { status: 500 })
    }

    return Response.json({ challenge }, { status: 201 })
  }
  ```

- [ ] **Step 2: curl로 검증**

  ```bash
  curl -s -X POST http://localhost:3000/api/v1/admin/challenges \
    -H "Content-Type: application/json" \
    -d '{"name":"6월 신약 1독 챌린지","start_date":"2026-06-01","end_date":"2026-08-20"}' \
    -b /tmp/admin-cookies.txt | python3 -m json.tool
  # Expected: {"challenge":{"id":"...","name":"6월 신약 1독 챌린지",...}}
  ```

---

## Task 10: Bible Progress GET & Status

**Files:**
- Create: `frontend/src/app/api/v1/bible/progress/route.ts` (GET 부분)
- Create: `frontend/src/app/api/v1/bible/status/route.ts`

- [ ] **Step 1: 디렉토리 생성**

  ```bash
  mkdir -p frontend/src/app/api/v1/bible/progress
  mkdir -p frontend/src/app/api/v1/bible/status
  ```

- [ ] **Step 2: 성경 체크 현황 조회 (GET) Route Handler**

  Create: `frontend/src/app/api/v1/bible/progress/route.ts`

  ```typescript
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'
  import { NEW_TESTAMENT, TOTAL_NT_CHAPTERS } from '@/lib/bible-data'
  import { calculateTreeRewards } from '@/lib/tree-rewards'

  export async function GET() {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    const { data: rows } = await supabase
      .from('bible_progress')
      .select('book_name, chapter')
      .eq('user_id', user.id)

    const checkedMap = new Map<string, Set<number>>()
    for (const row of rows ?? []) {
      if (!checkedMap.has(row.book_name)) {
        checkedMap.set(row.book_name, new Set())
      }
      checkedMap.get(row.book_name)!.add(row.chapter)
    }

    const progress = NEW_TESTAMENT.map((book) => {
      const checked = checkedMap.get(book.name) ?? new Set()
      return {
        book_name: book.name,
        total_chapters: book.chapters,
        checked_chapters: [...checked].sort((a, b) => a - b),
        check_count: checked.size,
      }
    })

    const totalChecked = (rows ?? []).length

    return Response.json({
      progress,
      total_checked: totalChecked,
      total_chapters: TOTAL_NT_CHAPTERS,
    })
  }

  // PATCH는 Task 11에서 추가
  ```

- [ ] **Step 3: 성경 체크 상태 요약 Route Handler**

  Create: `frontend/src/app/api/v1/bible/status/route.ts`

  ```typescript
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'
  import { CHAPTERS_PER_TREE, TOTAL_NT_CHAPTERS } from '@/lib/bible-data'

  export async function GET() {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    const { count: totalChecked } = await supabase
      .from('bible_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const checked = totalChecked ?? 0
    const chaptersToNextTree = CHAPTERS_PER_TREE - (checked % CHAPTERS_PER_TREE)
    const chaptersToNextTreeActual = chaptersToNextTree === CHAPTERS_PER_TREE ? 0 : chaptersToNextTree

    return Response.json({
      total_checked: checked,
      trees_earned: user.trees_earned,
      chapters_to_next_tree: chaptersToNextTreeActual,
      special_tree_earned: user.special_tree_earned,
      chapters_to_completion: Math.max(0, TOTAL_NT_CHAPTERS - checked),
    })
  }
  ```

- [ ] **Step 4: curl로 검증**

  ```bash
  # (쿠키 재등록 필요 시 Task 7 Step 4 참고)
  curl -s http://localhost:3000/api/v1/bible/progress -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"progress":[{"book_name":"마태복음","total_chapters":28,"checked_chapters":[],...}],...}

  curl -s http://localhost:3000/api/v1/bible/status -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"total_checked":0,"trees_earned":0,"chapters_to_next_tree":0,...}
  ```

---

## Task 11: Bible Progress PATCH — 체크 업데이트 + 나무 지급

**Files:**
- Modify: `frontend/src/app/api/v1/bible/progress/route.ts`

PATCH 요청 형식:
```json
{
  "updates": [
    { "book_name": "마태복음", "chapter": 1, "is_checked": true },
    { "book_name": "마태복음", "chapter": 2, "is_checked": false }
  ]
}
```

- [ ] **Step 1: PATCH 핸들러를 progress/route.ts에 추가**

  현재 `frontend/src/app/api/v1/bible/progress/route.ts` 파일 끝에 다음을 추가한다.
  파일 전체를 아래로 교체:

  ```typescript
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'
  import { NEW_TESTAMENT, TOTAL_NT_CHAPTERS } from '@/lib/bible-data'
  import { calculateTreeRewards } from '@/lib/tree-rewards'

  export async function GET() {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    const { data: rows } = await supabase
      .from('bible_progress')
      .select('book_name, chapter')
      .eq('user_id', user.id)

    const checkedMap = new Map<string, Set<number>>()
    for (const row of rows ?? []) {
      if (!checkedMap.has(row.book_name)) {
        checkedMap.set(row.book_name, new Set())
      }
      checkedMap.get(row.book_name)!.add(row.chapter)
    }

    const progress = NEW_TESTAMENT.map((book) => {
      const checked = checkedMap.get(book.name) ?? new Set()
      return {
        book_name: book.name,
        total_chapters: book.chapters,
        checked_chapters: [...checked].sort((a, b) => a - b),
        check_count: checked.size,
      }
    })

    return Response.json({
      progress,
      total_checked: (rows ?? []).length,
      total_chapters: TOTAL_NT_CHAPTERS,
    })
  }

  type UpdateItem = { book_name: string; chapter: number; is_checked: boolean }

  function validateUpdates(updates: unknown): updates is UpdateItem[] {
    if (!Array.isArray(updates)) return false
    return updates.every(
      (u) =>
        typeof u === 'object' &&
        u !== null &&
        typeof u.book_name === 'string' &&
        typeof u.chapter === 'number' &&
        typeof u.is_checked === 'boolean',
    )
  }

  export async function PATCH(request: Request) {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || !validateUpdates(body.updates)) {
      return Response.json(
        { error: 'updates 배열이 필요합니다. 각 항목은 book_name, chapter, is_checked를 포함해야 합니다.' },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServerClient()

    // 유효한 책/장 검증
    const validBookMap = new Map(NEW_TESTAMENT.map((b) => [b.name, b.chapters]))
    for (const update of body.updates) {
      const maxChapter = validBookMap.get(update.book_name)
      if (!maxChapter) {
        return Response.json({ error: `올바르지 않은 책 이름: ${update.book_name}` }, { status: 400 })
      }
      if (update.chapter < 1 || update.chapter > maxChapter) {
        return Response.json(
          { error: `${update.book_name}의 장 범위는 1~${maxChapter}입니다.` },
          { status: 400 },
        )
      }
    }

    // 체크/체크해제 처리
    const toCheck = body.updates.filter((u: UpdateItem) => u.is_checked)
    const toUncheck = body.updates.filter((u: UpdateItem) => !u.is_checked)

    if (toCheck.length > 0) {
      await supabase.from('bible_progress').upsert(
        toCheck.map((u: UpdateItem) => ({
          user_id: user.id,
          book_name: u.book_name,
          chapter: u.chapter,
        })),
        { onConflict: 'user_id,book_name,chapter', ignoreDuplicates: true },
      )
    }

    for (const u of toUncheck) {
      await supabase
        .from('bible_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('book_name', u.book_name)
        .eq('chapter', u.chapter)
    }

    // 업데이트 후 총 체크 수
    const { count: totalChecked } = await supabase
      .from('bible_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // 나무 리워드 계산 (체크 취소 시 나무는 회수하지 않음)
    const { newNormalTrees, newSpecialTree } = calculateTreeRewards(
      totalChecked ?? 0,
      user.trees_earned,
      user.special_tree_earned,
    )

    const grantedTrees: Array<{ tree_type: string; points: number }> = []

    if (newNormalTrees > 0) {
      const normalTreeRows = Array.from({ length: newNormalTrees }, () => ({
        user_id: user.id,
        team_id: user.team_id,
        tree_type: 'normal',
        points: 1,
      }))

      const { data: insertedTrees } = await supabase
        .from('trees')
        .insert(normalTreeRows)
        .select('tree_type, points')

      grantedTrees.push(...(insertedTrees ?? []))

      await supabase
        .from('users')
        .update({ trees_earned: user.trees_earned + newNormalTrees })
        .eq('id', user.id)
    }

    if (newSpecialTree) {
      const { data: specialTree } = await supabase
        .from('trees')
        .insert({ user_id: user.id, team_id: user.team_id, tree_type: 'special', points: 10 })
        .select('tree_type, points')
        .single()

      if (specialTree) grantedTrees.push(specialTree)

      await supabase
        .from('users')
        .update({ special_tree_earned: true })
        .eq('id', user.id)
    }

    return Response.json({
      total_checked: totalChecked ?? 0,
      granted_trees: grantedTrees,
      message:
        grantedTrees.length > 0
          ? `나무 ${grantedTrees.length}그루를 획득했습니다!`
          : '체크 상태가 업데이트되었습니다.',
    })
  }
  ```

- [ ] **Step 2: curl로 검증**

  ```bash
  # 마태복음 1~12장 체크 (10장마다 나무 1그루 → 나무 1그루 획득 예상)
  curl -s -X PATCH http://localhost:3000/api/v1/bible/progress \
    -H "Content-Type: application/json" \
    -d '{
      "updates": [
        {"book_name":"마태복음","chapter":1,"is_checked":true},
        {"book_name":"마태복음","chapter":2,"is_checked":true},
        {"book_name":"마태복음","chapter":3,"is_checked":true},
        {"book_name":"마태복음","chapter":4,"is_checked":true},
        {"book_name":"마태복음","chapter":5,"is_checked":true},
        {"book_name":"마태복음","chapter":6,"is_checked":true},
        {"book_name":"마태복음","chapter":7,"is_checked":true},
        {"book_name":"마태복음","chapter":8,"is_checked":true},
        {"book_name":"마태복음","chapter":9,"is_checked":true},
        {"book_name":"마태복음","chapter":10,"is_checked":true},
        {"book_name":"마태복음","chapter":11,"is_checked":true},
        {"book_name":"마태복음","chapter":12,"is_checked":true}
      ]
    }' \
    -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"total_checked":12,"granted_trees":[{"tree_type":"normal","points":1}],"message":"나무 1그루를 획득했습니다!"}

  # 1장 체크 취소 (나무는 회수 안 됨)
  curl -s -X PATCH http://localhost:3000/api/v1/bible/progress \
    -H "Content-Type: application/json" \
    -d '{"updates":[{"book_name":"마태복음","chapter":1,"is_checked":false}]}' \
    -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"total_checked":11,"granted_trees":[],"message":"체크 상태가 업데이트되었습니다."}
  ```

---

## Task 12: Team Forest API & Tree APIs

**Files:**
- Create: `frontend/src/app/api/v1/teams/[teamId]/forest/route.ts`
- Create: `frontend/src/app/api/v1/trees/inventory/route.ts`
- Create: `frontend/src/app/api/v1/trees/place/route.ts`
- Create: `frontend/src/app/api/v1/trees/move/route.ts`

- [ ] **Step 1: 디렉토리 생성**

  ```bash
  mkdir -p "frontend/src/app/api/v1/teams/[teamId]/forest"
  mkdir -p frontend/src/app/api/v1/trees/inventory
  mkdir -p frontend/src/app/api/v1/trees/place
  mkdir -p frontend/src/app/api/v1/trees/move
  ```

- [ ] **Step 2: 팀 숲 데이터 Route Handler**

  Create: `frontend/src/app/api/v1/teams/[teamId]/forest/route.ts`

  ```typescript
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function GET(
    _request: Request,
    { params }: { params: Promise<{ teamId: string }> },
  ) {
    const { teamId } = await params
    const supabase = createSupabaseServerClient()

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return Response.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 })
    }

    const { data: trees } = await supabase
      .from('trees')
      .select('id, tree_type, points, is_planted, x_ratio, y_ratio, obtained_at, planted_at, user_id')
      .eq('team_id', teamId)
      .eq('is_planted', true)

    const plantedTrees = await Promise.all(
      (trees ?? []).map(async (tree) => {
        const { data: user } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', tree.user_id)
          .single()

        return {
          id: tree.id,
          tree_type: tree.tree_type,
          points: tree.points,
          x_ratio: tree.x_ratio,
          y_ratio: tree.y_ratio,
          planted_by: user?.nickname ?? '알 수 없음',
          planted_at: tree.planted_at,
        }
      }),
    )

    const { data: allTeamTrees } = await supabase
      .from('trees')
      .select('points')
      .eq('team_id', teamId)

    const totalScore = (allTeamTrees ?? []).reduce((sum, t) => sum + t.points, 0)

    return Response.json({
      team,
      trees: plantedTrees,
      total_score: totalScore,
    })
  }
  ```

- [ ] **Step 3: 미배치 나무 목록 Route Handler**

  Create: `frontend/src/app/api/v1/trees/inventory/route.ts`

  ```typescript
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function GET() {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    const { data: trees } = await supabase
      .from('trees')
      .select('id, tree_type, points, obtained_at')
      .eq('user_id', user.id)
      .eq('is_planted', false)
      .order('obtained_at', { ascending: true })

    return Response.json({
      trees: trees ?? [],
      count: (trees ?? []).length,
    })
  }
  ```

- [ ] **Step 4: 나무 배치 Route Handler**

  Create: `frontend/src/app/api/v1/trees/place/route.ts`

  ```typescript
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function POST(request: Request) {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body.tree_id !== 'string' ||
      typeof body.x_ratio !== 'number' ||
      typeof body.y_ratio !== 'number'
    ) {
      return Response.json(
        { error: 'tree_id, x_ratio, y_ratio가 필요합니다.' },
        { status: 400 },
      )
    }

    if (body.x_ratio < 0 || body.x_ratio > 1 || body.y_ratio < 0 || body.y_ratio > 1) {
      return Response.json(
        { error: 'x_ratio와 y_ratio는 0~1 사이여야 합니다.' },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServerClient()

    const { data: tree } = await supabase
      .from('trees')
      .select('id, user_id, is_planted')
      .eq('id', body.tree_id)
      .single()

    if (!tree) {
      return Response.json({ error: '나무를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (tree.user_id !== user.id) {
      return Response.json({ error: '본인 소유의 나무만 배치할 수 있습니다.' }, { status: 403 })
    }

    if (tree.is_planted) {
      return Response.json({ error: '이미 배치된 나무입니다. 이동은 /trees/move를 사용하세요.' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('trees')
      .update({
        is_planted: true,
        x_ratio: body.x_ratio,
        y_ratio: body.y_ratio,
        planted_at: new Date().toISOString(),
      })
      .eq('id', body.tree_id)
      .select()
      .single()

    if (error || !updated) {
      return Response.json({ error: '나무 배치 실패' }, { status: 500 })
    }

    return Response.json({ tree: updated }, { status: 200 })
  }
  ```

- [ ] **Step 5: 나무 이동 Route Handler**

  Create: `frontend/src/app/api/v1/trees/move/route.ts`

  ```typescript
  import { requireUser } from '@/lib/auth'
  import { createSupabaseServerClient } from '@/lib/supabase'

  export async function PATCH(request: Request) {
    let user
    try {
      user = await requireUser()
    } catch {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body.tree_id !== 'string' ||
      typeof body.x_ratio !== 'number' ||
      typeof body.y_ratio !== 'number'
    ) {
      return Response.json(
        { error: 'tree_id, x_ratio, y_ratio가 필요합니다.' },
        { status: 400 },
      )
    }

    if (body.x_ratio < 0 || body.x_ratio > 1 || body.y_ratio < 0 || body.y_ratio > 1) {
      return Response.json(
        { error: 'x_ratio와 y_ratio는 0~1 사이여야 합니다.' },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServerClient()

    const { data: tree } = await supabase
      .from('trees')
      .select('id, user_id, is_planted')
      .eq('id', body.tree_id)
      .single()

    if (!tree) {
      return Response.json({ error: '나무를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (tree.user_id !== user.id) {
      return Response.json({ error: '본인 소유의 나무만 이동할 수 있습니다.' }, { status: 403 })
    }

    if (!tree.is_planted) {
      return Response.json({ error: '아직 배치되지 않은 나무입니다. 배치는 /trees/place를 사용하세요.' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('trees')
      .update({ x_ratio: body.x_ratio, y_ratio: body.y_ratio })
      .eq('id', body.tree_id)
      .select()
      .single()

    if (error || !updated) {
      return Response.json({ error: '나무 이동 실패' }, { status: 500 })
    }

    return Response.json({ tree: updated })
  }
  ```

- [ ] **Step 6: curl로 통합 검증**

  ```bash
  # 인벤토리 조회 (Task 11에서 받은 나무 확인)
  curl -s http://localhost:3000/api/v1/trees/inventory -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"trees":[{"id":"...","tree_type":"normal","points":1,...}],"count":1}

  # 나무 배치 (tree_id는 위 응답에서 복사)
  TREE_ID=$(curl -s http://localhost:3000/api/v1/trees/inventory -b /tmp/cookies.txt | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['trees'][0]['id'])")

  curl -s -X POST http://localhost:3000/api/v1/trees/place \
    -H "Content-Type: application/json" \
    -d "{\"tree_id\":\"$TREE_ID\",\"x_ratio\":0.35,\"y_ratio\":0.60}" \
    -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"tree":{"is_planted":true,"x_ratio":0.35,"y_ratio":0.60,...}}

  # 팀 숲 조회
  TEAM_ID=$(curl -s http://localhost:3000/api/v1/teams | python3 -c "import sys,json; print(json.load(sys.stdin)['teams'][0]['id'])")
  curl -s "http://localhost:3000/api/v1/teams/$TEAM_ID/forest" | python3 -m json.tool
  # Expected: {"team":{"id":"...","name":"1팀"},"trees":[{"tree_type":"normal",...}],"total_score":1}

  # 나무 이동
  curl -s -X PATCH http://localhost:3000/api/v1/trees/move \
    -H "Content-Type: application/json" \
    -d "{\"tree_id\":\"$TREE_ID\",\"x_ratio\":0.50,\"y_ratio\":0.70}" \
    -b /tmp/cookies.txt | python3 -m json.tool
  # Expected: {"tree":{"x_ratio":0.50,"y_ratio":0.70,...}}
  ```

---

## Self-Review

### 스펙 커버리지 확인

| API | 스펙 항목 | 구현 태스크 |
|-----|----------|------------|
| POST /api/v1/auth/register | ✅ | Task 6 |
| POST /api/v1/auth/logout | ✅ | Task 6 |
| DELETE /api/v1/auth/withdraw | ✅ | Task 6 |
| GET /api/v1/users/me | ✅ | Task 7 |
| GET /api/v1/teams | ✅ | Task 7 |
| POST /api/v1/admin/login | ✅ (스펙 암묵적) | Task 8 |
| GET /api/v1/admin/dashboard | ✅ | Task 8 |
| POST /api/v1/admin/challenges | ✅ | Task 9 |
| GET /api/v1/bible/progress | ✅ | Task 10 |
| PATCH /api/v1/bible/progress | ✅ (나무 지급 로직 포함) | Task 11 |
| GET /api/v1/bible/status | ✅ | Task 10 |
| GET /api/v1/teams/{teamId}/forest | ✅ | Task 12 |
| GET /api/v1/trees/inventory | ✅ | Task 12 |
| POST /api/v1/trees/place | ✅ | Task 12 |
| PATCH /api/v1/trees/move | ✅ | Task 12 |

### 나무 지급 로직 검증

- `calculateTreeRewards(totalChecked, treesEarned, specialTreeEarned)` 순수 함수로 분리
- 체크 취소 시 `treesEarned`를 감소시키지 않으므로 나무 자동 회수 없음
- 260장 완독 시 `special_tree_earned` 플래그로 중복 지급 방지

### 타입 일관성

- `Tree` 타입의 `points`: INT in DB, `number` in TypeScript — 일관됨
- `params` in Route Handlers: `Promise<{ teamId: string }>` — Next.js 16 규칙 적용됨
- `requireUser()` 반환 `User`, `requireAdmin()` 반환 `void` — Task 4에서 정의된 대로 사용됨
