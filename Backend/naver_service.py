import os
import requests
import json
import re
from datetime import datetime, timedelta


# ────────────────────────────────────────────
# 공통 헤더
# ────────────────────────────────────────────

def _get_headers():
    return {
        "X-Naver-Client-Id":     os.getenv("NAVER_CLIENT_ID"),
        "X-Naver-Client-Secret": os.getenv("NAVER_CLIENT_SECRET"),
    }


# ────────────────────────────────────────────
# 1. 네이버 뉴스 - 브랜드
# ────────────────────────────────────────────

def collect_brand_news(brand_name: str, max_articles: int = 100) -> dict:
    url    = "https://openapi.naver.com/v1/search/news.json"
    params = {"query": brand_name, "display": min(max_articles, 100), "sort": "date"}

    try:
        response = requests.get(url, headers=_get_headers(), params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[NaverNews] API 오류: {e}")
        return {"total_articles": 0, "comments": []}

    texts = []
    for item in data.get("items", []):
        title       = _strip_html(item.get("title", ""))
        description = _strip_html(item.get("description", ""))
        combined    = f"{title}. {description}".strip()
        if combined:
            texts.append(combined)

    print(f"[NaverNews] 수집된 기사 수: {len(texts)}")
    return {"total_articles": len(texts), "comments": texts}


# ────────────────────────────────────────────
# 2. 네이버 뉴스 - 브랜드 + 인물 조합
# ────────────────────────────────────────────

def collect_person_news(brand_name: str, person_name: str, max_articles: int = 30) -> dict:
    """브랜드 + 인물명 조합으로 뉴스 검색"""
    query  = f"{brand_name} {person_name}"
    url    = "https://openapi.naver.com/v1/search/news.json"
    params = {"query": query, "display": min(max_articles, 100), "sort": "date"}

    try:
        response = requests.get(url, headers=_get_headers(), params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[NaverNews] 인물 뉴스 오류 ({person_name}): {e}")
        return {"total_articles": 0, "comments": []}

    texts = []
    for item in data.get("items", []):
        title       = _strip_html(item.get("title", ""))
        description = _strip_html(item.get("description", ""))
        combined    = f"{title}. {description}".strip()
        if combined:
            texts.append(combined)

    print(f"[NaverNews] '{person_name}' 관련 기사: {len(texts)}개")
    return {"total_articles": len(texts), "comments": texts}


# ────────────────────────────────────────────
# 3. 연관 인물 리스크 일괄 분석
# ────────────────────────────────────────────

MIN_ARTICLES_FOR_PERSON = 5


def analyze_person_risks(
    brand_name:   str,
    person_names: list,   # BrandPerson에서 가져온 이름 리스트
    analyzer,
    sentiment_fn
) -> tuple:
    """
    등록된 인물 목록에 대해 뉴스 수집 → 감성 분석 → 리스크 계산.

    반환:
        person_results   : 인물별 리스크 결과 리스트
        person_risk_score: 브랜드 최종 리스크 가중치 (0~20점)
    """

    person_results = []

    for name in person_names:
        news_data = collect_person_news(brand_name, name, max_articles=30)
        total     = news_data["total_articles"]

        if total < MIN_ARTICLES_FOR_PERSON:
            print(f"[PersonRisk] '{name}' 기사 {total}개 → 분석 제외 (최소 {MIN_ARTICLES_FOR_PERSON}개 필요)")
            continue

        texts      = news_data["comments"]
        sentiments = sentiment_fn(texts)
        result     = analyzer.calculate_ratios(sentiments)

        impact_message = _get_impact_message(result["risk_level"])

        person_results.append({
            "name":              name,
            "articles_analyzed": total,
            "positive_ratio":    result["positive_ratio"],
            "negative_ratio":    result["negative_ratio"],
            "neutral_ratio":     result["neutral_ratio"],
            "risk_score":        result["risk_score"],
            "risk_level":        result["risk_level"],
            "impact_message":    impact_message,
        })

        print(f"[PersonRisk] '{name}' → {result['risk_score']} ({result['risk_level']})")

    person_risk_score = _calc_person_risk_weight(person_results)
    return person_results, round(person_risk_score, 2)


def _get_impact_message(risk_level: str) -> str:
    return {
        "low":      "브랜드 이미지에 긍정적",
        "moderate": "브랜드 이미지에 중립적, 모니터링 필요",
        "high":     "브랜드 이미지에 부정적 영향 가능성",
        "critical": "브랜드 이미지에 심각한 부정적 영향",
    }.get(risk_level, "알 수 없음")


def _calc_person_risk_weight(person_results: list) -> float:
    """인물 평균 리스크의 20%를 가중치로 사용 (최대 20점)"""
    if not person_results:
        return 0.0
    avg_score = sum(p["risk_score"] for p in person_results) / len(person_results)
    return min(20.0, avg_score * 0.2)


# ────────────────────────────────────────────
# 4. 데이터랩 쇼핑인사이트
# ────────────────────────────────────────────

CATEGORY_MAP = {
    "패션의류":   "50000000",
    "패션잡화":   "50000001",
    "화장품미용": "50000002",
    "가전디지털": "50000003",
    "스포츠":     "50000004",
    "생활용품":   "50000005",
    "식품":       "50000006",
}
DEFAULT_CATEGORY = "패션의류"


def get_shopping_trend(brand_name: str, category: str = DEFAULT_CATEGORY) -> dict:
    url        = "https://openapi.naver.com/v1/datalab/shopping/categories"
    end_date   = datetime.today()
    start_date = end_date - timedelta(days=29)
    cat_id     = CATEGORY_MAP.get(category, CATEGORY_MAP[DEFAULT_CATEGORY])

    body = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate":   end_date.strftime("%Y-%m-%d"),
        "timeUnit":  "date",
        "category":  [{"name": brand_name, "param": [cat_id]}]
    }

    headers = {**_get_headers(), "Content-Type": "application/json"}

    try:
        response = requests.post(url, headers=headers, data=json.dumps(body), timeout=10)
        if response.status_code != 200:
            print(f"[DataLab] 오류: {response.status_code} / {response.text}")
            return _empty_trend()
        data = response.json()
    except Exception as e:
        print(f"[DataLab] API 오류: {e}")
        return _empty_trend()

    results = data.get("results", [])
    if not results:
        return _empty_trend()

    trend_data     = [{"period": r["period"], "ratio": r["ratio"]} for r in results[0].get("data", [])]
    spike_detected, spike_ratio = _detect_spike(trend_data)
    trend_score    = _calc_trend_score(spike_detected, spike_ratio)

    return {
        "trend_data":     trend_data,
        "spike_detected": spike_detected,
        "spike_ratio":    round(spike_ratio, 2),
        "trend_score":    round(trend_score, 2)
    }


# ────────────────────────────────────────────
# 내부 유틸
# ────────────────────────────────────────────

def _empty_trend() -> dict:
    return {"trend_data": [], "spike_detected": False, "spike_ratio": 1.0, "trend_score": 0.0}


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


def _detect_spike(trend_data: list) -> tuple:
    if len(trend_data) < 14:
        return False, 1.0
    recent_7     = [d["ratio"] for d in trend_data[-7:]]
    previous     = [d["ratio"] for d in trend_data[:-7]]
    avg_recent   = sum(recent_7) / len(recent_7)
    avg_previous = sum(previous) / len(previous) if previous else 1.0
    if avg_previous == 0:
        return False, 1.0
    spike_ratio = avg_recent / avg_previous
    return spike_ratio >= 1.5, spike_ratio


def _calc_trend_score(spike_detected: bool, spike_ratio: float) -> float:
    if not spike_detected:
        return 0.0
    return min(20.0, (spike_ratio - 1.0) * 10)