import os
import requests
import re
from concurrent.futures import ThreadPoolExecutor
from services.youtube_service import collect_brand_and_person_comments


# ────────────────────────────────────────────
# 공통 헤더
# ────────────────────────────────────────────

def _get_headers():
    client_id     = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")

    # ✅ API 키 누락 체크
    if not client_id or not client_secret:
        print("[NaverAPI] ❌ 환경변수 누락 — NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 확인 필요")
    else:
        print(f"[NaverAPI] ✅ 인증 헤더 로드 완료 (ID: {client_id[:6]}...)")

    return {
        "X-Naver-Client-Id":     client_id,
        "X-Naver-Client-Secret": client_secret,
    }


def _fetch_naver_api(url, query, max_items):
    api_type = url.split("/")[-1].replace(".json", "").upper()  # NEWS / BLOG / CAFEARTICLE
    print(f"  [Naver:{api_type}] 수집 시작 → 쿼리: '{query}' / 최대 {max_items}개")

    headers = _get_headers()
    texts   = []
    items   = []
    start   = 1
    page    = 1

    while len(texts) < max_items:
        params = {
            "query":   query,
            "display": min(100, max_items - len(texts)),
            "start":   start,
            "sort":    "date"
        }

        try:
            res = requests.get(url, headers=headers, params=params, timeout=10)

            # ✅ HTTP 상태 코드 로그
            print(f"  [Naver:{api_type}] 페이지 {page} 요청 → HTTP {res.status_code}")

            if res.status_code == 401:
                print(f"  [Naver:{api_type}] ❌ 인증 실패 — API 키를 확인하세요")
                break
            elif res.status_code == 429:
                print(f"  [Naver:{api_type}] ❌ 요청 한도 초과 (Rate Limit)")
                break

            res.raise_for_status()
            data = res.json()

        except requests.exceptions.Timeout:
            print(f"  [Naver:{api_type}] ❌ 타임아웃 발생 (10초 초과)")
            break
        except requests.exceptions.ConnectionError:
            print(f"  [Naver:{api_type}] ❌ 네트워크 연결 오류")
            break
        except Exception as e:
            print(f"  [Naver:{api_type}] ❌ 오류: {e}")
            break

        results = data.get("items", [])

        # ✅ 결과 없음 감지
        if not results:
            print(f"  [Naver:{api_type}] ⚠️ 결과 없음 — 수집 종료 (총 {len(texts)}개)")
            break

        before = len(texts)
        for item in results:
            title = _strip_html(item.get("title", ""))
            desc  = _strip_html(item.get("description", ""))
            text  = f"{title}. {desc}".strip()

            link = item.get("originallink") or item.get("link", "")
            pub  = item.get("pubDate", "")

            if text:
                texts.append(text)
                items.append({
                    "title":    title,
                    "url":      link,
                    "pub_date": pub,
                    "text":     text,
                })

        added = len(texts) - before
        print(f"  [Naver:{api_type}] 페이지 {page} → {added}개 추가 (누적 {len(texts)}개)")

        start += 100
        page  += 1

        if len(results) < 100:
            print(f"  [Naver:{api_type}] ✅ 마지막 페이지 도달 — 수집 완료 (총 {len(texts)}개)")
            break

    return texts, items


# ────────────────────────────────────────────
# 1. 브랜드 전체 수집 (뉴스 + 블로그 + 카페)
# ────────────────────────────────────────────

def collect_brand_all(brand_name: str, max_items: int = 100) -> dict:
    print(f"\n{'='*50}")
    print(f"[BrandCollect] 🔍 브랜드 수집 시작: '{brand_name}' (채널별 최대 {max_items}개)")
    print(f"{'='*50}")

    news_url = "https://openapi.naver.com/v1/search/news.json"
    blog_url = "https://openapi.naver.com/v1/search/blog.json"
    cafe_url = "https://openapi.naver.com/v1/search/cafearticle.json"

    with ThreadPoolExecutor(max_workers=3) as executor:

        news_future = executor.submit(
            _fetch_naver_api,
            news_url,
            brand_name,
            max_items
        )

        blog_future = executor.submit(
            _fetch_naver_api,
            blog_url,
            brand_name,
            max_items
        )

        cafe_future = executor.submit(
            _fetch_naver_api,
            cafe_url,
            brand_name,
            max_items
        )

        news_texts, news_items = news_future.result()
        blog_texts, blog_items = blog_future.result()
        cafe_texts, cafe_items = cafe_future.result()

    all_texts = news_texts + blog_texts + cafe_texts
    all_items = news_items + blog_items + cafe_items

    print(f"\n[BrandCollect] ✅ 수집 완료 → 뉴스:{len(news_texts)} | 블로그:{len(blog_texts)} | 카페:{len(cafe_texts)} | 합계:{len(all_texts)}개")

    # ✅ 수집량 경고
    if len(all_texts) == 0:
        print(f"[BrandCollect] ❌ 수집된 데이터 없음 — 브랜드명 또는 API 키 확인 필요")
    elif len(all_texts) < 10:
        print(f"[BrandCollect] ⚠️ 수집량 적음 ({len(all_texts)}개) — 분석 신뢰도 낮을 수 있음")

    return {
    "news": news_items,
    "blogs": blog_items,
    "cafes": cafe_items,

    "news_texts": news_texts,
    "blog_texts": blog_texts,
    "cafe_texts": cafe_texts,

    "total_articles": len(all_texts),
}


# ────────────────────────────────────────────
# 2. negative 확률 높은 순 top N 기사 추출
# ────────────────────────────────────────────

def extract_top_negative_articles(articles: list, scored_results: list, top_n: int = 3) -> list:
    if not articles or not scored_results:
        print("[TopNegative] ⚠️ 입력 데이터 없음 — 빈 리스트 반환")
        return []

    paired = [
        {
            "title":     a["title"],
            "url":       a["url"],
            "pub_date":  a["pub_date"],
            "sentiment": s["sentiment"],
            "neg_prob":  s["neg_prob"],
        }
        for a, s in zip(articles, scored_results)
    ]

    paired.sort(key=lambda x: x["neg_prob"], reverse=True)

    top = [
        {
            "title":    a["title"],
            "url":      a["url"],
            "pub_date": a["pub_date"],
            "neg_prob": round(a["neg_prob"], 4),
        }
        for a in paired[:top_n]
    ]

    print(f"[TopNegative] 상위 {len(top)}개 부정 기사 추출 완료")
    for i, t in enumerate(top, 1):
        print(f"  {i}. neg_prob={t['neg_prob']} | {t['title'][:40]}...")

    return top


# ────────────────────────────────────────────
# 3. 연관 인물 리스크 일괄 분석
# ────────────────────────────────────────────

MIN_ARTICLES_FOR_PERSON = 1


def analyze_person_risks(
    brand_name:        str,
    person_names:      list,
    analyzer,
    sentiment_score_fn
) -> tuple:
    print(f"\n{'='*50}")
    print(f"[PersonRisk] 👤 연관 인물 분석 시작: {person_names}")
    print(f"{'='*50}")

    person_results = []

    for name in person_names:
        print(f"\n[PersonRisk] ── '{name}' 처리 중...")

        data  = collect_person_all(brand_name, name, max_items=30)
        youtube_data = collect_brand_and_person_comments(
            brand_name,
            [name],
            max_videos=5
        )
        total = data["total_articles"]

        # ✅ 기사 수 부족 감지
        if total < MIN_ARTICLES_FOR_PERSON:
            print(f"[PersonRisk] ⚠️ '{name}' — 기사 수 부족 ({total}개) → 스킵")
            continue

        youtube_comments = []

        for video in youtube_data["videos"]:
            youtube_comments.extend(
                [c["text"] for c in video["comments"]]
            )

        texts = data["comments"] + youtube_comments
        articles = data["articles"]

        print(f"[PersonRisk] '{name}' → 감성 분석 중... ({total}개)")
        scored_results = sentiment_score_fn(texts)
        sentiments     = [r["sentiment"] for r in scored_results]

        result       = analyzer.calculate_risk(scored_results)
        top_articles = extract_top_negative_articles(articles, scored_results, top_n=3)
        top_videos = []
        for video in youtube_data["videos"]:

            comments = [c["text"] for c in video["comments"]]

            if not comments:
                continue

            scores = sentiment_score_fn(comments)

            neg_ratio = (
                sum(
                    1
                    for s in scores
                    if s["sentiment"] == "negative"
                )
                / len(scores)
            )

            top_videos.append({
                "title": video["title"],
                "url": video["url"],
                "channel": video["channel"],
                "neg_ratio": round(neg_ratio, 4),
                "comment_count": len(comments),
            })

        top_videos.sort(
            key=lambda x: x["neg_ratio"],
            reverse=True
        )

        top_videos = top_videos[:3]
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
            "top_articles":      top_articles,
            "top_videos": top_videos,
        })

        # ✅ 리스크 레벨별 이모지
        level_emoji = {
            "low": "🟢", "moderate": "🟡", "high": "🟠", "critical": "🔴"
        }.get(result["risk_level"], "⚪")

        print(f"[PersonRisk] {level_emoji} '{name}' → 점수:{result['risk_score']} ({result['risk_level']}) | 부정:{result['negative_ratio']*100:.1f}% | top기사:{len(top_articles)}개")
        
    print(
        f"\n[PersonRisk] ✅ 전체 인물 분석 완료 → "
        f"{len(person_results)}명 처리"
    )

    return person_results


def _get_impact_message(risk_level: str) -> str:
    return {
        "low":      "부정 신호 미미 — 정기 모니터링 유지",
        "moderate": "부정 신호 감지 — 원인 파악 및 모니터링 강화 필요",
        "high":     "부정 여론 확산 중 — 즉각적인 대응 검토 필요",
        "critical": "브랜드 위기 수준 — 즉시 대응 조치 필요",
    }.get(risk_level, "알 수 없음")




# ────────────────────────────────────────────
# 4. 인물 전체 수집 (뉴스 + 블로그 + 카페)
# ────────────────────────────────────────────

def collect_person_all(brand_name: str, person_name: str, max_items: int = 30) -> dict:
    query = f"{brand_name} {person_name}"

    print(f"\n[PersonCollect] 🔍 '{person_name}' 수집 시작 → 쿼리: '{query}'")

    news_url = "https://openapi.naver.com/v1/search/news.json"
    blog_url = "https://openapi.naver.com/v1/search/blog.json"
    cafe_url = "https://openapi.naver.com/v1/search/cafearticle.json"

    news_texts, news_items = _fetch_naver_api(news_url, query, max_items)
    blog_texts, blog_items = _fetch_naver_api(blog_url, query, max_items)
    cafe_texts, cafe_items = _fetch_naver_api(cafe_url, query, max_items)

    all_texts = news_texts + blog_texts + cafe_texts
    all_items = news_items + blog_items + cafe_items

    print(f"[PersonCollect] ✅ '{person_name}' 수집 완료 → 뉴스:{len(news_texts)} | 블로그:{len(blog_texts)} | 카페:{len(cafe_texts)} | 합계:{len(all_texts)}개")

    if len(all_texts) == 0:
        print(f"[PersonCollect] ❌ '{person_name}' 관련 데이터 없음")

    return {
        "total_articles": len(all_texts),
        "comments":       all_texts,
        "articles":       all_items
    }


# ────────────────────────────────────────────
# 내부 유틸
# ────────────────────────────────────────────

def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()