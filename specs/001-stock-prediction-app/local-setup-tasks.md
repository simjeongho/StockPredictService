---
description: "코드 구현 완료 후 로컬 환경에서 프로젝트를 실행하기 위한 설정 태스크 목록"
---

# 로컬 환경 설정 태스크: AI 기반 주가 예측 웹 애플리케이션

**입력 문서**: `specs/001-stock-prediction-app/`
**참고 문서**: quickstart.md, plan.md, research.md
**전제 조건**: 코드 구현 완료 (tasks.md 전체 체크 완료 상태)

**목표**: 백엔드(FastAPI) + 프론트엔드(Next.js) + PostgreSQL DB를 로컬에서 완전히 실행하고 기능 검증까지 완료한다.

## 형식: `[ID] [P?] 설명`

- **[P]**: 다른 태스크와 독립적으로 병렬 실행 가능
- 각 태스크는 단일 명령 또는 단일 파일 편집으로 완결되어야 함

---

## 1단계: 사전 요구사항 확인 (Prerequisites)

**목적**: 로컬 머신에 필수 도구가 설치되어 있는지 확인한다. 하나라도 누락되면 이후 단계가 실패하므로 반드시 먼저 확인한다.

- [x] L001 Python 3.11 이상 설치 확인 — `python --version` 또는 `python3 --version` 실행 후 3.11+ 출력 확인; 미설치 시 https://python.org/downloads 에서 설치
- [x] L002 [P] Node.js 20 이상 설치 확인 — `node --version` 실행 후 v20+ 출력 확인; 미설치 시 https://nodejs.org 에서 LTS 설치
- [x] L003 [P] PostgreSQL 15 이상 설치 및 실행 확인 — `psql --version` 실행 후 15+ 확인; `pg_ctl status` 또는 서비스 관리자에서 PostgreSQL 프로세스 실행 중인지 확인; 미설치 시 https://postgresql.org/download 에서 설치
- [x] L004 [P] pip 최신 버전 확인 — `pip --version` 또는 `python -m pip --version` 실행; `python -m pip install --upgrade pip` 으로 업그레이드

**체크포인트**: `python --version`, `node --version`, `psql --version` 모두 정상 출력 확인 후 다음 단계 진행.

---

## 2단계: 외부 서비스 자격증명 발급 (External Credentials)

**목적**: AI 분석(Anthropic), OAuth 로그인(Google/Kakao)에 필요한 API 키와 OAuth 자격증명을 발급한다. 백엔드·프론트엔드 환경변수 설정 전에 준비해야 한다.

- [x] L005 Anthropic API 키 발급 — https://console.anthropic.com 로그인 → API Keys → "Create Key" → `sk-ant-...` 형식 키를 안전한 곳에 복사 (이후 `ANTHROPIC_API_KEY` 환경변수에 사용)
- [x] L006 JWT_SECRET 생성 — 터미널에서 `openssl rand -base64 32` 실행 후 출력된 32자 이상 문자열 복사; 없을 경우 임의의 32자 이상 문자열 직접 작성 (백엔드 `JWT_SECRET`과 프론트엔드 `NEXTAUTH_SECRET`에 **동일한 값** 사용)
- [ ] L007 [P] Google OAuth 2.0 자격증명 생성 — https://console.cloud.google.com → 새 프로젝트 생성(또는 기존 프로젝트 선택) → "API 및 서비스" → "사용자 인증 정보" → "OAuth 2.0 클라이언트 ID" 생성 → 유형: "웹 애플리케이션" → 승인된 리다이렉트 URI에 `http://localhost:3000/api/auth/callback/google` 추가 → `클라이언트 ID`와 `클라이언트 보안 비밀` 복사
- [ ] L008 [P] Kakao OAuth 앱 등록 (선택) — https://developers.kakao.com → 내 애플리케이션 → 애플리케이션 추가 → 앱 키(REST API 키) 복사 → 플랫폼 → Web 플랫폼 등록(http://localhost:3000) → 카카오 로그인 → Redirect URI에 `http://localhost:3000/api/auth/callback/kakao` 등록; Kakao 로그인 기능 비활성화 시 이 단계 건너뜀

**체크포인트**: Anthropic API 키, JWT_SECRET 문자열, Google OAuth 클라이언트 ID/Secret을 메모장 등에 준비해 둔다.

---

## 3단계: 백엔드 설정 (Backend Setup)

**목적**: FastAPI 서버를 로컬에서 실행하고 PostgreSQL 연결까지 확인한다. 프론트엔드가 이 서버에 의존하므로 반드시 먼저 완료해야 한다.

- [x] L009 backend 디렉토리로 이동 — `cd backend` (이후 모든 백엔드 명령은 `backend/` 기준)
- [ ] L010 Python 가상환경 생성 — `python -m venv .venv` 실행 후 `.venv/` 디렉토리 생성 확인
- [x] L011 가상환경 활성화 — Windows: `.venv\Scripts\activate` / macOS·Linux: `source .venv/bin/activate`; 프롬프트 앞에 `(.venv)` 표시 확인
- [x] L012 Python 의존성 설치 — `pip install -r requirements.txt` 실행; fastapi, uvicorn, anthropic, yfinance, sqlalchemy 등 모든 패키지 설치 완료 확인 (오류 발생 시 `pip install --upgrade pip setuptools wheel` 후 재시도)
- [x] L013 PostgreSQL 데이터베이스 생성 — `psql -U postgres -c "CREATE DATABASE stockapp;"` 실행; 이미 존재하면 `ERROR: database "stockapp" already exists` 무시; postgres 유저 비밀번호가 있으면 `-W` 옵션 추가
- [x] L014 백엔드 환경변수 파일 생성 — `cp .env.example .env` (Windows: `copy .env.example .env`)
- [x] L015 `backend/.env` 파일 편집 — 아래 값을 실제 값으로 채운다:
  - `DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PG_PASSWORD@localhost:5432/stockapp` (YOUR_PG_PASSWORD를 실제 postgres 비밀번호로 교체; 비밀번호 없으면 `postgres:@localhost`)
  - `ANTHROPIC_API_KEY=sk-ant-...` (L005에서 발급한 키)
  - `JWT_SECRET=...` (L006에서 생성한 문자열)
  - `CORS_ORIGINS=http://localhost:3000` (기본값 유지)
  - `RATE_LIMIT_PER_MINUTE=30` (기본값 유지)
  - `AI_RATE_LIMIT_PER_MINUTE=5` (기본값 유지)
  - `ANALYSIS_CACHE_TTL_SECONDS=600` (기본값 유지)
- [ ] L016 Alembic 마이그레이션 실행 — `alembic upgrade head`; `INFO [alembic.runtime.migration] Running upgrade ... -> 001_initial_schema` 출력 확인
- [x] L017 마이그레이션 상태 확인 — `alembic current`; `001_initial_schema (head)` 출력 확인
- [x] L018 백엔드 개발 서버 실행 — `uvicorn app.main:app --reload --port 8000`; `Application startup complete.` 메시지 확인 (이 터미널은 서버 실행 중 유지)
- [x] L019 백엔드 헬스체크 확인 — 새 터미널에서 `curl http://localhost:8000/health`; `{"status":"ok","db":"connected","timestamp":"..."}` 응답 확인

**체크포인트**: `/health` 응답에서 `"db": "connected"` 확인 후 프론트엔드 설정 진행.

---

## 4단계: 프론트엔드 설정 (Frontend Setup)

**목적**: Next.js 개발 서버를 실행하고 백엔드 API와 OAuth 로그인이 연동되는지 확인한다.

- [x] L020 frontend 디렉토리로 이동 — 새 터미널에서 `cd frontend` (백엔드 서버 터미널과 별도 유지)
- [x] L021 Node.js 의존성 설치 — `npm install`; `node_modules/` 디렉토리 생성 확인 (경고 메시지는 무시, 오류만 해결)
- [x] L022 프론트엔드 환경변수 파일 생성 — `cp .env.local.example .env.local` (Windows: `copy .env.local.example .env.local`)
- [x] L023 `frontend/.env.local` 파일 편집 — 아래 값을 실제 값으로 채운다:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` (기본값 유지)
  - `NEXTAUTH_URL=http://localhost:3000` (기본값 유지)
  - `NEXTAUTH_SECRET=...` (L006에서 생성한 JWT_SECRET과 **동일한 값**)
  - `NEXTAUTH_BACKEND_URL=http://localhost:8000` (기본값 유지)
  - `GOOGLE_CLIENT_ID=...` (L007에서 발급한 클라이언트 ID)
  - `GOOGLE_CLIENT_SECRET=...` (L007에서 발급한 클라이언트 Secret)
  - `KAKAO_CLIENT_ID=...` (L008에서 발급한 REST API 키; Kakao 미사용 시 임의 값 입력 또는 빈 값)
  - `KAKAO_CLIENT_SECRET=` (Kakao 미사용 시 빈 값)
- [ ] L024 프론트엔드 개발 서버 실행 — `npm run dev`; `Local: http://localhost:3000` 출력 확인 (이 터미널은 서버 실행 중 유지)
- [ ] L025 브라우저에서 메인 페이지 접속 확인 — http://localhost:3000 열기 → "StockAI" 헤더와 종목 검색창 표시 확인; 시장 요약 카드(S&P 500·NASDAQ·DOW) 로딩 확인

**체크포인트**: 두 서버 모두 실행 중 (백엔드 :8000, 프론트엔드 :3000), 메인 페이지 정상 로드.

---

## 5단계: 기능 검증 (E2E Smoke Tests)

**목적**: quickstart.md의 P1~P5 체크리스트를 순서대로 검증하여 각 사용자 스토리가 로컬에서 정상 동작하는지 확인한다.

### P1: 종목 검색 & 대시보드 검증

- [ ] L026 종목 검색 API 테스트 — `curl "http://localhost:8000/api/v1/stocks/search?q=AAPL&market=us"` 실행; `ticker`, `name`, `current_price` 필드를 포함한 JSON 배열 응답 확인
- [ ] L027 [P] 주가 데이터 API 테스트 — `curl "http://localhost:8000/api/v1/stocks/AAPL/price?period=1m"` 실행; `candles` 배열과 `market_status` 포함 확인
- [ ] L028 [P] 기술 지표 API 테스트 — `curl "http://localhost:8000/api/v1/stocks/AAPL/indicators"` 실행; `sma`, `rsi`, `macd`, `bollinger`, `stochastic` 값 확인
- [ ] L029 브라우저 검색 기능 확인 — http://localhost:3000 → 검색창에 "AAPL" 입력 → 검색 버튼 클릭 → 검색 결과 리스트 표시 확인
- [ ] L030 종목 상세 페이지 확인 — 검색 결과에서 AAPL 클릭 → `/stock/AAPL` 이동 → 현재가·등락률 헤더 표시, 캔들스틱 차트 렌더링, 1M/3M/6M/1Y 탭 전환 정상 동작 확인

### P2: AI 기술적 분석 검증

- [ ] L031 AI 분석 SSE 스트리밍 API 테스트 — `curl -N -X POST "http://localhost:8000/api/v1/ai/analyze" -H "Content-Type: application/json" -d '{"ticker":"AAPL","market":"us"}'` 실행; `data: {"type":"text",...}` 이벤트 스트림 수신 후 `data: [DONE]` 확인 (최대 1분 소요)
- [ ] L032 브라우저 AI 분석 UI 확인 — 종목 상세 페이지 → "AI 분석 요청" 버튼 클릭 → 로딩 스피너 표시 → 텍스트 스트리밍 시작 → 예측 점수 게이지(단기·중기·장기) 렌더링 → 면책 고지 표시 확인

### P3: 관심 종목 & OAuth 로그인 검증

- [ ] L033 Google OAuth 로그인 테스트 — http://localhost:3000/watchlist 접속 → "Google로 로그인" 클릭 → Google 계정 선택 → `http://localhost:3000/watchlist` 리다이렉트 후 로그인 상태 확인 (네비게이션에 로그인 표시)
- [ ] L034 관심 종목 추가 확인 — 종목 상세 페이지 (`/stock/AAPL?market=us`) → "☆ 관심 종목 추가" 클릭 → "★ 관심 종목 해제"로 변경 확인
- [ ] L035 관심 종목 목록 확인 — http://localhost:3000/watchlist → AAPL 카드 표시 및 현재가·등락률 확인

### P5: 예측 점수 비교 검증

- [ ] L036 점수 비교 페이지 확인 — L031에서 AI 분석 완료 후 http://localhost:3000/scores → 관심 종목(AAPL) 단기·중기·장기 점수 ScoreTable 렌더링 확인; 정렬 탭(단기/중기/장기/종합) 전환 확인

### P4: AI 챗봇 검증

- [ ] L037 챗봇 페이지 확인 — http://localhost:3000/chat → "AAPL" 티커 입력 후 적용 → 입력창에 "AAPL의 RSI 현황은?" 입력 → 전송 → SSE 스트리밍 답변 수신 확인

### 마무리

- [ ] L038 회원 탈퇴 기능 확인 (선택) — http://localhost:3000/watchlist → 하단 "회원 탈퇴" 링크 → 확인 모달 → "취소" 클릭으로 테스트 (실제 탈퇴 원하면 "탈퇴 확인")
- [ ] L039 Swagger UI 확인 — http://localhost:8000/docs → 전체 API 엔드포인트 목록 표시 확인

**체크포인트**: 모든 P1~P5 항목 통과 시 로컬 환경 설정 완료.

---

## 의존성 및 실행 순서

### 단계 간 의존성

```
L001~L004 (Prerequisites) → 선행 조건
L005~L008 (Credentials) → 병렬 진행 가능, L015·L023 전에 완료 필요
L009~L019 (Backend) → L003(PostgreSQL) 완료 후 시작, L020 이전에 완료 필요
L020~L025 (Frontend) → L018(백엔드 서버 실행) 완료 후 시작
L026~L039 (E2E) → L025(프론트엔드 서버 실행) 완료 후 시작
```

### 병렬 실행 가능 태스크

```
1단계 내: L001 + L002 + L003 + L004 동시 실행 가능
2단계 내: L005 완료 후 L006 + L007 + L008 병렬 가능
5단계 내: L026 + L027 + L028 동시 curl 테스트 가능
```

### 실행 순서 요약 (가장 빠른 경로)

```
터미널 A (백엔드):
  L001 → L003 → L009 → L010 → L011 → L012 → L013 → L014 → L015 → L016 → L017 → L018

터미널 B (자격증명 — A와 병렬):
  L005 → L006 → L007 (→ L008 선택)

터미널 C (프론트엔드 — A 완료 후):
  L020 → L021 → L022 → L023 → L024 → L025

터미널 D (검증 — C 완료 후):
  L026 ~ L039 순서대로 실행
```

---

## 자주 발생하는 오류 및 해결 방법

| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| `sqlalchemy.exc.OperationalError: connection refused` | PostgreSQL 미실행 또는 DATABASE_URL 오류 | `pg_ctl start` 또는 서비스 재시작; `.env`의 `DATABASE_URL` 비밀번호 확인 |
| `ModuleNotFoundError: No module named 'app'` | 가상환경 비활성화 상태 | `.venv\Scripts\activate` (Windows) 또는 `source .venv/bin/activate` 재실행 |
| `alembic.util.exc.CommandError: Can't locate revision` | 마이그레이션 파일 누락 | `alembic history` 확인; `alembic upgrade 001_initial_schema` 명령 직접 실행 |
| `401 UNAUTHORIZED` from `/api/v1/auth/verify` | JWT_SECRET 불일치 | `backend/.env` `JWT_SECRET` 값과 `frontend/.env.local` `NEXTAUTH_SECRET` 값이 **동일한지** 확인 |
| `CORS error` in browser console | CORS_ORIGINS 설정 오류 | `backend/.env` → `CORS_ORIGINS=http://localhost:3000` 확인; 포트 번호 일치 확인 |
| `Error: Cannot find module 'next-auth'` | npm install 미완료 | `cd frontend && npm install` 재실행 |
| Google OAuth `redirect_uri_mismatch` | 리다이렉트 URI 미등록 | Google Console → 승인된 리다이렉트 URI에 `http://localhost:3000/api/auth/callback/google` 추가 |
| `yfinance` 데이터 없음 (`503`) | 시장 데이터 일시 오류 | 잠시 후 재시도; 주말·공휴일에는 장 마감 데이터 반환이 정상 |

---

## 참고 사항

- 백엔드·프론트엔드 개발 서버는 각각 **별도 터미널**에서 실행해야 한다 (둘 다 foreground 프로세스)
- `JWT_SECRET` (backend) = `NEXTAUTH_SECRET` (frontend) — 이 두 값이 **반드시 동일**해야 OAuth 로그인 후 백엔드 API 호출이 정상 동작함
- `ANTHROPIC_API_KEY` 없이도 P1(검색·차트) 기능은 동작하지만, P2(AI 분석)·P4(챗봇) 기능은 동작하지 않음
- Kakao OAuth는 선택 사항 — `KAKAO_CLIENT_ID`에 임의 값을 넣어도 Google 로그인은 정상 동작함
- 개발 서버 재시작 없이 환경변수 변경 사항을 반영하려면 서버를 `Ctrl+C`로 종료 후 재실행
