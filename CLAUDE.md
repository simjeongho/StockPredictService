# 주가 예측 웹 애플리케이션 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-19

## Active Technologies
- TypeScript 5.x (Next.js 14 App Router) + Next.js 14, React 18, Tailwind CSS 3, NextAuth.js v5, Axios (002-ui-redesign)
- N/A (백엔드 API 변경 없음) (002-ui-redesign)
- TypeScript 5.x / Next.js 14 App Router (프론트), Python 3.11 (백엔드 테스트) + Next.js 14, React 18, Tailwind CSS 3, NextAuth.js v5, Axios, pytest, httpx (002-ui-redesign)
- PostgreSQL (기존, 변경 없음) (002-ui-redesign)

**Backend**: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy[asyncio], asyncpg, Alembic, slowapi, anthropic SDK, yfinance, FinanceDataReader, pandas, pandas_ta, PyJWT, httpx, python-dotenv

**Frontend**: TypeScript, Next.js 14 (App Router), React, Tailwind CSS, Lightweight Charts (TradingView), Axios, NextAuth.js v5 (Auth.js)

**Storage**: PostgreSQL (Railway → AWS RDS)

**AI**: Claude API (`claude-sonnet-4-20250514`) with `web_search_20250305` tool, SSE streaming

**Deployment**: Vercel (frontend), Railway Hobby (backend + DB), Docker (containerized backend)

## Project Structure

```text
backend/
├── app/
│   ├── main.py            # FastAPI entry point
│   ├── config.py          # pydantic-settings env config
│   ├── database.py        # async SQLAlchemy engine
│   ├── models/            # ORM models (watchlist, analysis_cache)
│   ├── schemas/           # Pydantic schemas
│   ├── routers/           # API route handlers (stocks, ai, watchlist, scores, auth, health)
│   └── services/          # Business logic (market_data, indicators, claude, cache, score_parser, auth)
├── alembic/               # DB migrations
├── tests/
├── Dockerfile
└── requirements.txt

frontend/
├── src/
│   ├── app/               # Next.js 14 App Router pages
│   ├── components/        # Reusable UI components
│   ├── services/          # API client (axios)
│   └── types/             # TypeScript type definitions
└── package.json

specs/001-stock-prediction-app/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
└── contracts/             # API contracts (stocks, ai, watchlist, scores)
```

## Commands

### Backend
```bash
# Setup
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest tests/ -v
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm test
npm run build
```

### Docker
```bash
cd backend
docker build -t stock-backend .
docker run -p 8000:8000 --env-file .env stock-backend
```

## Code Style

### Python (Backend)
- Async/await throughout — never use blocking I/O in async context
- Pydantic v2 schemas for all request/response validation
- SQLAlchemy 2.x async ORM patterns
- All config via `pydantic-settings` (never hardcode secrets)
- Logging to stdout only (CloudWatch compatible)

### TypeScript (Frontend)
- Next.js 14 App Router conventions (server components by default)
- Tailwind CSS utility classes (no custom CSS files)
- Axios with typed response generics
- All API calls in `src/services/api.ts`

## Key Design Decisions

- **AI Analysis**: Claude `web_search_20250305` tool enabled — no separate search API needed
- **SSE Streaming**: All AI endpoints stream via `text/event-stream` for low perceived latency
- **Caching**: 10-minute TTL in `analysis_cache` PostgreSQL table (no Redis needed for ~10 users)
- **Rate Limiting**: slowapi — 30 req/min global, 5 req/min for AI endpoints
- **Disclaimer**: `Disclaimer` component included in ALL AI output screens (non-negotiable)
- **Auth**: NextAuth.js v5 (Google + Kakao OAuth) — NextAuth issues JWT, FastAPI validates with shared JWT_SECRET (PyJWT). No email/password. watchlist/chat history require login, search/dashboard do not.
- **Account Deletion**: `DELETE /api/v1/users/me` — soft delete (`is_active=false`, `deleted_at=now()`), CASCADE watchlist delete, anonymize chat_messages (user_id→NULL). Satisfies Constitution §Data&Privacy MUST.
- **Markets**: US (NASDAQ/S&P500) primary via yfinance, KOSPI secondary via FinanceDataReader

## Recent Changes
- 002-ui-redesign: Added TypeScript 5.x / Next.js 14 App Router (프론트), Python 3.11 (백엔드 테스트) + Next.js 14, React 18, Tailwind CSS 3, NextAuth.js v5, Axios, pytest, httpx
- 002-ui-redesign: Added TypeScript 5.x (Next.js 14 App Router) + Next.js 14, React 18, Tailwind CSS 3, NextAuth.js v5, Axios

- **001-stock-prediction-app** (2026-04-15): Initial feature — full app spec, plan, data model, API contracts, quickstart

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
