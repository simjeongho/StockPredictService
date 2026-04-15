"""Claude API SSE 스트리밍 서비스."""
import json
import logging
from typing import AsyncGenerator

import httpx
import anthropic

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """당신은 주식 기술적 분석 전문가입니다.
제공된 기술 지표 데이터를 기반으로 종목을 분석하고, 단기(1주)·중기(3개월)·장기(1년) 전망을 제공합니다.

분석 규칙:
1. 반드시 제공된 실제 수치 데이터를 근거로 분석하세요.
2. 모든 예측은 확률적이며 확실하지 않음을 명시하세요.
3. 분석 마지막에 반드시 아래 JSON 형식으로 예측 점수를 포함하세요:

```json
{
  "buy_score": {
    "short_term": {"period": "1주", "score": 0-100, "label": "강력 매도|매도 고려|중립|매수 고려|강력 매수"},
    "mid_term": {"period": "3개월", "score": 0-100, "label": "강력 매도|매도 고려|중립|매수 고려|강력 매수"},
    "long_term": {"period": "1년", "score": 0-100, "label": "강력 매도|매도 고려|중립|매수 고려|강력 매수"}
  }
}
```

점수 기준: 0-20 강력 매도, 21-40 매도 고려, 41-60 중립, 61-80 매수 고려, 81-100 강력 매수
"""

DISCLAIMER = "본 분석은 AI가 생성한 참고 자료이며, 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다."

MAX_RETRIES = 2


async def stream_analysis(
    ticker: str,
    market: str,
    indicators_snapshot: dict,
) -> AsyncGenerator[str, None]:
    """
    Claude API SSE 스트리밍 분석.
    각 청크는 'data: {json}\\n\\n' 형식으로 yield된다.
    """
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        http_client=httpx.AsyncClient(timeout=httpx.Timeout(60.0)),
    )

    user_message = f"""종목: {ticker.upper()} ({market.upper()})

## 기술 지표 데이터 (현재 기준)
{json.dumps(indicators_snapshot, ensure_ascii=False, indent=2)}

위 데이터를 기반으로 기술적 분석을 진행해 주세요. 단기(1주), 중기(3개월), 장기(1년) 전망과 예측 점수를 포함해 주세요."""

    full_text = ""

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for text in stream.text_stream:
                    full_text += text
                    yield f"data: {json.dumps({'type': 'text', 'text': text}, ensure_ascii=False)}\n\n"

            # 면책 고지 이벤트
            yield f"data: {json.dumps({'type': 'disclaimer', 'disclaimer': DISCLAIMER}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        except (httpx.TimeoutException, anthropic.APIStatusError) as e:
            if attempt < MAX_RETRIES:
                logger.warning("Claude API 오류 (재시도 %d/%d): %s", attempt + 1, MAX_RETRIES, e)
                continue
            logger.error("Claude API 최종 실패: %s", e)
            yield f"data: {json.dumps({'type': 'text', 'text': 'AI 분석 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return


async def stream_chat(
    ticker: str | None,
    market: str | None,
    message: str,
    indicators_snapshot: dict | None,
) -> AsyncGenerator[str, None]:
    """챗봇 질의응답 SSE 스트리밍."""
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        http_client=httpx.AsyncClient(timeout=httpx.Timeout(60.0)),
    )

    chat_system = """당신은 주식 분석 AI 어시스턴트입니다.
주식 관련 질문에만 답변하세요. 주식 분석 범위를 벗어난 질문(날씨, 일반 상식 등)에는 정중히 거절하고 주식 관련 질문을 안내하세요.
모든 분석/예측 응답에는 면책 고지를 포함하세요."""

    context = ""
    if ticker and indicators_snapshot:
        context = f"\n\n## 참고 종목 데이터: {ticker.upper()} ({market})\n{json.dumps(indicators_snapshot, ensure_ascii=False, indent=2)}"

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                system=chat_system,
                messages=[{"role": "user", "content": message + context}],
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'text': text}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'disclaimer', 'disclaimer': DISCLAIMER}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        except Exception as e:
            if attempt < MAX_RETRIES:
                continue
            logger.error("챗봇 스트리밍 오류: %s", e)
            yield f"data: {json.dumps({'type': 'text', 'text': '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
