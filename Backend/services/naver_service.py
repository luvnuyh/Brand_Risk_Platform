import os
import re
import time
import inspect
import requests
from concurrent.futures import ThreadPoolExecutor
from services.youtube_service import collect_brand_and_person_comments

NEWS_URL = "https://openapi.naver.com/v1/search/news.json"
BLOG_URL = "https://openapi.naver.com/v1/search/blog.json"
CAFE_URL = "https://openapi.naver.com/v1/search/cafearticle.json"

# 연관 인물 수집(I/O) 동시 처리 수. 429가 뜨면 2로 낮추기
PERSON_IO_WORKERS = 3

# 요청마다 TCP/TLS 연결을 새로 맺지 않도록 세션 재사용
_session = requests.Session()
_HEADERS = None


# ────────────────────────────────────────────
# 공통 헤더 (한 번만 만들고 로그도 한 번만)
# ────────────────────────────────────────────

def _get_headers():
    global _HEADERS
    if _HEADERS is None:
        client_id     = os.getenv("NAVER_CLIENT_ID")
        client_secret = os.getenv("NAVER_CLIENT_SECRET")

        if not client_id or not client_secret:
            print("[NaverAPI] ❌ 환경변수 누락 — NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 확인 필요")
        else:
            print(f"[NaverAPI] ✅ 인증 헤더 로드 완료 (ID: {client_id[:6]}...)")

        _HEADERS = {
            "X-Naver-Client-Id":     client_id,
            "X-Naver-Client-Secret": client_secret,
        }
    return _HEADERS


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
            res = _session.get(url, headers=headers, params=params, timeout=10)

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


def _fetch_three_channels(query: str, max_items: int):
    """뉴스/블로그/카페를 동시에 수집"""
    with ThreadPoolExecutor(max_workers=3) as ex:
        news_f = ex.submit(_fetch_naver_api, NEWS_URL, query, max_items)
        blog_f = ex.submit(_fetch_naver_api, BLOG_URL, query, max_items)
        cafe_f = ex.submit(_fetch_naver_api, CAFE_URL, query, max_items)
        return news_f.result(), blog_f.result(), cafe_f.result()


# ────────────────────────────────────────────
# 1. 브랜드 전체 수집 (뉴스 + 블로그 + 카페)
# ────────────────────────────────────────────

def collect_brand_all(brand_name: str, max_items: int = 100) -> dict:
    print(f"\n{'='*50}")
    print(f"[BrandCollect] 🔍 브랜드 수집 시작: '{brand_name}' (채널별 최대 {max_items}개)")
    print(f"{'='*50}")

    (news_texts, news_items), (blog_texts, blog_items), (cafe_texts, cafe_items) = \
        _fetch_three_channels(brand_name, max_items)

    all_texts = news_texts + blog_texts + cafe_texts

    print(f"\n[BrandCollect] ✅ 수집 완료 → 뉴스:{len(news_texts)} | 블로그:{len(blog_texts)} | 카페:{len(cafe_texts)} | 합계:{len(all_texts)}개")

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
#    ① 수집(I/O)은 인물별로 병렬
#    ② 감성 분석은 전 인물 텍스트를 모아 "한 번만" 실행
#    ③ 결과를 인물/영상별로 잘라서 사용 (재분석 없음)
# ────────────────────────────────────────────

MIN_ARTICLES_FOR_PERSON = 1


def _score(sentiment_score_fn, texts):
    """인물 분석에는 taxonomy(GPT 호출)가 필요 없으므로 지원되면 끈다."""
    try:
        if "with_taxonomy" in inspect.signature(sentiment_score_fn).parameters:
            return sentiment_score_fn(texts, with_taxonomy=False)
    except (TypeError, ValueError):
        pass
    return sentiment_score_fn(texts)


def _collect_person_bundle(brand_name: str, name: str):
    t0 = time.perf_counter()
    data = collect_person_all(brand_name, name, max_items=30)
    t_naver = time.perf_counter() - t0

    # 기사가 없으면 어차피 스킵할 인물이라 YouTube는 호출하지 않는다
    if data["total_articles"] < MIN_ARTICLES_FOR_PERSON:
        return name, data, None, {"naver": t_naver, "youtube": 0.0}

    t1 = time.perf_counter()
    try:
        youtube_data = collect_brand_and_person_comments(
            brand_name, [name],
            max_videos=5,
            max_comments_per_video=100,
            include_brand=False,      # 브랜드 영상은 인물 분석과 무관 (인물마다 중복 수집되던 부분)
        )
    except Exception as e:
        print(f"[PersonRisk] ⚠️ '{name}' YouTube 수집 실패 → 기사만으로 분석: {e}")
        youtube_data = {"videos": []}

    return name, data, youtube_data, {"naver": t_naver, "youtube": time.perf_counter() - t1}


def analyze_person_risks(
    brand_name:        str,
    person_names:      list,
    analyzer,
    sentiment_score_fn
) -> list:
    t_all = time.perf_counter()
    print(f"\n{'='*50}")
    print(f"[PersonRisk] 👤 연관 인물 분석 시작: {person_names}")
    print(f"{'='*50}")

    if not person_names:
        return []

    # ── ① 수집 (인물별 병렬, 입력 순서 유지) ─────────────
    t0 = time.perf_counter()
    workers = max(1, min(PERSON_IO_WORKERS, len(person_names)))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        bundles = list(ex.map(lambda n: _collect_person_bundle(brand_name, n), person_names))
    t_collect = time.perf_counter() - t0

    # ── ② 전 인물 텍스트를 하나로 모으고 위치(offset) 기록 ──
    all_texts = []
    plan = []

    for name, data, youtube_data, timing in bundles:
        total = data["total_articles"]

        if youtube_data is None:
            print(f"[PersonRisk] ⚠️ '{name}' — 기사 수 부족 ({total}개) → 스킵")
            continue

        start = len(all_texts)
        all_texts.extend(data["comments"])
        article_end = len(all_texts)

        video_slices = []
        for video in youtube_data.get("videos", []):
            comments = [c["text"] for c in video.get("comments", [])]
            if not comments:
                continue
            s = len(all_texts)
            all_texts.extend(comments)
            video_slices.append((video, s, len(all_texts)))

        plan.append({
            "name": name, "data": data, "total": total,
            "start": start, "article_end": article_end, "end": len(all_texts),
            "videos": video_slices,
        })

    # ── ③ 감성 분석 1회 ────────────────────────────────
    t1 = time.perf_counter()
    print(f"[PersonRisk] 감성 분석 일괄 실행 ({len(plan)}명, 총 {len(all_texts)}개 텍스트)")
    scored_all = _score(sentiment_score_fn, all_texts) if all_texts else []
    t_score = time.perf_counter() - t1

    # ── ④ 인물별로 잘라서 결과 조립 ─────────────────────
    person_results = []

    for p in plan:
        name = p["name"]
        scored = scored_all[p["start"]:p["end"]]
        if not scored:
            continue

        result = analyzer.calculate_risk(scored)

        article_scored = scored_all[p["start"]:p["article_end"]]
        top_articles = extract_top_negative_articles(p["data"]["articles"], article_scored, top_n=3)

        top_videos = []
        for video, s, e in p["videos"]:
            video_scored = scored_all[s:e]
            neg = sum(1 for r in video_scored if r["sentiment"] == "negative")
            top_videos.append({
                "title":         video["title"],
                "url":           video["url"],
                "channel":       video["channel"],
                "neg_ratio":     round(neg / len(video_scored), 4),
                "comment_count": len(video_scored),
            })

        top_videos.sort(key=lambda x: x["neg_ratio"], reverse=True)
        top_videos = top_videos[:3]

        person_results.append({
            "name":              name,
            "articles_analyzed": p["total"],
            "positive_ratio":    result["positive_ratio"],
            "negative_ratio":    result["negative_ratio"],
            "neutral_ratio":     result["neutral_ratio"],
            "risk_score":        result["risk_score"],
            "risk_level":        result["risk_level"],
            "impact_message":    _get_impact_message(result["risk_level"]),
            "top_articles":      top_articles,
            "top_videos":        top_videos,
        })

        level_emoji = {"low": "🟢", "moderate": "🟡", "high": "🟠", "critical": "🔴"}.get(result["risk_level"], "⚪")
        print(f"[PersonRisk] {level_emoji} '{name}' → 점수:{result['risk_score']} ({result['risk_level']}) | 부정:{result['negative_ratio']*100:.1f}% | top기사:{len(top_articles)}개")

    print(
        f"\n[PersonRisk] ✅ 전체 인물 분석 완료 → {len(person_results)}명 처리\n"
        f"[PersonTiming] total={time.perf_counter() - t_all:.2f}s | "
        f"collect={t_collect:.2f}s (인물별 naver/youtube: "
        + ", ".join(f"{b[0]}={b[3]['naver']:.1f}/{b[3]['youtube']:.1f}s" for b in bundles)
        + f") | sentiment={t_score:.2f}s"
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
# 4. 인물 전체 수집 (뉴스 + 블로그 + 카페, 동시 호출)
# ────────────────────────────────────────────

def collect_person_all(brand_name: str, person_name: str, max_items: int = 30) -> dict:
    query = f"{brand_name} {person_name}"

    print(f"\n[PersonCollect] 🔍 '{person_name}' 수집 시작 → 쿼리: '{query}'")

    (news_texts, news_items), (blog_texts, blog_items), (cafe_texts, cafe_items) = \
        _fetch_three_channels(query, max_items)

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