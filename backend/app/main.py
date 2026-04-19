from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.routers import health, stocks, ai, auth, watchlist, scores, market, admin, history

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="주가 예측 웹 애플리케이션 API",
    description="AI 기반 주가 기술적 분석 서비스",
    version="1.0.0",
)

# Rate Limiting 미들웨어
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(health.router, tags=["헬스체크"])
app.include_router(stocks.router)
app.include_router(ai.router)
app.include_router(auth.router)
app.include_router(watchlist.router)
app.include_router(scores.router)
app.include_router(market.router)
app.include_router(admin.router)
app.include_router(history.router)


# 전역 예외 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_SERVER_ERROR", "message": "서버 오류가 발생했습니다."},
    )
