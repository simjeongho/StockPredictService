# Implementation Plan: AI 기반 주가 예측 웹 애플리케이션

**Branch**: `001-stock-prediction-app` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-stock-prediction-app/spec.md`

## Summary

개인 투자자를 위한 AI 기반 주가 분석 웹 서비스. Next.js 14+ (App Router) 프론트엔드와 FastAPI 비동기 백엔드로 구성된 웹 애플리케이션이다. yfinance/FinanceDataReader로 미국/한국 주식 데이터를 수집하고, pandas_ta로 기술 지표(SMA, RSI, MACD, 볼린저 밴드, 스토캐스틱)를 계산한 뒤 Claude API(web_search 활성화)를 통해 기술적 분석 리포트, 0–100 예측 점수, AI 챗봇 응답을 SSE 스트리밍으로 제공한다. 분석 결과는 PostgreSQL에 10분 TTL 캐싱한다. 초기 배포는 Vercel(프론트엔드) + Railway(백엔드+DB)이며, Docker/Stateless 설계로 AWS 이관을 대비한다.

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript / Node.js 20+ (Frontend — Next.js 14+)
**Primary Dependencies**: FastAPI + Uvicorn (backend), Next.js 14 App Router + Tailwind CSS + Lightweight Charts + NextAuth.js v5 (frontend), Anthropic Python SDK (AI), yfinance + FinanceDataReader + pandas_ta (data & indicators), SQLAlchemy[asyncio] + asyncpg + Alembic (ORM & migrations), slowapi (rate limiting), PyJWT (JWT verification)
**Authentication**: NextAuth.js v5 (Auth.js) — 프론트엔드에서 Google OAuth 2.0 + Kakao OAuth 2.0 처리 → JWT 발급 → FastAPI가 공유 JWT_SECRET으로 검증. 이메일/비밀번호 인증 없음.
**Storage**: PostgreSQL (Railway 초기, AWS RDS 향후) — SQLAlchemy async ORM + Alembic migrations
**Testing**: pytest + httpx (backend async tests), Vitest + React Testing Library (frontend)
**Target Platform**: 반응형 웹 (모바일 375px 이상) — Vercel (frontend), Railway Hobby $5/월 (backend + PostgreSQL)
**Project Type**: 웹 애플리케이션 — 프론트엔드 + 백엔드 분리(decoupled) 구조
**Performance Goals**: AI 분석 리포트 1분 이내 응답 (SSE 스트리밍으로 체감 대기 최소화), 주가 데이터 조회 5초 이내, 화면 전환 2초 이내
**Constraints**: Claude API 비용 관리 (10분 TTL 캐싱), Rate Limiting 30req/min (slowapi), AWS 이관 대비 Stateless 설계, 모든 설정 환경변수 외부화
**Scale/Scope**: 초기 ~10명 동시 사용자, US(NASDAQ/S&P500) 주요 지원 + KOSPI 보조, 관심 종목 최대 30개/사용자

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 근거 |
|------|------|------|
| I. 데이터 무결성 우선 | ✅ PASS | yfinance/FDR 검증된 소스 사용. 기술 지표 수치를 Claude 프롬프트에 포함하여 환각 최소화. 데이터 부족 시 분석 생성 거부(FR-008). 모든 데이터에 타임스탬프 표시(FR-004). |
| II. 예측 투명성 | ✅ PASS | 0–100 예측 점수 + 라벨(강력 매수~강력 매도). 산출 근거 JSON 반환. 모든 AI 응답에 면책 고지 자동 포함(FR-007, FR-014, FR-017). |
| III. 사용자 접근성 | ✅ PASS | 점수 색상 시각화(0~20 빨강 → 81~100 초록). 핵심 흐름 5분 내 완료(SC-006). 반응형 웹(FR-018). 면책 고지 100% 표시(SC-005). |
| IV. 점진적 가치 전달 | ✅ PASS | 5개 사용자 스토리(P1–P5). P1(검색+대시보드)만으로 독립 배포 가능 MVP. 각 스토리 독립 테스트 가능. |
| V. 단순성 & 유지보수성 | ✅ PASS | 각 의존성은 현재 요구사항에 의해 정당화됨. 별도 웹 검색 API 불필요(Claude web_search 활용으로 통합). 추상화 최소화. |

**GATE RESULT: ✅ PASS** — 모든 원칙 충족. Phase 0 진행 가능.

*Post-Phase 1 re-check*: 설계 완료 후 DB 스키마, API 계약이 Principle I(데이터 무결성) 및 Principle II(투명성)을 침해하지 않는지 재검증 완료. ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-stock-prediction-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── stocks.md        # 주가 데이터 API 계약
│   ├── ai.md            # AI 분석·챗봇 API 계약
│   ├── watchlist.md     # 관심 종목 API 계약
│   ├── scores.md        # 예측 점수 API 계약
│   └── auth.md          # 인증 API 계약 (NextAuth.js v5 + OAuth)
└── tasks.md             # /speckit.tasks 생성
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py                    # FastAPI 진입점, CORS, 라우터 등록, 전역 예외 핸들러
│   ├── config.py                  # 환경변수 설정 (pydantic-settings)
│   ├── database.py                # SQLAlchemy 비동기 엔진 + 세션 팩토리
│   ├── models/
│   │   ├── watchlist.py           # Watchlist ORM 모델
│   │   └── analysis_cache.py      # AnalysisCache ORM 모델
│   ├── schemas/
│   │   ├── stock.py               # 주가 데이터 Pydantic 스키마
│   │   ├── analysis.py            # AI 분석 요청/응답 스키마
│   │   ├── watchlist.py           # 관심 종목 스키마
│   │   └── score.py               # 예측 점수 스키마
│   ├── routers/
│   │   ├── stocks.py              # /api/v1/stocks 라우터
│   │   ├── ai.py                  # /api/v1/ai 라우터 (SSE 스트리밍)
│   │   ├── watchlist.py           # /api/v1/watchlist 라우터
│   │   ├── scores.py              # /api/v1/scores 라우터
│   │   ├── auth.py                # /api/v1/auth/verify, /api/v1/users/me
│   │   └── health.py              # /health 헬스체크
│   └── services/
│       ├── market_data.py         # yfinance + FDR 데이터 수집
│       ├── indicators.py          # pandas_ta 기술 지표 계산
│       ├── claude.py              # Claude API 호출 (SSE 스트리밍)
│       ├── cache.py               # 분석 결과 캐싱 (PostgreSQL TTL)
│       ├── score_parser.py        # 응답에서 buy_score JSON 파싱
│       └── auth.py                # NextAuth.js JWT 토큰 검증 (PyJWT)
├── alembic/
│   ├── env.py
│   └── versions/
├── tests/
│   ├── test_stocks.py
│   ├── test_indicators.py
│   ├── test_claude.py
│   └── test_watchlist.py
├── Dockerfile
├── .env.example
├── requirements.txt
└── alembic.ini

frontend/
├── src/
│   ├── app/                        # Next.js 14 App Router
│   │   ├── api/auth/[...nextauth]/
│   │   │   └── route.ts            # NextAuth.js v5 라우트 핸들러
│   │   ├── layout.tsx              # 루트 레이아웃 (네비게이션, 면책 고지)
│   │   ├── page.tsx                # / 메인 대시보드 (시장 요약 + 검색)
│   │   ├── stock/[ticker]/
│   │   │   └── page.tsx            # 종목 상세 (차트 + AI 분석 + 점수)
│   │   ├── scores/
│   │   │   └── page.tsx            # 관심 종목 예측 점수 비교
│   │   ├── watchlist/
│   │   │   └── page.tsx            # 관심 종목 관리
│   │   ├── chat/
│   │   │   └── page.tsx            # AI 챗봇
│   │   └── events/
│   │       └── page.tsx            # 글로벌 이벤트 요약
│   ├── components/
│   │   ├── StockChart.tsx          # Lightweight Charts 래퍼 컴포넌트
│   │   ├── ScoreGauge.tsx          # 예측 점수 게이지 (색상 코딩)
│   │   ├── ScoreTable.tsx          # 종목 비교 테이블
│   │   ├── ChatInterface.tsx       # 챗봇 메시지 UI (SSE 스트리밍)
│   │   ├── WatchlistCard.tsx       # 관심 종목 요약 카드
│   │   └── Disclaimer.tsx          # 면책 고지 컴포넌트 (재사용)
│   ├── services/
│   │   └── api.ts                  # Axios 인스턴스 + 모든 API 호출 함수
│   ├── auth.ts                     # NextAuth.js v5 설정 (providers, callbacks, secret)
│   └── types/
│       └── index.ts                # 공통 TypeScript 타입 정의
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Structure Decision**: Web application (Option 2) — `backend/` (FastAPI) + `frontend/` (Next.js) 분리 구조. 각각 독립적으로 빌드·배포 가능. AWS 이관 시 백엔드는 ECS Fargate/App Runner, 프론트엔드는 Vercel 유지 또는 Amplify로 각각 이관.

## Complexity Tracking

> Constitution Check를 모두 통과하여 정당화가 필요한 위반 사항 없음.
