"""
API 연결 통합 테스트
실행: pytest tests/test_api_connections.py -v
전제: uvicorn app.main:app --port 8000 으로 백엔드 서버 실행 중이어야 함
"""
import pytest
import httpx

BASE_URL = "http://localhost:8000"

# 외부 API(yfinance) 호출 포함 테스트는 타임아웃을 넉넉히 설정
FAST_TIMEOUT = httpx.Timeout(10.0)
SLOW_TIMEOUT = httpx.Timeout(60.0)  # yfinance 외부 API 호출 포함


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=FAST_TIMEOUT) as c:
        yield c


def test_health(client):
    """GET /health → 200"""
    r = client.get("/health")
    assert r.status_code == 200


def test_stock_search(client):
    """GET /api/v1/stocks/search?q=AAPL → 200 + 리스트 반환"""
    r = client.get("/api/v1/stocks/search", params={"q": "AAPL"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list), "응답이 list 타입이어야 합니다"


def test_stock_search_kr(client):
    """GET /api/v1/stocks/search?q=삼성&market=kr → 200 + 리스트"""
    r = client.get("/api/v1/stocks/search", params={"q": "삼성", "market": "kr"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_stock_price(client):
    """GET /api/v1/stocks/AAPL/price → 200 + 'candles' 키 존재 (yfinance 사용, 60s 타임아웃)"""
    r = client.get(
        "/api/v1/stocks/AAPL/price",
        params={"period": "1m"},
        timeout=SLOW_TIMEOUT,
    )
    assert r.status_code == 200, (
        f"AAPL price 조회 실패 (status={r.status_code}): {r.text[:200]}"
    )
    data = r.json()
    assert "candles" in data, f"'candles' 키가 없습니다. 실제 키: {list(data.keys())}"
    assert len(data["candles"]) > 0, "캔들 데이터가 비어 있습니다"


def test_stock_indicators(client):
    """GET /api/v1/stocks/AAPL/indicators → 200 + 지표 키 존재 (yfinance 사용, 60s 타임아웃)"""
    r = client.get(
        "/api/v1/stocks/AAPL/indicators",
        timeout=SLOW_TIMEOUT,
    )
    assert r.status_code == 200, (
        f"AAPL indicators 조회 실패 (status={r.status_code}): {r.text[:200]}"
    )
    data = r.json()
    assert "rsi" in data or "sma" in data, (
        f"기술 지표 키가 없습니다. 실제 키: {list(data.keys())}"
    )


def test_market_summary(client):
    """GET /api/v1/stocks/market/summary → 200 + 리스트 (yfinance 3개 지수, 60s 타임아웃)"""
    r = client.get(
        "/api/v1/stocks/market/summary",
        timeout=SLOW_TIMEOUT,
    )
    assert r.status_code == 200, (
        f"market summary 실패 (status={r.status_code}): {r.text[:200]}"
    )
    assert isinstance(r.json(), list), "시장 요약 응답이 list 타입이어야 합니다"


def test_watchlist_requires_auth(client):
    """
    GET /api/v1/watchlist (토큰 없음) → 401 또는 403
    주의: DB(localhost:5432)가 실행 중이어야 함. 미실행 시 타임아웃 발생.
    """
    r = client.get("/api/v1/watchlist", timeout=SLOW_TIMEOUT)
    assert r.status_code in (401, 403), (
        f"인증 없이 접근 시 401/403이어야 합니다. 실제: {r.status_code}\n"
        f"DB가 실행 중인지 확인: localhost:5432"
    )


def test_auth_verify_invalid_token(client):
    """POST /api/v1/auth/verify (잘못된 토큰) → 401 또는 403"""
    r = client.post(
        "/api/v1/auth/verify",
        headers={"Authorization": "Bearer invalid_token_for_testing"},
    )
    assert r.status_code in (401, 403), (
        f"잘못된 토큰으로 verify 시 401/403이어야 합니다. 실제: {r.status_code}"
    )
