# gemini_service.py — 개선 버전

import os
import time
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("GPT_API_KEY"))


def _safe_ratio(value):
    try:
        return round((value or 0) * 100, 1)
    except Exception:
        return 0


def _build_comments_text(comments_sample: list) -> str:
    """
    댓글 샘플을 GPT가 인용하기 좋은 형태로 변환.
    기존: 5개, text+score만
    개선: 10개, 실제 텍스트 전문 + url + like_count 포함
    """
    if not comments_sample:
        return "  (댓글 샘플 없음)"

    lines = []
    for i, c in enumerate(comments_sample[:10], 1):
        platform  = c.get("platform", "unknown")
        text      = c.get("text", "").strip()
        score     = c.get("score", 0)
        sentiment = c.get("sentiment", "neutral")
        url       = c.get("url", "")
        likes     = c.get("like_count", c.get("likes", ""))

        url_part   = f" | URL: {url}" if url else ""
        likes_part = f" | 좋아요: {likes}" if likes else ""

        lines.append(
            f"  {i}. [{platform}] 위험도:{score} [{sentiment}]{url_part}{likes_part}\n"
            f"     내용: \"{text}\""
        )
    return "\n".join(lines)



def _build_top_content_text(top_contents) -> str:

    if not top_contents:
        return "  (데이터 없음)"

    # =====================================================
    # dict -> list flatten
    # =====================================================
    if isinstance(top_contents, dict):

        merged = []

        youtube_items = top_contents.get("youtube", [])
        naver_items = top_contents.get("naver", [])

        merged.extend(youtube_items)
        merged.extend(naver_items)

        top_contents = merged

    # =====================================================
    # 안전장치
    # =====================================================
    if not isinstance(top_contents, list):
        return "  (데이터 형식 오류)"

    lines = []

    for i, c in enumerate(top_contents[:5], 1):

        title = c.get("title", "제목 없음")

        neg = round(
            (c.get("neg_ratio", 0)) * 100
        )

        url = c.get("url", "")

        channel = c.get(
            "channel",
            c.get("source", "unknown")
        )

        comment_count = c.get(
            "comment_count",
            ""
        )

        url_part = f"\n     URL: {url}" if url else ""

        channel_part = (
            f" | 채널: {channel}"
            if channel else ""
        )

        count_part = (
            f" | 댓글수: {comment_count}"
            if comment_count else ""
        )

        lines.append(
            f"  {i}. [부정 {neg}%]"
            f"{channel_part}"
            f"{count_part}\n"
            f"     제목: {title}"
            f"{url_part}"
        )

    return "\n".join(lines)


def _build_person_risk_text(person_risk: dict) -> str:
    """
    연관 인물 리스크를 점수 하나가 아니라 인물별 맥락으로 전달.
    기존: person_score 숫자만
    개선: 인물별 부정 댓글 예시 + 관련 기사 제목
    """
    if not person_risk:
        return "  (연관 인물 데이터 없음)"

    score   = person_risk.get("person_score", "N/A")
    persons = person_risk.get("persons", [])

    lines = [f"  종합 인물 리스크 점수: {score}점"]

    for p in persons[:3]:
        name     = p.get("name", "이름 없음")
        p_score  = p.get("risk_score", "N/A")
        comments = p.get("negative_comments", [])
        articles = p.get("related_articles", [])

        lines.append(f"\n  ▸ {name} (리스크 {p_score}점)")

        if comments:
            sample = comments[0].get("text", "") if isinstance(comments[0], dict) else str(comments[0])
            lines.append(f'    부정 댓글 예시: "{sample[:80]}"')

        if articles:
            art = articles[0]
            art_title = art.get("title", "") if isinstance(art, dict) else str(art)
            lines.append(f"    관련 기사: {art_title[:60]}")

    return "\n".join(lines)


def generate_risk_report(brand: str, data: dict) -> dict:

    # ── 변수 준비 ────────────────────────────────────────────
    keywords       = data.get("trending_keywords", [])
    keywords_text  = ", ".join(keywords) if keywords else "없음"

    comments_text    = _build_comments_text(data.get("comments_sample", []))
    top_content_text = _build_top_content_text(data.get("top_content", []))
    person_risk_text = _build_person_risk_text(data.get("person_risk", {}))

    source         = data.get("source_breakdown", {})
    youtube_data   = source.get("youtube",    {})
    naver_data     = source.get("naver_news", {})

    youtube_risk   = youtube_data.get("risk_score", "N/A")
    naver_risk     = naver_data.get("risk_score", "N/A")
    instagram_risk = source.get("instagram", {}).get("risk_score", "N/A")

    # 플랫폼별 대표 부정 키워드도 추가 전달 (있다면)
    youtube_keywords = ", ".join(youtube_data.get("top_negative_keywords", [])[:5]) or "없음"
    naver_keywords   = ", ".join(naver_data.get("top_negative_keywords", [])[:5]) or "없음"

    weekly        = data.get("weekly_trend", {})
    risk_peak_day = weekly.get("peak_day", "알 수 없음")
    total_comments = data.get("total_comments", 0)

    # ── 프롬프트 ─────────────────────────────────────────────
    prompt = f"""
너는 대한민국 최고의 브랜드 위기관리 전문가야.
지금부터 '{brand}' 브랜드의 실제 소비자 반응 데이터를 분석해서,
브랜드 담당자가 "오늘 당장 실행"할 수 있는 구체적인 전략을 존댓말로 제시해야 해.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## '{brand}' 브랜드 실제 데이터
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### [1] 리스크 현황
- 종합 리스크: {data.get('risk_score')}점 / 100 ({data.get('risk_level')})
- 감성 분포: 긍정 {_safe_ratio(data.get('positive_ratio'))}% / 부정 {_safe_ratio(data.get('negative_ratio'))}% / 중립 {_safe_ratio(data.get('neutral_ratio'))}%
- 총 분석 건수: {total_comments}건

### [2] 플랫폼별 리스크
- YouTube: {youtube_risk}점 | 부정 키워드: {youtube_keywords}
- 네이버: {naver_risk}점 | 부정 키워드: {naver_keywords}
- 인스타그램: {instagram_risk}점

### [3] ⚠️ 실제 부정 댓글 / 반응 (아래 내용을 직접 인용해서 분석해)
{comments_text}

### [4] ⚠️ 부정 이슈 콘텐츠 TOP5 (제목과 URL을 전략에 직접 활용해)
{top_content_text}

### [5] 급증 키워드
{keywords_text}

### [6] 연관 인물 리스크 (인물 이름과 실제 댓글을 전략에 반영해)
{person_risk_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🎯 작성 규칙 (위반 시 응답 무효)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 절대 금지 (이런 문장이 하나라도 있으면 실패):
  - "부정 비율이 높습니다 / 부정 반응이 많습니다"
  - "소셜 미디어 캠페인을 진행하세요"
  - "긍정적 콘텐츠를 제작하세요"
  - "모니터링을 강화하세요"
  - 위 [3][4][6] 데이터를 한 번도 인용하지 않는 분석

✅ 필수 조건:
  1. [3]의 실제 댓글 텍스트를 최소 2개 직접 인용 (큰따옴표로 묶어서)
  2. [4]의 콘텐츠 제목을 최소 1개 actions 또는 risk_analysis에 언급
  3. 인물 리스크가 있으면 해당 인물 이름을 전략에 명시
  4. 모든 actions는 "언제(48시간 내 / 1~2주 / 1개월+) + 무엇을 + 어떻게" 형태
  5. 브랜드명 '{brand}'을 각 섹션에 1회 이상 명시

✅ 좋은 예:
  - actions: "48시간 내, '[영상 제목]' 영상 댓글란에 '{brand}' 공식 계정으로 답변 게시 — '가격 대비 실망스럽다'는 댓글에 환불 정책 안내 + 신규 라인 소개 링크 첨부"
  - risk_analysis: "유튜브에서 '[실제 댓글 텍스트]' 류의 부정 반응이 [영상 제목]에 집중됨"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 출력 형식
JSON만 출력. 마크다운·백틱·설명 절대 금지.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{
  "headline": "핵심 이슈 한 줄 — 실제 댓글/플랫폼 언급 필수",
  "summary": {{
    "headline": "핵심 이슈 요약 (실제 데이터 기반)",
    "points": [
      "실제 댓글·기사 직접 인용한 포인트 1",
      "플랫폼/인물 구체적으로 언급한 포인트 2",
      "리스크 수치와 연결한 포인트 3"
    ]
  }},
  "risk_analysis": [
    {{"title": "구체적 리스크명 (플랫폼+이슈)", "desc": "실제 댓글/기사 인용하며 어떤 채널에서 어떤 내용인지"}},
    {{"title": "리스크 요인 2", "desc": "구체적 설명"}},
    {{"title": "리스크 요인 3", "desc": "구체적 설명"}}
  ],
  "opportunity": [
    {{"title": "기회 요인 1", "desc": "실제 긍정 댓글/키워드 기반"}},
    {{"title": "기회 요인 2", "desc": "구체적 설명"}}
  ],
  "actions": [
    {{"title": "즉각 대응 (48시간 내)", "desc": "실제 콘텐츠 제목·댓글 인용, 언제+무엇+어떻게"}},
    {{"title": "단기 대응 (1~2주)", "desc": "구체적 액션"}},
    {{"title": "장기 전략 (1개월+)", "desc": "구체적 액션"}}
  ],
  "content_strategy": [
    {{"title": "콘텐츠 전략 1", "desc": "어떤 채널, 어떤 포맷, 무슨 주제 — 실제 키워드 활용"}},
    {{"title": "콘텐츠 전략 2", "desc": "구체적 설명"}}
  ],
  "weekly_summary": {{
    "total_comments": {total_comments},
    "negative_ratio": "{_safe_ratio(data.get('negative_ratio'))}%",
    "risk_peak_day": "{risk_peak_day}"
  }}
}}
"""


    # ── API 호출 ──────────────────────────────────────────────
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a Korean brand crisis management expert. "
                            "Return ONLY valid JSON. No markdown, no backticks, no explanation. "
                            "Every risk/action description MUST quote real comment text or content titles "
                            "provided in the user message."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,   # 0.2 → 0.3: 창의성 소폭 허용 (구체성 유지하면서)
                max_tokens=1800,   # 1200 → 1800: 댓글 인용 분량 확보
            )
            text = response.choices[0].message.content.strip()

            # JSON 펜스 제거 (방어적으로)
            if text.startswith("```"):
                parts = text.split("```")
                text = parts[1] if len(parts) > 1 else text
                if text.startswith("json"):
                    text = text[4:]
            text = text.strip()

            result = json.loads(text)

            required = ["headline", "summary", "actions"]
            if not all(k in result for k in required):
                raise ValueError(f"Missing required fields: {required}")

            result["generated_at"] = time.strftime("%m/%d %H:%M")
            return result

        except json.JSONDecodeError as e:
            print(f"[GPT] JSON 파싱 실패 (시도 {attempt + 1}/3): {e}")
            print(f"[GPT] 응답 앞 200자: {text[:200] if 'text' in dir() else 'N/A'}")
        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                wait = 10 * (attempt + 1)
                print(f"[GPT 대기] {wait}초 후 재시도")
                time.sleep(wait)
            else:
                print(f"[GPT 오류] {e}")

    # ── Fallback ──────────────────────────────────────────────
    return {
        "headline": "요약 생성 실패",
        "summary": {
            "headline": "AI 리포트를 생성하지 못했습니다.",
            "points": ["분석 데이터 확인 필요", "API 연결 점검", "잠시 후 재시도"],
        },
        "risk_analysis": [],
        "opportunity": [],
        "actions": [
            {"title": "즉각 대응", "desc": "브랜드 모니터링 재실행"},
            {"title": "관계 회복", "desc": "데이터 소스 확인"},
            {"title": "장기 전략", "desc": "API 상태 확인"},
        ],
        "content_strategy": [],
        "weekly_summary": {
            "total_comments": total_comments,
            "negative_ratio": f"{_safe_ratio(data.get('negative_ratio'))}%",
            "risk_peak_day": risk_peak_day,
        },
        "generated_at": time.strftime("%m/%d %H:%M"),
    }