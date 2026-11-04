# gemini_service.py — v3 (입력 확대 + 구조화 출력 + 검증/재시도)

import os
import time
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("GPT_API_KEY"))

# ── 설정값 ────────────────────────────────────────────────────
MAX_COMMENTS = 50
MAX_POSITIVE_COMMENTS = 15      # 기회 요인 근거용으로 긍정 댓글 슬롯 확보
MAX_TOP_CONTENT = 10
MAX_PERSONS = 10
COMMENT_CHAR_LIMIT = 150        # 입력 토큰 폭증 방지
MAX_TOKENS = 7000
MAX_ATTEMPTS = 3
MIN_ITEMS = 3                   # summary.points / risk / opportunity / actions / content 공통 최소 개수

EVIDENCE_OK = "데이터 근거"
EVIDENCE_HYPO = "검증 가설"


# ═══════════════════════════════════════════════════════════════
#  입력 가공
# ═══════════════════════════════════════════════════════════════
def _safe_ratio(value):
    try:
        return round((value or 0) * 100, 1)
    except Exception:
        return 0


def _num(v, default=0):
    try:
        return float(v)
    except Exception:
        return default


def _build_comments_text(comments_sample: list) -> str:
    """위험도 높은 댓글 위주 + 긍정 댓글 일부를 섞어 최대 50개."""
    if not comments_sample:
        return "  (댓글 샘플 없음)"

    ranked = sorted(comments_sample, key=lambda c: _num(c.get("score")), reverse=True)
    positives = [c for c in ranked if c.get("sentiment") == "positive"][:MAX_POSITIVE_COMMENTS]
    pos_ids = {id(c) for c in positives}
    others = [c for c in ranked if id(c) not in pos_ids][: MAX_COMMENTS - len(positives)]
    picked = others + positives

    lines = []
    for i, c in enumerate(picked[:MAX_COMMENTS], 1):
        platform = c.get("platform", "unknown")
        text = (c.get("text", "") or "").strip().replace("\n", " ")[:COMMENT_CHAR_LIMIT]
        score = c.get("score", 0)
        sentiment = c.get("sentiment", "neutral")
        url = c.get("url", "")
        likes = c.get("like_count", c.get("likes", ""))

        url_part = f" | URL: {url}" if url else ""
        likes_part = f" | 좋아요: {likes}" if likes else ""
        lines.append(
            f"  {i}. [{platform}] 위험도:{score} [{sentiment}]{url_part}{likes_part}\n"
            f"     내용: \"{text}\""
        )
    return "\n".join(lines)


def _build_top_content_text(top_contents) -> str:
    if not top_contents:
        return "  (데이터 없음)"

    # dict(채널별) -> list 로 평탄화
    if isinstance(top_contents, dict):
        merged = []
        for items in top_contents.values():
            if isinstance(items, list):
                merged.extend(items)
        top_contents = merged

    if not isinstance(top_contents, list):
        return "  (데이터 형식 오류)"

    top_contents = sorted(
        [c for c in top_contents if isinstance(c, dict)],
        key=lambda c: _num(c.get("neg_ratio")),
        reverse=True,
    )

    lines = []
    for i, c in enumerate(top_contents[:MAX_TOP_CONTENT], 1):
        title = c.get("title", "제목 없음")
        neg = round(_num(c.get("neg_ratio")) * 100)
        url = c.get("url", "")
        channel = c.get("channel", c.get("source", "unknown"))
        comment_count = c.get("comment_count", "")

        channel_part = f" | 채널: {channel}" if channel else ""
        count_part = f" | 댓글수: {comment_count}" if comment_count else ""
        url_part = f"\n     URL: {url}" if url else ""
        lines.append(f"  {i}. [부정 {neg}%]{channel_part}{count_part}\n     제목: {title}{url_part}")

    return "\n".join(lines)


def _build_person_risk_text(person_risk: dict) -> str:
    if not person_risk:
        return "  (연관 인물 데이터 없음)"

    score = person_risk.get("person_score", "N/A")
    persons = person_risk.get("persons", [])
    lines = [f"  종합 인물 리스크 점수: {score}점"]

    for p in persons[:MAX_PERSONS]:
        name = p.get("name", "이름 없음")
        role = p.get("role", "")
        p_score = p.get("risk_score", "N/A")
        comments = p.get("negative_comments", [])
        articles = p.get("related_articles", p.get("top_content", []))

        role_part = f", {role}" if role else ""
        lines.append(f"\n  ▸ {name} (리스크 {p_score}점{role_part})")

        for cm in comments[:2]:
            sample = cm.get("text", "") if isinstance(cm, dict) else str(cm)
            lines.append(f'    부정 댓글 예시: "{sample[:80]}"')

        if articles:
            art = articles[0]
            art_title = art.get("title", "") if isinstance(art, dict) else str(art)
            lines.append(f"    관련 기사: {art_title[:60]}")

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════
#  프롬프트
# ═══════════════════════════════════════════════════════════════
# JSON 스키마는 f-string 이 아닌 일반 문자열로 둬서 중괄호 이스케이프 실수를 방지
OUTPUT_SCHEMA = """
{
  "headline": "핵심 이슈 한 줄 (플랫폼 또는 실제 댓글 언급)",
  "summary": {
    "headline": "핵심 이슈 요약",
    "points": ["포인트 1", "포인트 2", "포인트 3 (최소 3개)"]
  },
  "risk_analysis": [
    {
      "title": "플랫폼 + 이슈명",
      "evidence_type": "데이터 근거 | 검증 가설",
      "evidence": "인용한 실제 댓글/기사 제목/수치. 근거가 약하면 확인된 사실만 적기",
      "consumer_view": "소비자가 이 문제를 어떻게 인식하는지",
      "spread_path": "어느 채널에서 어떤 경로로 확산될 수 있는지",
      "business_impact": "매출/신뢰/채널 운영 관점의 영향",
      "response": "대응 방안",
      "verify_with": "내부 메모용. 비워도 됨"
    }
  ],
  "opportunity": [
    {
      "title": "기회 요인명",
      "evidence_type": "데이터 근거 | 검증 가설",
      "evidence": "근거가 된 긍정 댓글/키워드",
      "target": "타깃 고객군",
      "experiment": "마케팅 실험 설계 (무엇을 어떻게 테스트)",
      "kpi": "성과 지표와 판단 기준",
      "verify_with": "내부 메모용. 비워도 됨"
    }
  ],
  "actions": [
    {
      "title": "즉각 대응 (48시간 내) 등 시점이 드러나는 제목",
      "evidence_type": "데이터 근거 | 검증 가설",
      "owner_team": "담당 팀 (예: CS팀, 마케팅팀, PR팀, 법무팀)",
      "timing": "48시간 내 | 1~2주 | 1개월+",
      "steps": ["1단계", "2단계", "3단계 (작업 순서대로)"],
      "done_criteria": "완료 기준 (측정 가능하게)",
      "verify_with": "내부 메모용. 비워도 됨"
    }
  ],
  "content_strategy": [
    {
      "title": "전략명",
      "evidence_type": "데이터 근거 | 검증 가설",
      "post_title": "실제로 게시 가능한 콘텐츠 제목",
      "target": "타깃",
      "channel": "게시 채널",
      "production_steps": ["제작 1단계", "제작 2단계", "제작 3단계"],
      "cta": "행동 유도 문구",
      "kpi": "KPI와 목표 기준",
      "verify_with": "내부 메모용. 비워도 됨"
    }
  ],
  "weekly_summary": {
    "total_comments": __TOTAL__,
    "negative_ratio": "__NEG__%",
    "risk_peak_day": "__PEAK__"
  }
}
"""


def _build_prompt(brand, data, ctx) -> str:
    return f"""
너는 대한민국 최고의 브랜드 위기관리 전문가야.
'{brand}' 브랜드의 실제 소비자 반응 데이터를 분석해서, 브랜드 담당자가 바로 실행할 수 있는 전략을 존댓말로 제시해야 해.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## '{brand}' 브랜드 실제 데이터
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### [1] 리스크 현황
- 종합 리스크: {data.get('risk_score')}점 / 100 ({data.get('risk_level')})
- 감성 분포: 긍정 {_safe_ratio(data.get('positive_ratio'))}% / 부정 {_safe_ratio(data.get('negative_ratio'))}% / 중립 {_safe_ratio(data.get('neutral_ratio'))}%
- 총 분석 건수: {ctx['total_comments']}건

### [2] 플랫폼별 리스크
- YouTube: {ctx['youtube_risk']}점 | 부정 키워드: {ctx['youtube_keywords']}
- 네이버: {ctx['naver_risk']}점 | 부정 키워드: {ctx['naver_keywords']}
- 인스타그램: {ctx['instagram_risk']}점

### [3] 실제 댓글 (최대 {MAX_COMMENTS}개, 위험도 높은 순 + 긍정 일부)
{ctx['comments_text']}

### [4] 부정 이슈 콘텐츠 TOP{MAX_TOP_CONTENT}
{ctx['top_content_text']}

### [5] 급증 키워드
{ctx['keywords_text']}

### [6] 연관 인물 리스크 (최대 {MAX_PERSONS}명)
{ctx['person_risk_text']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 작성 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[개수]
- summary.points, risk_analysis, opportunity, actions, content_strategy 는 각각 최소 {MIN_ITEMS}개.

[사실성 — 가장 중요]
- 위 데이터에 없는 사실, 수치, 댓글, URL, 인물 발언을 절대 지어내지 마.
- 데이터가 충분히 뒷받침하면 evidence_type 을 "{EVIDENCE_OK}", 부족하거나 추론이면 "{EVIDENCE_HYPO}" 로 표시해. (이 값은 내부 구분용이라 화면에 보이지 않아.)
- 근거가 약한 항목도 본문에 "가설", "검증 필요" 같은 라벨 문구를 쓰지 마. 대신 "~할 가능성이 있습니다", "~를 먼저 테스트해볼 만합니다"처럼 자연스러운 어조로 쓰고, 없는 수치나 댓글을 만들어 단정하지 마.
- 댓글 샘플이 비어 있으면 인용을 만들지 말고, 수집된 수치와 키워드만으로 쓰되 단정하지 마.

[인용]
- 댓글이 있으면 [3]의 실제 텍스트를 최소 2개 큰따옴표로 직접 인용해.
- [4]의 콘텐츠 제목을 risk_analysis 또는 actions 에서 최소 1개 언급해.
- 인물 리스크가 있으면 해당 인물 이름을 전략에 명시해.
- 브랜드명 '{brand}'을 각 섹션에 1회 이상 넣어.

[항목별 필수 내용]
- risk_analysis: 근거 / 소비자 관점 / 확산 경로 / 사업 영향 / 대응 방안
- opportunity: 타깃 / 마케팅 실험 / 성과 지표
- actions: 담당 팀 / 실행 시점 / 작업 순서(steps 2개 이상) / 완료 기준
- content_strategy: 실제 게시 가능한 제목 / 타깃 / 채널 / 제작 순서(2단계 이상) / CTA / KPI

[금지 문장]
- "부정 비율이 높습니다", "소셜 미디어 캠페인을 진행하세요", "긍정적 콘텐츠를 제작하세요", "모니터링을 강화하세요" 같은 일반론.

[분량]
- 각 필드는 1~2문장으로 간결하게 써. 항목 수를 늘리기보다 필드를 빠짐없이 채우는 게 우선이야.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 출력 형식
JSON 객체만 출력. 마크다운, 백틱, 설명 금지. 아래 스키마의 키 이름을 그대로 사용해.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""" + (
        OUTPUT_SCHEMA
        .replace("__TOTAL__", str(ctx["total_comments"]))
        .replace("__NEG__", str(_safe_ratio(data.get("negative_ratio"))))
        .replace("__PEAK__", str(ctx["risk_peak_day"]))
    )


# ═══════════════════════════════════════════════════════════════
#  검증 / 정규화
# ═══════════════════════════════════════════════════════════════
def _filled(v) -> bool:
    if isinstance(v, list):
        return any(str(x).strip() for x in v)
    return bool(str(v or "").strip())


def _check_items(result, key, fields, list_fields=(), min_list_len=2):
    problems = []
    items = result.get(key)
    if not isinstance(items, list):
        return [f"{key}: 리스트가 아님"]
    if len(items) < MIN_ITEMS:
        problems.append(f"{key}: {len(items)}개 (최소 {MIN_ITEMS}개 필요)")
    for i, it in enumerate(items, 1):
        if not isinstance(it, dict):
            problems.append(f"{key}[{i}]: 객체가 아님")
            continue
        for f in fields:
            if not _filled(it.get(f)):
                problems.append(f"{key}[{i}].{f}: 비어 있음")
        for f in list_fields:
            v = it.get(f)
            if not isinstance(v, list) or len([x for x in v if str(x).strip()]) < min_list_len:
                problems.append(f"{key}[{i}].{f}: {min_list_len}단계 이상 리스트 필요")
    return problems


def _validate(result: dict) -> list:
    problems = []
    if not _filled(result.get("headline")):
        problems.append("headline 누락")

    summary = result.get("summary")
    points = summary.get("points") if isinstance(summary, dict) else None
    if not isinstance(points, list) or len(points) < MIN_ITEMS:
        problems.append(f"summary.points: 최소 {MIN_ITEMS}개 필요")
    if not (isinstance(summary, dict) and _filled(summary.get("headline"))):
        problems.append("summary.headline 누락")

    problems += _check_items(
        result, "risk_analysis",
        ["title", "evidence", "consumer_view", "spread_path", "business_impact", "response"],
    )
    problems += _check_items(
        result, "opportunity",
        ["title", "evidence", "target", "experiment", "kpi"],
    )
    problems += _check_items(
        result, "actions",
        ["title", "owner_team", "timing", "done_criteria"],
        list_fields=["steps"],
    )
    problems += _check_items(
        result, "content_strategy",
        ["title", "post_title", "target", "channel", "cta", "kpi"],
        list_fields=["production_steps"],
    )
    return problems


def _numbered(steps) -> str:
    return " → ".join(f"{i}) {s}" for i, s in enumerate(steps, 1))


def _compose_desc(kind: str, it: dict) -> str:
    """대시보드는 title/desc 만 렌더링하므로, 구조화 필드를 desc 로 합쳐서 호환성 유지."""
    if kind == "risk_analysis":
        parts = [
            f"근거: {it['evidence']}",
            f"소비자 관점: {it['consumer_view']}",
            f"확산 경로: {it['spread_path']}",
            f"사업 영향: {it['business_impact']}",
            f"대응 방안: {it['response']}",
        ]
    elif kind == "opportunity":
        parts = [
            f"근거: {it['evidence']}",
            f"타깃: {it['target']}",
            f"마케팅 실험: {it['experiment']}",
            f"성과 지표: {it['kpi']}",
        ]
    elif kind == "actions":
        parts = [
            f"담당 팀: {it['owner_team']}",
            f"실행 시점: {it['timing']}",
            f"작업 순서: {_numbered(it['steps'])}",
            f"완료 기준: {it['done_criteria']}",
        ]
    else:  # content_strategy
        parts = [
            f"게시 제목: {it['post_title']}",
            f"타깃: {it['target']}",
            f"채널: {it['channel']}",
            f"제작 순서: {_numbered(it['production_steps'])}",
            f"CTA: {it['cta']}",
            f"KPI: {it['kpi']}",
        ]
    return "\n".join(parts)


def _finalize(result: dict) -> dict:
    for kind in ("risk_analysis", "opportunity", "actions", "content_strategy"):
        for it in result[kind]:
            it["desc"] = _compose_desc(kind, it)
    return result


def _strip_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


# ═══════════════════════════════════════════════════════════════
#  메인
# ═══════════════════════════════════════════════════════════════
def generate_risk_report(brand: str, data: dict) -> dict:
    keywords = data.get("trending_keywords", [])
    source = data.get("source_breakdown", {})
    youtube_data = source.get("youtube", {})
    naver_data = source.get("naver_news", source.get("naver", {}))
    weekly = data.get("weekly_trend", {})

    ctx = {
        "keywords_text": ", ".join(keywords) if keywords else "없음",
        "comments_text": _build_comments_text(data.get("comments_sample", [])),
        "top_content_text": _build_top_content_text(data.get("top_content", [])),
        "person_risk_text": _build_person_risk_text(data.get("person_risk", {})),
        "youtube_risk": youtube_data.get("risk_score", "N/A"),
        "naver_risk": naver_data.get("risk_score", "N/A"),
        "instagram_risk": source.get("instagram", {}).get("risk_score", "N/A"),
        "youtube_keywords": ", ".join(youtube_data.get("top_negative_keywords", [])[:5]) or "없음",
        "naver_keywords": ", ".join(naver_data.get("top_negative_keywords", [])[:5]) or "없음",
        "risk_peak_day": weekly.get("peak_day", "알 수 없음"),
        "total_comments": data.get("total_comments", 0),
    }

    prompt = _build_prompt(brand, data, ctx)
    messages = [
        {
            "role": "system",
            "content": (
                "You are a Korean brand crisis management expert. "
                "Return ONLY a valid JSON object. No markdown, no backticks, no explanation. "
                "Never invent facts, quotes, numbers or URLs that are not in the user message; "
                "for weakly supported items use hedged wording instead of stating them as facts."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    for attempt in range(1, MAX_ATTEMPTS + 1):
        text = ""
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3,
                max_tokens=MAX_TOKENS,
                response_format={"type": "json_object"},
            )
            choice = response.choices[0]
            text = _strip_fence(choice.message.content or "")

            if choice.finish_reason == "length":
                raise ValueError(f"출력이 max_tokens({MAX_TOKENS})에서 잘림")

            result = json.loads(text)

            problems = _validate(result)
            if problems:
                print(f"[GPT] 검증 실패 (시도 {attempt}/{MAX_ATTEMPTS}): {problems[:6]}")
                # 다음 시도에서 무엇이 문제였는지 알려줌
                messages = messages[:2] + [
                    {"role": "assistant", "content": text[:1500]},
                    {
                        "role": "user",
                        "content": "이전 응답이 검증에 실패했어. 아래를 고쳐서 JSON 전체를 다시 출력해:\n- "
                        + "\n- ".join(problems[:10]),
                    },
                ]
                continue

            result = _finalize(result)
            result["generated_at"] = time.strftime("%m/%d %H:%M")
            return result

        except json.JSONDecodeError as e:
            print(f"[GPT] JSON 파싱 실패 (시도 {attempt}/{MAX_ATTEMPTS}): {e}")
            print(f"[GPT] 응답 앞 200자: {text[:200] or 'N/A'}")
        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                wait = 10 * attempt
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
            "total_comments": ctx["total_comments"],
            "negative_ratio": f"{_safe_ratio(data.get('negative_ratio'))}%",
            "risk_peak_day": ctx["risk_peak_day"],
        },
        "generated_at": time.strftime("%m/%d %H:%M"),
    }