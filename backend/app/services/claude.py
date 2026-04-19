"""Claude API SSE 스트리밍 서비스."""
import json
import logging
from typing import AsyncGenerator

import httpx
import anthropic

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """당신은 주식 기술적 분석 및 시장 맥락 분석 전문가입니다.
제공된 기술 지표 데이터와 현재 시장 주요 이슈를 종합하여 종목을 분석합니다.

출력 순서 (반드시 준수):
1. 가장 먼저 아래 JSON 블록을 출력하세요. 다른 텍스트 없이 JSON만 먼저 출력합니다.

```json
{
  "buy_score": {
    "short_term": {"period": "1주", "score": 0-100, "label": "강력 매도|매도 고려|중립|매수 고려|강력 매수"},
    "mid_term": {"period": "3개월", "score": 0-100, "label": "강력 매도|매도 고려|중립|매수 고려|강력 매수"},
    "long_term": {"period": "1년", "score": 0-100, "label": "강력 매도|매도 고려|중립|매수 고려|강력 매수"}
  }
}
```

2. JSON 블록 출력 후 빈 줄을 두고 상세 분석 리포트를 작성하세요.

분석 규칙:
- 반드시 제공된 실제 수치 데이터를 근거로 분석하세요.
- 현재 시장 주요 이슈가 해당 종목에 미치는 영향을 검토하세요.
- 과거 유사 시장 상황(금리 변동, 지정학적 이슈, 섹터 이슈 등) 발생 시 이 종목 또는 동일 섹터 주가가 어떻게 반응했는지를 추론 근거로 사용하세요.
- 모든 예측은 확률적이며 확실하지 않음을 명시하세요.

점수 기준: 0-20 강력 매도, 21-40 매도 고려, 41-60 중립, 61-80 매수 고려, 81-100 강력 매수
"""

MODEL = "claude-sonnet-4-6"
MODEL_HAIKU = "claude-haiku-4-5-20251001"

# 시도 순서: web_search 포함 → 툴 없이 (fallback)
_TOOL_ATTEMPTS = [
    [{"type": "web_search_20250305", "name": "web_search"}],
    [],  # web_search 지원 안 될 때 fallback
]

COMPARISON_SYSTEM_PROMPT = """당신은 주식 기술적 분석 전문가입니다.
여러 종목의 기술 지표를 비교 분석하고 각 종목의 상대적 강점과 약점을 제시합니다.

분석 규칙:
1. 각 종목을 공정하게 비교하세요.
2. 단기(1주)·중기(3개월)·장기(1년) 관점에서 각 종목의 투자 매력도를 평가하세요.
3. 마지막에 종목별 추천 순위와 근거를 요약하세요.
4. 모든 예측은 확률적이며 확실하지 않음을 명시하세요.
"""

MARKET_ISSUES_SYSTEM_PROMPT = """당신은 글로벌 금융 시장 분석가입니다.
현재 주식 시장에 영향을 미치는 주요 이슈를 간결하고 명확하게 설명합니다.

출력 형식:
- 각 이슈를 번호 목록으로 작성하세요 (1. 2. 3. ...)
- 각 이슈마다: **제목** (굵게), 이슈 설명 (2-3문장), 시장 영향 한 줄 요약
- 최신 시장 데이터와 뉴스를 참고하여 작성하세요
"""


async def stream_analysis(
    ticker: str,
    market: str,
    indicators_snapshot: dict,
    market_issues: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Claude API SSE 스트리밍 분석.
    각 청크는 'data: {json}\\n\\n' 형식으로 yield.
    [DONE]/disclaimer 는 호출 측(ai.py)에서 전송.
    """
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        http_client=httpx.AsyncClient(timeout=httpx.Timeout(120.0)),
    )

    user_message = (
        f"종목: {ticker.upper()} ({market.upper()})\n\n"
        f"## 기술 지표 데이터 (현재 기준)\n"
        f"{json.dumps(indicators_snapshot, ensure_ascii=False, indent=2)}\n\n"
    )
    if market_issues:
        user_message += (
            "## 현재 시장 주요 이슈\n"
            f"{market_issues}\n\n"
        )
    user_message += (
        "위 데이터를 기반으로 기술적 분석을 진행해 주세요. "
        "현재 시장 이슈가 이 종목에 미치는 영향과, "
        "과거 유사 사건 발생 시 이 종목의 주가 반응 패턴을 분석에 포함하세요. "
        "단기(1주), 중기(3개월), 장기(1년) 전망과 예측 점수를 포함해 주세요."
    )

    last_error: Exception | None = None

    for tools in _TOOL_ATTEMPTS:
        try:
            call_kwargs: dict = dict(
                model=MODEL,
                max_tokens=8192,
                system=[{
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{"role": "user", "content": user_message}],
            )
            if tools:
                call_kwargs["tools"] = tools

            logger.info(
                "Claude 분석 호출: model=%s, tools=%s",
                MODEL,
                [t["name"] for t in tools] if tools else "없음",
            )

            async with client.messages.stream(**call_kwargs) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'text': text}, ensure_ascii=False)}\n\n"

            logger.info("Claude 분석 완료 (tools=%s)", bool(tools))
            return  # 성공

        except anthropic.APIStatusError as e:
            last_error = e
            logger.warning(
                "Claude APIStatusError (tools=%s, status=%s): %s",
                bool(tools),
                e.status_code,
                e.message,
            )
            if tools:
                logger.info("web_search 없이 재시도합니다.")
                continue  # 다음 시도 (툴 없이)
            # 툴 없이도 실패 → 에러 반환

        except httpx.TimeoutException as e:
            last_error = e
            logger.warning("Claude 타임아웃 (tools=%s): %s", bool(tools), e)
            if tools:
                continue
            # 재시도해도 타임아웃이면 포기

        except Exception as e:
            last_error = e
            logger.error("Claude 예상치 못한 오류 (tools=%s): %s %s", bool(tools), type(e).__name__, e)
            break  # 알 수 없는 오류는 즉시 중단

    # 모든 시도 실패
    err_type = type(last_error).__name__ if last_error else "Unknown"
    err_msg = str(last_error)[:200] if last_error else ""
    logger.error("Claude 최종 실패: %s — %s", err_type, err_msg)

    yield (
        f"data: {json.dumps({'type': 'error', 'text': f'AI 분석 서비스 연결에 실패했습니다. ({err_type})'}, ensure_ascii=False)}\n\n"
    )


async def stream_comparison(
    tickers_data: list[dict],
) -> AsyncGenerator[str, None]:
    """여러 종목 비교 분석 SSE 스트리밍 (Sonnet 4.6)."""
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        http_client=httpx.AsyncClient(timeout=httpx.Timeout(120.0)),
    )

    user_message = (
        f"다음 {len(tickers_data)}개 종목을 비교 분석해 주세요:\n\n"
        + json.dumps(tickers_data, ensure_ascii=False, indent=2)
        + "\n\n각 종목의 기술 지표를 비교하고 상대적 투자 매력도를 단기·중기·장기 관점에서 평가해 주세요."
    )

    last_error: Exception | None = None

    for tools in _TOOL_ATTEMPTS:
        try:
            call_kwargs: dict = dict(
                model=MODEL,
                max_tokens=4096,
                system=COMPARISON_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            if tools:
                call_kwargs["tools"] = tools

            async with client.messages.stream(**call_kwargs) as stream:
                async for text_chunk in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'text': text_chunk}, ensure_ascii=False)}\n\n"

            return

        except anthropic.APIStatusError as e:
            last_error = e
            if tools:
                continue

        except httpx.TimeoutException as e:
            last_error = e
            if tools:
                continue

        except Exception as e:
            last_error = e
            break

    err_type = type(last_error).__name__ if last_error else "Unknown"
    yield f"data: {json.dumps({'type': 'error', 'text': f'비교 분석 서비스 연결에 실패했습니다. ({err_type})'}, ensure_ascii=False)}\n\n"


async def stream_market_issues(
    count: int = 5,
) -> AsyncGenerator[str, None]:
    """시장 이슈 생성 SSE 스트리밍 (Haiku 4.5, web_search)."""
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        http_client=httpx.AsyncClient(timeout=httpx.Timeout(60.0)),
    )

    user_message = (
        f"현재 글로벌 주식 시장에 영향을 미치는 주요 이슈 {count}개를 최신 뉴스를 참고하여 분석해 주세요. "
        "각 이슈의 시장 영향도와 투자자가 주의해야 할 점을 포함해 주세요."
    )

    last_error: Exception | None = None

    for tools in _TOOL_ATTEMPTS:
        try:
            call_kwargs: dict = dict(
                model=MODEL_HAIKU,
                max_tokens=2048,
                system=MARKET_ISSUES_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            if tools:
                call_kwargs["tools"] = tools

            async with client.messages.stream(**call_kwargs) as stream:
                async for text_chunk in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'text': text_chunk}, ensure_ascii=False)}\n\n"

            return

        except anthropic.APIStatusError as e:
            last_error = e
            if tools:
                continue

        except Exception as e:
            last_error = e
            break

    err_type = type(last_error).__name__ if last_error else "Unknown"
    yield f"data: {json.dumps({'type': 'error', 'text': f'시장 이슈 서비스 연결에 실패했습니다. ({err_type})'}, ensure_ascii=False)}\n\n"


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

    chat_system = (
        "당신은 주식 분석 AI 어시스턴트입니다. "
        "주식 관련 질문에만 답변하세요. "
        "주식 분석 범위를 벗어난 질문에는 정중히 거절하고 주식 관련 질문을 안내하세요. "
        "모든 분석/예측 응답에는 면책 고지를 포함하세요."
    )

    context = ""
    if ticker and indicators_snapshot:
        context = (
            f"\n\n## 참고 종목 데이터: {ticker.upper()} ({market})\n"
            f"{json.dumps(indicators_snapshot, ensure_ascii=False, indent=2)}"
        )

    last_error: Exception | None = None

    for tools in _TOOL_ATTEMPTS:
        try:
            call_kwargs: dict = dict(
                model=MODEL,
                max_tokens=2048,
                system=chat_system,
                messages=[{"role": "user", "content": message + context}],
            )
            if tools:
                call_kwargs["tools"] = tools

            async with client.messages.stream(**call_kwargs) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'text': text}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'disclaimer', 'disclaimer': '본 분석은 AI 참고 자료이며 투자 조언이 아닙니다.'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        except anthropic.APIStatusError as e:
            last_error = e
            if tools:
                continue

        except Exception as e:
            last_error = e
            break

    logger.error("챗봇 스트리밍 최종 실패: %s", last_error)
    yield f"data: {json.dumps({'type': 'text', 'text': '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"
