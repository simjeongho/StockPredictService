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


def _find_json_object(text: str, start: int) -> str | None:
    """start 위치의 '{'부터 대응하는 '}'까지의 문자열을 반환한다."""
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def extract_buy_score(text: str) -> dict | None:
    """
    응답 전체 텍스트에서 buy_score JSON 블록을 추출한다.
    파싱 실패 시 None 반환.
    """
    # 코드 블록 내 JSON 우선 시도 (중첩 JSON 대응: 직접 탐색)
    for cb_match in re.finditer(r"```(?:json)?\s*", text):
        start = text.find("{", cb_match.end())
        if start == -1:
            continue
        candidate = _find_json_object(text, start)
        if candidate:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

    # 인라인 JSON 시도: "buy_score" 키가 포함된 모든 { 블록 탐색
    for kw_match in re.finditer(r'"buy_score"\s*:', text):
        # buy_score 키 앞의 가장 가까운 '{' 찾기
        start = text.rfind("{", 0, kw_match.start())
        if start == -1:
            continue
        candidate = _find_json_object(text, start)
        if candidate:
            try:
                return json.loads(candidate)
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
