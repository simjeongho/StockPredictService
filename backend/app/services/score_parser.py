"""Claude 응답 텍스트에서 buy_score JSON 블록을 추출한다."""
import json
import re
import logging

logger = logging.getLogger(__name__)

SCORE_LABELS = {
    (0, 20): "강력 매도",
    (21, 40): "매도 고려",
    (41, 60): "중립",
    (61, 80): "매수 고려",
    (81, 100): "강력 매수",
}


def score_to_label(score: int) -> str:
    for (low, high), label in SCORE_LABELS.items():
        if low <= score <= high:
            return label
    return "중립"


def extract_buy_score(text: str) -> dict | None:
    """
    응답 전체 텍스트에서 buy_score JSON 블록을 정규식으로 추출한다.
    파싱 실패 시 None 반환.
    """
    # 코드 블록 내 JSON 우선 시도
    code_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    # 인라인 JSON 시도
    pattern = r'\{[^{}]*"buy_score"[^{}]*\{.*?\}.*?\}'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.warning("buy_score JSON 추출 실패")
    return None


def parse_scores(text: str) -> dict | None:
    """
    buy_score JSON을 파싱하여 정규화된 점수 딕셔너리를 반환한다.
    반환 구조: {short_term, mid_term, long_term} 각각 {period, score, label}
    """
    raw = extract_buy_score(text)
    if not raw:
        return None

    try:
        bs = raw.get("buy_score", raw)
        short = bs.get("short_term", {})
        mid = bs.get("mid_term", {})
        long_ = bs.get("long_term", {})

        def norm(term: dict) -> dict:
            score = int(term.get("score", 50))
            return {
                "period": term.get("period", ""),
                "score": max(0, min(100, score)),
                "label": term.get("label") or score_to_label(score),
            }

        return {
            "short_term": norm(short),
            "mid_term": norm(mid),
            "long_term": norm(long_),
        }
    except Exception as e:
        logger.warning("buy_score 정규화 실패: %s", e)
        return None
