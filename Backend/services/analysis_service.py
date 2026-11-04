import time
import os
import asyncio
import torch
import json
import torch.nn.functional as F
from transformers import BertTokenizer, BertForSequenceClassification
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# timeout / max_retries: 응답이 멈춘 요청 하나가 전체 분석을 붙잡지 않도록
client = OpenAI(
    api_key=os.getenv("GPT_API_KEY"),
    timeout=30.0,
    max_retries=2,
)

# =========================
# 🔹 KoBERT 설정
# =========================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "./project/kobert_finetuned4"

tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH)
model.to(DEVICE)
if DEVICE == "cuda":
    model.half()          # GPU는 fp16으로 추론 (속도 향상, softmax는 float로 계산)
model.eval()

LABEL_MAP = {0: "negative", 2: "neutral", 1: "positive"}

CONF_THRESHOLD = 0.60

# =========================
# 🔹 설정
# =========================
BATCH_SIZE = 20                 # 감성 분류 GPT 배치 크기
KOBERT_CHUNK_SIZE = 128 if DEVICE == "cuda" else 32   # CPU는 작은 배치가 더 빠른 경우가 많음
MAX_CONCURRENT = 8              # GPT 동시 호출 수 (429 나면 5로 낮추기)
MAX_TAXONOMY_COUNT = 10         # 배치 처리라 30 정도로 올려도 호출 수는 거의 그대로
TAXONOMY_BATCH_SIZE = 10

# =========================
# 🔹 Sentiment Prompt
# =========================
SENTIMENT_PROMPT = """
당신은 한국어 브랜드 여론 분석 전문가입니다.

댓글을 반드시 아래 셋 중 하나로 분류하세요.

- positive
- negative
- neutral

반드시 라벨만 출력하세요.
"""

# =========================
# 🔹 Taxonomy Prompt (배치용)
# =========================
# ※ 아래 두 문구는 TAXONOMY_BATCH_PROMPT가 찾아서 자르고 바꾸는 기준이라
#   글자·줄바꿈 하나도 바꾸면 안 됩니다.
#     1) "각 댓글 taxonomy를\nJSON 배열로 반환하여 출력하세요."
#     2) "반드시 아래 JSON 형식만"
TAXONOMY_PROMPT = """
당신은 브랜드 리스크 분석 AI입니다.

각 댓글 taxonomy를
JSON 배열로 반환하여 출력하세요.

댓글은 부정·중립·긍정이 섞여 있습니다.
댓글에 실제로 드러난 내용만 고르고, 해당하는 항목이 없으면
emotion_strength는 "", issue_types와 action_intent는 [] 로 두세요.
근거 없이 항목을 채우지 마세요.

=== emotion_strength (1개 선택) ===

negative:
- rage: 격한 분노, 욕설
- dissatisfied: 기대보다 못하다는 불만
- disappointed: 실망, 아쉬움
- annoyed: 짜증, 답답함, 불편
- distrustful: 믿을 수 없다는 불신
- sarcastic: 비꼼, 조롱, 냉소
- concerned: 걱정, 우려

positive:
- satisfied: 만족
- impressed: 감탄, 호평
- grateful: 감사
- supportive: 브랜드 옹호, 응원
- excited: 신제품·행보에 대한 기대
- affectionate: 애정, 선호 표현

neutral:
- anticipating: 이슈에 대한 관심 집중
- curious: 궁금증, 문의
- indifferent: 감정 없이 담담한 서술

=== issue_types (최대 2개) ===

부정 이슈:
- quality_issue: 품질 전반 불만
- durability_issue: 내구성, 불량, 쉽게 망가짐
- design_issue: 디자인·스타일 아쉬움
- sizing_issue: 사이즈, 핏 불일치
- safety_issue: 위생, 안전, 유해성
- pricing_issue: 가격이 비쌈, 가격 정책 불만
- value_issue: 가격에 비해 아쉽다는 가성비 불만
- service_issue: 직원·고객 응대 불만
- delivery_issue: 배송 지연, 품절, 재고
- return_issue: 교환·반품·환불 처리 불만
- trust_issue: 브랜드를 믿기 어려움
- ethical_issue: 기업 윤리, 사회적 책임 논란
- false_advertising: 광고와 실제가 다름
- labor_issue: 노동 환경, 갑질
- plagiarism_issue: 표절, 카피, 도용 의혹
- environment_issue: 환경 관련 지적
- creator_issue: 모델·인플루언서 관련 논란

긍정 이슈 (긍정 댓글에만 사용):
- quality_praise: 품질, 마감 칭찬
- design_praise: 디자인 칭찬
- value_praise: 가성비 칭찬
- service_praise: 응대, 서비스 칭찬

구분 규칙:
- 품질 전반 불만은 quality_issue, 쉽게 망가짐·불량은 durability_issue
- 가격 자체가 비싸다는 불만은 pricing_issue, 가격 대비 아쉽다는 불만은 value_issue
- 감정만 있고 이유가 없으면 issue_types는 []

=== action_intent (최대 2개) ===

negative:
- complaint: 공식 항의, 고객센터 문의
- boycott: 불매 의사
- refund_request: 환불·보상 요구
- warning_others: 타인에게 구매 말리기
- brand_switch: 다른 브랜드로 이동 언급
- mocking: 밈·조롱성 콘텐츠로 소비
- report_authority: 소비자원·관계기관 신고 언급
- viral_complaint: 부정 경험을 SNS에 공유·확산

positive:
- purchase_intent: 구매 계획
- repurchase: 재구매
- recommendation: 타인에게 추천
- review_sharing: 착용·사용 후기 공유
- fandom: 브랜드 옹호, 팬심
- creator_support: 모델·인물 옹호

neutral:
- inquiry: 제품·매장·가격 문의
- wait_and_see: 후기를 보며 관망
- viral_share: 게시물·기사 공유

=== virality ===

- low
- medium
- high

=== target ===

- product
- brand
- creator
- marketing
- customer_service
- ceo

반드시 아래 JSON 형식만 출력하세요.
"""

# 기존 정의부는 그대로 쓰고, 출력 형식만 "여러 댓글 → 객체 하나"로 교체
_TAXONOMY_RULES = TAXONOMY_PROMPT.split("반드시 아래 JSON 형식만")[0].replace(
    "각 댓글 taxonomy를\nJSON 배열로 반환하여 출력하세요.",
    "각 댓글의 taxonomy를 분석하세요.",
)

TAXONOMY_BATCH_PROMPT = _TAXONOMY_RULES + """
여러 댓글이 번호와 함께 주어집니다. 댓글마다 위 기준으로 분석하세요.
입력 번호를 id로 그대로 사용하고, 아래 JSON 객체 형식만 출력하세요.

{
  "results": [
    {"id": 1, "emotion_strength": "", "issue_types": [], "action_intent": [], "virality": "", "target": []}
  ]
}
"""

# =========================
# 🔹 Few Shot Examples
# =========================
FEW_SHOT_EXAMPLES = """
입력:
1. 무신사 OUT
2. 품질은 보세 수준
3. 재입고 언제 되나요?
4. 웨스턴 셔츠 이쁘네요

출력:
negative
negative
positive
positive
"""


VALID_EMOTIONS = {
    "concerned", "dissatisfied", "disappointed", "annoyed", "distrustful",
    "sarcastic", "rage", "negative", "satisfied", "impressed", "grateful",
    "supportive", "excited", "affectionate", "positive", "anticipating",
    "curious", "indifferent",
}
VALID_ISSUES = {
    "quality_issue", "durability_issue", "design_issue", "sizing_issue", "safety_issue",
    "pricing_issue", "value_issue", "service_issue", "delivery_issue", "return_issue",
    "trust_issue", "ethical_issue", "false_advertising", "labor_issue",
    "plagiarism_issue", "environment_issue", "creator_issue",
    "quality_praise", "design_praise", "value_praise", "service_praise",
}
VALID_ACTIONS = {
    "warning_others", "boycott", "complaint", "refund_request", "brand_switch",
    "mocking", "report_authority", "viral_complaint", "purchase_intent",
    "repurchase", "recommendation", "review_sharing", "fandom", "creator_support",
    "inquiry", "wait_and_see", "viral_share",
}
VALID_VIRALITY = {"low", "medium", "high"}


def _as_list(v):
    return v if isinstance(v, list) else ([v] if v else [])

def _default_taxonomy() -> dict:
    return {
        "emotion_strength": None,
        "issue_types": [],
        "action_intent": [],
        "virality": "low",
        "target": [],
    }

def _clean_taxonomy(r: dict) -> dict:
    base = _default_taxonomy()

    emotion = r.get("emotion_strength")
    base["emotion_strength"] = emotion if emotion in VALID_EMOTIONS else None

    virality = r.get("virality")
    base["virality"] = virality if virality in VALID_VIRALITY else "low"

    base["issue_types"] = [x for x in _as_list(r.get("issue_types")) if x in VALID_ISSUES]
    base["action_intent"] = [x for x in _as_list(r.get("action_intent")) if x in VALID_ACTIONS]
    base["target"] = _as_list(r.get("target"))
    return base


# =========================
# 🔹 KoBERT Chunk Predict
# =========================
def _kobert_predict_chunk(texts: list) -> tuple:
    inputs = tokenizer(
        texts,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=64,
    ).to(DEVICE)

    with torch.inference_mode():
        logits = model(**inputs).logits
        probs = F.softmax(logits.float(), dim=1).cpu()

    # .item() 을 댓글마다 부르면 GPU 동기화가 반복되므로 한 번에 리스트로 변환
    max_probs, preds = probs.max(dim=1)
    max_list = max_probs.tolist()
    pred_list = preds.tolist()
    prob_list = probs.tolist()

    results, uncertain_idx, uncertain_probs = [], [], []

    for i in range(len(texts)):
        pred_label = LABEL_MAP[pred_list[i]]
        actual_probs = {
            "negative": prob_list[i][0],
            "positive": prob_list[i][1],
            "neutral": prob_list[i][2],
        }

        if max_list[i] >= CONF_THRESHOLD:
            results.append((pred_label, actual_probs))
        else:
            results.append(None)
            uncertain_idx.append(i)
            uncertain_probs.append((max_list[i], pred_label, actual_probs))

    return results, uncertain_idx, uncertain_probs


# =========================
# 🔹 전체 KoBERT 예측 (길이순 정렬로 padding 낭비 제거)
# =========================
def _kobert_predict_all(texts: list) -> tuple:
    n = len(texts)
    order = sorted(range(n), key=lambda i: len(texts[i]))

    results = [None] * n
    uncertain_idx, uncertain_probs = [], []

    for start in range(0, n, KOBERT_CHUNK_SIZE):
        chunk_ids = order[start:start + KOBERT_CHUNK_SIZE]
        chunk = [texts[i] for i in chunk_ids]

        res, u_idx, u_probs = _kobert_predict_chunk(chunk)

        for local, orig in enumerate(chunk_ids):
            results[orig] = res[local]          # 원래 순서로 복원
        uncertain_idx.extend(chunk_ids[j] for j in u_idx)
        uncertain_probs.extend(u_probs)

    return results, uncertain_idx, uncertain_probs


# =========================
# 🔹 GPT 응답 파싱
# =========================
def _parse_gpt_response(raw: str, expected_count: int) -> list:
    raw_lines = [l.strip().lower() for l in raw.strip().split("\n") if l.strip()]
    results = []

    for line in raw_lines:
        if "negative" in line:
            results.append("negative")
        elif "positive" in line:
            results.append("positive")
        elif "neutral" in line:
            results.append("neutral")

    while len(results) < expected_count:
        results.append("neutral")

    return results[:expected_count]


# =========================
# 🔹 GPT Batch Sentiment
# =========================
async def _call_gpt_batch_async(texts: list, semaphore: asyncio.Semaphore) -> list:
    numbered = "\n".join(f"{i+1}. {t[:150]}" for i, t in enumerate(texts))

    user_prompt = f"""
{FEW_SHOT_EXAMPLES}

=== 실제 분류 대상 ===

아래 {len(texts)}개 댓글을 분류하세요.
반드시 {len(texts)}줄로만 답하세요.

입력:
{numbered}

출력:
"""

    async with semaphore:
        try:
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SENTIMENT_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
                max_tokens=len(texts) * 6 + 20,   # 라벨만 나오므로 512는 과함
            )
            return _parse_gpt_response(response.choices[0].message.content, len(texts))

        except Exception as e:
            print("[GPT Error]", e)
            return ["neutral"] * len(texts)


async def _process_uncertain_parallel(uncertain_texts: list, semaphore: asyncio.Semaphore) -> list:
    batches = [
        uncertain_texts[i:i + BATCH_SIZE]
        for i in range(0, len(uncertain_texts), BATCH_SIZE)
    ]
    nested = await asyncio.gather(*[_call_gpt_batch_async(b, semaphore) for b in batches])
    return [item for sub in nested for item in sub]


# =========================
# 🔹 Taxonomy 배치 분석 (댓글 N개 → 호출 1번)
# =========================
async def _taxonomy_batch_async(items: list, semaphore: asyncio.Semaphore) -> dict:
    """items: [(원본 인덱스, 댓글 텍스트), ...] → {원본 인덱스: taxonomy}"""
    numbered = "\n".join(f"{n}. {t[:200]}" for n, (_, t) in enumerate(items, 1))
    user_prompt = (
    f"아래 {len(items)}개 댓글을 분석하세요. "
    f"부정 댓글이 많지만 일부는 중립 또는 긍정일 수 있습니다. "
    f"댓글의 실제 감정과 맞는 항목만 고르고, 해당하는 것이 없으면 빈 값으로 두세요.\n\n{numbered}"
    )

    by_id = {}
    async with semaphore:
        try:
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": TAXONOMY_BATCH_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
                max_tokens=100 * len(items) + 100,
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            for r in data.get("results", []):
                try:
                    by_id[int(r.get("id"))] = r
                except Exception:
                    continue
        except Exception as e:
            print("[taxonomy batch error]", e)

    return {
        idx: _clean_taxonomy(by_id[n]) if n in by_id else _default_taxonomy()
        for n, (idx, _) in enumerate(items, 1)
    }


# =========================
# 🔹 GPT 단계 전체를 이벤트 루프 1번으로 처리
# =========================
async def _gpt_pipeline(comments: list, kobert_results: list, uncertain_idx: list, with_taxonomy: bool = True):
    timings = {}
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    # ① 애매한 댓글 감성 재분류
    gpt_labels = {}
    if uncertain_idx:
        s = time.perf_counter()
        res = await _process_uncertain_parallel([comments[i] for i in uncertain_idx], semaphore)
        gpt_labels = dict(zip(uncertain_idx, res))
        timings["gpt_sentiment"] = time.perf_counter() - s

    def label_of(i):
        return gpt_labels[i] if i in gpt_labels else kobert_results[i][0]

    # ② negative 댓글만 taxonomy (배치)
        # ② taxonomy 대상: 부정 댓글을 우선하고, 모자라면 나머지 댓글로 채움
    if with_taxonomy:
        negative_idx = [i for i in range(len(comments)) if label_of(i) == "negative"]
        other_idx = [i for i in range(len(comments)) if label_of(i) != "negative"]
        neg_idx = (negative_idx + other_idx)[:MAX_TAXONOMY_COUNT]
    else:
        neg_idx = []

    taxonomy_map = {}
    if neg_idx:
        s = time.perf_counter()
        batches = [
            [(i, comments[i]) for i in neg_idx[b:b + TAXONOMY_BATCH_SIZE]]
            for b in range(0, len(neg_idx), TAXONOMY_BATCH_SIZE)
        ]
        parts = await asyncio.gather(*[_taxonomy_batch_async(b, semaphore) for b in batches])
        for p in parts:
            taxonomy_map.update(p)
        timings["gpt_taxonomy"] = time.perf_counter() - s

    return gpt_labels, taxonomy_map, timings


# =========================
# 🔥 핵심 함수
# =========================
def analyze_comments_bulk_with_score(comments: list, with_taxonomy: bool = True) -> list:
    if not comments:
        return []

    t_total = time.perf_counter()
    print(f"[KoBERT] 점수 포함 분류 시작 ({len(comments)}개, device={DEVICE})")

    # ── 1) KoBERT ─────────────────────────────
    s = time.perf_counter()
    kobert_results, uncertain_idx, _ = _kobert_predict_all(comments)
    t_kobert = time.perf_counter() - s

    # ── 2) GPT (감성 fallback + taxonomy) ─────
    s = time.perf_counter()
    gpt_labels, taxonomy_map, gpt_timings = asyncio.run(
        _gpt_pipeline(comments, kobert_results, uncertain_idx, with_taxonomy)
    )
    t_gpt = time.perf_counter() - s

    # ── 3) 결과 조립 ──────────────────────────
    neg_prob_map = {"negative": 0.80, "positive": 0.08, "neutral": 0.35}
    final_results = []

    for i, comment in enumerate(comments):
        if i in gpt_labels:
            label = gpt_labels[i]
            neg_prob = neg_prob_map[label]
            source = "gpt"
        else:
            label, actual_probs = kobert_results[i]
            neg_prob = round(actual_probs["negative"], 4)
            source = "kobert"

        final_results.append({
            "text": comment,
            "sentiment": label,
            "neg_prob": neg_prob,
            "source": source,
            "taxonomy": taxonomy_map.get(i, _default_taxonomy()),
        })

    # ── 단계별 소요 시간 ──────────────────────
    total = time.perf_counter() - t_total
    print(
        f"[TIMING] total={total:.2f}s | kobert={t_kobert:.2f}s "
        f"| gpt_stage={t_gpt:.2f}s "
        f"(sentiment={gpt_timings.get('gpt_sentiment', 0):.2f}s, "
        f"taxonomy={gpt_timings.get('gpt_taxonomy', 0):.2f}s) "
        f"| uncertain={len(uncertain_idx)}/{len(comments)}, taxonomy={len(taxonomy_map)}"
    )

    return final_results


# =========================
# 🔹 리스크 감지
# =========================
def detect_risk_spike(sentiments: list, threshold: float = 0.6) -> dict:
    total = len(sentiments)

    if total == 0:
        return {"alert": False, "message": "데이터 없음", "negative_ratio": 0.0}

    negative_count = sentiments.count("negative")
    positive_count = sentiments.count("positive")
    neutral_count = sentiments.count("neutral")

    ratio = negative_count / total

    result = {
        "alert": ratio >= threshold,
        "negative_ratio": round(ratio, 4),
        "positive_ratio": round(positive_count / total, 4),
        "neutral_ratio": round(neutral_count / total, 4),
        "total": total,
        "counts": {
            "negative": negative_count,
            "positive": positive_count,
            "neutral": neutral_count,
        },
    }

    if ratio >= threshold:
        result["message"] = f"⚠️ 부정 여론 급증 감지 ({ratio*100:.1f}%)"
    elif ratio >= 0.4:
        result["message"] = f"🟡 부정 여론 주의 구간 ({ratio*100:.1f}%)"
    else:
        result["message"] = f"✅ 여론 안정 ({ratio*100:.1f}%)"

    return result


# =========================
# 🔹 테스트
# =========================
if __name__ == "__main__":
    test_comments = [
        "무신사 OUT",
        "품질은 보세 수준",
        "재입고 언제 되나요?",
        "웨스턴 셔츠 이쁘네요",
    ]
    results = analyze_comments_bulk_with_score(test_comments)
    print(json.dumps(results, ensure_ascii=False, indent=2))