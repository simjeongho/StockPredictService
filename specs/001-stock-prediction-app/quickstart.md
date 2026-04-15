# Quickstart: AI 기반 주가 예측 웹 애플리케이션

**Date**: 2026-04-15 | **Plan**: [plan.md](./plan.md)

개발 환경 설정 및 로컬 실행 가이드.

---

## 사전 요구사항

| 도구 | 버전 | 확인 명령 |
|------|------|-----------|
| Python | 3.11+ | `python --version` |
| Node.js | 20+ | `node --version` |
| PostgreSQL | 15+ | `psql --version` |
| Docker | 24+ (선택) | `docker --version` |

---

## 1. 저장소 클론

```bash
git clone <repo-url>
cd <repo-name>
```

---

## 2. 백엔드 설정

### 2-1. 가상환경 생성 및 의존성 설치

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2-2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 입력한다:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/stockapp

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# JWT
JWT_SECRET_KEY=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# CORS (프론트엔드 URL)
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=30
AI_RATE_LIMIT_PER_MINUTE=5

# Cache TTL (초 단위)
ANALYSIS_CACHE_TTL_SECONDS=600
```

### 2-3. 데이터베이스 생성

```bash
# PostgreSQL에서 DB 생성
psql -U postgres -c "CREATE DATABASE stockapp;"
```

### 2-4. Alembic 마이그레이션 실행

```bash
alembic upgrade head
```

마이그레이션 완료 확인:
```bash
alembic current
# 출력: <revision_id> (head)
```

### 2-5. 백엔드 서버 실행

```bash
uvicorn app.main:app --reload --port 8000
```

서버 확인:
```bash
curl http://localhost:8000/health
# 출력: {"status": "ok", "db": "connected"}
```

Swagger UI: http://localhost:8000/docs

---

## 3. 프론트엔드 설정

### 3-1. 의존성 설치

```bash
cd frontend
npm install
```

### 3-2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-shared-secret-here          # JWT_SECRET과 동일한 값
NEXTAUTH_BACKEND_URL=http://localhost:8000

# Google OAuth — https://console.cloud.google.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Kakao OAuth — https://developers.kakao.com
KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret     # 선택적
```

### 3-3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속.

---

## 4. Docker로 실행 (선택)

백엔드만 Docker로 실행하고 싶을 때:

```bash
cd backend
docker build -t stock-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e JWT_SECRET_KEY="..." \
  -e CORS_ORIGINS="http://localhost:3000" \
  stock-backend
```

---

## 5. 기능 검증 (E2E 체크리스트)

### P1: 종목 검색 & 대시보드 ✅ MVP

```bash
# 1. 종목 검색
curl "http://localhost:8000/api/v1/stocks/search?q=AAPL&market=us"
# 기대: AAPL 정보 반환

# 2. 주가 데이터 조회
curl "http://localhost:8000/api/v1/stocks/AAPL/price?period=1m"
# 기대: candles 배열 포함 응답

# 3. 기술 지표 조회
curl "http://localhost:8000/api/v1/stocks/AAPL/indicators"
# 기대: sma, rsi, macd, bollinger, stochastic 값 포함
```

브라우저에서:
- [ ] http://localhost:3000 접속 → 시장 요약 표시
- [ ] 검색창에 "AAPL" 입력 → 검색 결과 표시
- [ ] 종목 클릭 → 차트 + 기본 정보 표시
- [ ] 1M / 3M / 6M / 1Y 탭 전환 → 차트 업데이트

### P2: AI 분석 리포트

```bash
# SSE 스트리밍 테스트
curl -N -X POST "http://localhost:8000/api/v1/ai/analyze" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "market": "us", "period": "3m"}'
# 기대: data: 이벤트 스트림 수신, 마지막에 [DONE]
```

브라우저에서:
- [ ] 종목 상세 → "AI 분석" 버튼 클릭 → 텍스트 스트리밍 표시
- [ ] 단기/중기 전망 섹션 확인
- [ ] 예측 점수 게이지 표시 확인
- [ ] 면책 고지 표시 확인

### P3: 관심 종목

```bash
# 1. 브라우저에서 http://localhost:3000/watchlist 접속
#    → "Google로 로그인" 버튼 클릭 → OAuth 플로우 완료
#
# 2. NextAuth.js가 발급한 JWT 토큰 확인 (개발자 도구 → Network 탭)
#    → Authorization: Bearer {token} 헤더 확인
#
# 3. curl 테스트용 토큰 획득:
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/verify" \
  -H "Authorization: Bearer {nextauth_jwt_from_browser}" \
  | jq -r '.user_id')

# 관심 종목 추가
curl -X POST "http://localhost:8000/api/v1/watchlist" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "market": "us", "display_name": "Apple Inc."}'
# 기대: 201, 등록된 종목 정보

# 관심 종목 조회
curl "http://localhost:8000/api/v1/watchlist" \
  -H "Authorization: Bearer $TOKEN"
# 기대: AAPL 포함 목록
```

### P5: 예측 점수 비교

```bash
curl "http://localhost:8000/api/v1/scores/ranking?watchlist_only=true" \
  -H "Authorization: Bearer $TOKEN"
# 기대: 관심 종목 단기/중기/장기 점수 목록
```

### P3-EXT: 회원 탈퇴 (FR-020)

```bash
# 1. 탈퇴 전 관심 종목 확인
curl "http://localhost:8000/api/v1/watchlist" \
  -H "Authorization: Bearer $TOKEN"
# 기대: 종목 목록 반환

# 2. 회원 탈퇴 요청
curl -X DELETE "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN"
# 기대: 204 No Content

# 3. 탈퇴 후 관심 종목 조회 시 401 반환 확인
curl "http://localhost:8000/api/v1/watchlist" \
  -H "Authorization: Bearer $TOKEN"
# 기대: 401 UNAUTHORIZED (삭제된 계정)
```

브라우저에서:
- [ ] `watchlist` 또는 프로필 페이지 → "회원 탈퇴" 버튼 클릭 → 확인 모달 표시
- [ ] 확인 후 탈퇴 처리 → 로그아웃 + 메인 페이지 이동
- [ ] 탈퇴 전 등록한 관심 종목이 사라졌는지 확인 (동일 계정으로 재가입 시)

---

## 6. 테스트 실행

### 백엔드 테스트

```bash
cd backend
pytest tests/ -v
```

### 프론트엔드 테스트

```bash
cd frontend
npm test
```

---

## 7. 배포 (Railway)

### 백엔드 배포

1. Railway 프로젝트 생성 → GitHub 저장소 연결
2. `backend/` 디렉토리를 루트로 설정
3. 환경변수 설정 (`.env` 내용을 Railway Variables에 입력)
4. Railway PostgreSQL 플러그인 추가 → `DATABASE_URL` 자동 주입
5. Deploy → `/health` 엔드포인트로 배포 확인

### 프론트엔드 배포 (Vercel)

1. Vercel 대시보드 → New Project → GitHub 저장소 연결
2. Root Directory: `frontend`
3. Environment Variables: `NEXT_PUBLIC_API_BASE_URL=https://your-railway-app.railway.app`
4. Deploy

---

## 8. 헬스체크 확인

```bash
curl https://your-railway-app.railway.app/health
# 기대: {"status": "ok", "db": "connected", "timestamp": "2026-04-15T..."}
```
