# Research: AI 기반 주가 예측 웹 애플리케이션

**Phase 0 Output** | **Date**: 2026-04-15 | **Plan**: [plan.md](./plan.md)

---

## 1. 주가 데이터 소스

### Decision
미국 주식: `yfinance` (기본) | 한국 주식: `FinanceDataReader` (보조)

### Rationale
- `yfinance`는 NYSE, NASDAQ, S&P500 종목의 OHLCV 이력 데이터, 실시간 가격, 메타데이터를 무료로 제공하며 Python 생태계에서 가장 널리 사용됨
- `FinanceDataReader`는 KOSPI/KOSDAQ 데이터에 특화되어 있으며 한국 주식 커뮤니티에서 검증된 라이브러리
- 두 라이브러리 모두 pandas DataFrame을 반환하여 pandas_ta와 직접 연동 가능

### Alternatives Considered
- **Alpha Vantage**: 무료 티어 분당 5회 제한으로 실용성 부족
- **Polygon.io**: 유료 (무료 티어 이전 데이터만 제공), 초기 단계에 과도한 비용
- **KIS API (한국투자증권)**: 실시간 데이터 강점이나 계좌 연동 필요, 범용 데이터 조회 목적에 부적합

### Key Notes
- yfinance는 Yahoo Finance 비공식 API를 래핑하므로 서비스 안정성을 보장하지 않음 → 데이터 장애 시 `try/except`로 graceful degradation 필수
- 시장 휴장일(주말, 미국 공휴일) 처리: `yfinance`가 가장 최근 영업일 데이터를 반환하므로 프론트엔드에서 "장 마감" 상태 표시 필요
- 신규 상장 종목(IPO)의 경우 충분한 이력 데이터가 없을 수 있음 → 최소 20일치 데이터 확인 후 지표 계산 진행

---

## 2. 기술 지표 계산

### Decision
`pandas_ta` 라이브러리로 모든 기술 지표 계산

### Rationale
- `pandas_ta`는 pandas DataFrame에 직접 `.ta` 접근자를 추가하여 직관적인 API 제공
- SMA, RSI, MACD, 볼린저 밴드, 스토캐스틱 등 130개 이상 지표 내장
- yfinance/FDR의 DataFrame 출력과 직접 호환

### Indicators Spec
| 지표 | 파라미터 | 용도 |
|------|----------|------|
| SMA | 5, 20, 50, 200일 | 추세 방향, 지지/저항선 |
| RSI | 14일 | 과매수(>70) / 과매도(<30) |
| MACD | 12, 26, 9 | 추세 전환 시그널 |
| 볼린저 밴드 | 20일, 2σ | 변동성, 과매수/과매도 |
| 스토캐스틱 | 14, 3, 3 | 단기 모멘텀 |

### Key Notes
- 지표 계산에 필요한 최소 캔들 수: SMA 200 기준 200일치 데이터 필요 → 지표 계산 전 데이터 충분성 검증
- `NaN` 처리: 초반 캔들에서 발생하는 NaN 값은 `dropna()` 또는 `fillna(method='bfill')` 처리 후 Claude에 전달

---

## 3. Claude API 연동 (web_search 포함)

### Decision
Anthropic Python SDK + `web_search_20250305` 도구 활성화 + SSE 스트리밍

### Rationale
- `web_search_20250305` 도구를 활성화하면 Claude가 직접 최신 글로벌 이벤트를 검색하고 분석에 반영 가능 → Tavily, Serper 등 별도 검색 API 불필요
- SSE 스트리밍으로 첫 토큰이 수 초 내에 도달하여 체감 대기 시간 최소화
- 기술 지표 JSON을 프롬프트 컨텍스트에 포함하여 Claude가 실제 수치 기반으로 분석 → 환각(hallucination) 최소화

### Claude API 호출 구조
```python
response = await client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    tools=[{"type": "web_search_20250305", "name": "web_search"}],
    system=SYSTEM_PROMPT,
    messages=[
        {
            "role": "user",
            "content": f"""
종목: {ticker} ({market.upper()})
분석 기간: {period}

## 기술 지표 데이터 (현재 기준)
{json.dumps(indicators_data, ensure_ascii=False, indent=2)}

위 데이터를 기반으로 분석을 진행해 주세요.
"""
        }
    ],
    stream=True
)
```

### SSE 스트리밍 구현 (FastAPI)
```python
from fastapi.responses import StreamingResponse

async def stream_analysis(ticker, market, indicators):
    async with client.messages.stream(...) as stream:
        async for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"

@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    return StreamingResponse(
        stream_analysis(req.ticker, req.market, indicators),
        media_type="text/event-stream"
    )
```

### buy_score JSON 파싱
Claude 응답 전체 텍스트에서 JSON 블록 추출:
```python
import re, json

def extract_buy_score(text: str) -> dict | None:
    pattern = r'\{[^{}]*"buy_score"[^{}]*\{.*?\}.*?\}'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return None
```

### Key Notes
- `web_search_20250305` 도구는 Claude가 필요하다고 판단할 때 자동 호출됨 — 별도 tool_choice 강제 불필요
- 스트리밍 중 `buy_score` JSON은 응답 완료 후 전체 텍스트에서 파싱 → 파싱 실패 시 재시도(최대 2회) 후 점수 없이 저장
- Claude API 타임아웃 기본값이 낮을 수 있음 → `timeout=httpx.Timeout(60.0)` 명시적 설정 권장

---

## 4. 캐싱 전략

### Decision
PostgreSQL `analysis_cache` 테이블 기반 TTL 캐싱 (10분)

### Rationale
- Redis 같은 별도 인프라 추가 없이 기존 PostgreSQL로 캐싱 가능 → Railway 플랜 내에서 해결
- 10분 TTL은 비용(Claude API 호출 횟수)과 데이터 신선도(주가 데이터 변동 주기) 사이의 합리적 균형
- `expires_at` 컬럼 + 주기적 만료 레코드 정리(또는 조회 시 TTL 검사)로 구현

### Key Notes
- 캐시 히트 시 `created_at` 타임스탬프를 프론트엔드에 전달하여 "X분 전 분석" 표시
- 동일 종목을 여러 사용자가 동시 요청할 경우(cache miss) — 첫 번째 요청만 Claude 호출, 나머지는 대기 후 캐시 응답 (DB 락 또는 in-flight request deduplication)

---

## 5. 사용자 인증

### Decision
**NextAuth.js v5 (Auth.js)** — 프론트엔드에서 Google OAuth 2.0 + Kakao OAuth 2.0 처리. FastAPI는 NextAuth가 발급한 JWT를 PyJWT로 검증 (공유 JWT_SECRET).

### Rationale
- 이메일/비밀번호 대신 소셜 로그인을 사용하면 비밀번호 관리·재설정 플로우가 불필요 → 복잡도 감소 (Principle V)
- NextAuth.js v5는 Next.js 14 App Router와 네이티브 통합. 별도 인증 서버 불필요
- Google/Kakao는 국내 개인 투자자 타겟 기준 가장 범용적인 OAuth 제공자
- 프론트엔드가 JWT를 발급하고, 백엔드가 검증만 하는 구조 → FastAPI에서 passlib/bcrypt 제거

### Auth Flow
```
1) 사용자 Google/Kakao 버튼 클릭
2) NextAuth.js → OAuth 플로우 처리 → JWT 발급 (NEXTAUTH_SECRET)
3) 프론트엔드 → Authorization: Bearer {token} 헤더 첨부
4) FastAPI → PyJWT.decode(token, JWT_SECRET) → user_id/email/provider 추출
5) 첫 로그인 시 POST /api/v1/auth/verify → users 테이블 자동 INSERT
```

### JWT 공유 시크릿 관리
- `NEXTAUTH_SECRET` (프론트) = `JWT_SECRET` (백엔드) — 동일한 값을 각 환경변수에 설정
- 32자 이상 랜덤 문자열 사용 (예: `openssl rand -base64 32`)

### Alternatives Considered
- **이메일/비밀번호 JWT**: 비밀번호 해시·재설정 플로우 추가 복잡도. 소셜 로그인이 이미 결정되어 불필요.
- **Supabase Auth / Auth0**: 외부 인증 서비스로 추가 비용 발생. 소규모 프로젝트에 과도함.
- **세션 기반 인증**: Stateless 설계 요구사항과 충돌 (AWS ECS 이관 시 세션 공유 문제).

### Key Notes
- 비로그인 사용자: 종목 검색, 대시보드, AI 분석 사용 가능 (관심 종목/점수 비교는 로그인 필요)
- Kakao OAuth 설정: [Kakao Developers](https://developers.kakao.com) 앱 등록 필요. 승인된 리다이렉트 URI 설정 필수.
- `users` 테이블: `hashed_password` 제거, `provider` + `provider_account_id` 추가 (data-model.md 참조)
- `requirements.txt`: `passlib[bcrypt]` 제거, `PyJWT` 추가

---

## 6. AWS 이관 대비 설계

### Decision
Dockerfile (멀티스테이지 빌드) + 환경변수 외부화 + Stateless 서버

### Rationale
- 처음부터 컨테이너화하면 Railway → AWS ECS Fargate/App Runner 이관 시 코드 변경 없이 이미지만 재배포
- `DATABASE_URL` 환경변수 하나로 DB 연결 관리 → Railway PostgreSQL URL을 AWS RDS URL로 교체만으로 이관 완료

### Dockerfile 구조
```dockerfile
# 빌드 스테이지
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 실행 스테이지
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY . .
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Key Notes
- 로깅은 `structlog` 또는 Python 표준 `logging`으로 stdout 출력 → CloudWatch 자동 수집
- `/health` 엔드포인트: DB 연결 상태 + 응답 시간 포함
- 세션 데이터를 서버 메모리에 저장하지 않음 (JWT 검증만)

---

## 7. Rate Limiting

### Decision
`slowapi` (FastAPI용 `limits` 기반 rate limiter) — 분당 30회

### Rationale
- `slowapi`는 FastAPI와 네이티브 통합이며, 설정이 데코레이터 방식으로 간단
- 분당 30회는 개인 투자자 수준의 정상 사용 패턴을 수용하면서 Claude API 남용을 방지하는 적정 수준

### Key Notes
- AI 분석 엔드포인트(`/api/v1/ai/analyze`)는 더 낮은 제한 적용 (분당 5회) — Claude API 호출 비용 관리
- Rate limit 초과 시 HTTP 429 + `Retry-After` 헤더 반환
