import time
import os
import csv
import asyncio
import torch
import json
import torch.nn.functional as F
from transformers import BertTokenizer, BertForSequenceClassification
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GPT_API_KEY")
)

# =========================
# 🔹 KoBERT 설정
# =========================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

MODEL_PATH = "./project/kobert_finetuned4"

tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)
model = BertForSequenceClassification.from_pretrained(MODEL_PATH)

model.to(DEVICE)
model.eval()

LABEL_MAP = {
    0: "negative",
    2: "neutral",
    1: "positive"
}

CONF_THRESHOLD = 0.60
UNCERTAIN_CSV_PATH = "./uncertain_comments.csv"

# =========================
# 🔹 설정
# =========================
BATCH_SIZE = 20
KOBERT_CHUNK_SIZE = 128
MAX_CONCURRENT = 5
MAX_TAXONOMY_COUNT = 10

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
# 🔹 Taxonomy Prompt
# =========================
TAXONOMY_PROMPT = """
당신은 브랜드 리스크 분석 AI입니다.

각 댓글 taxonomy를
JSON 배열로 반환하여 출력하세요.

=== emotion_strength ===

negative:
- rage
- dissatisfied
- sarcastic
- concerned

positive:
- satisfied
- excited
- supportive
- anticipating

=== issue_types ===

- quality_issue
- service_issue
- pricing_issue
- trust_issue
- ethical_issue
- false_advertising
- creator_issue

=== action_intent ===

negative:
- complaint
- boycott
- refund_request
- warning_others
- brand_switch
- mocking

positive:
- purchase_intent
- recommendation
- fandom
- creator_support

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

{
  "emotion_strength": "",
  "issue_types": [],
  "action_intent": [],
  "virality": "",
  "target": []
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

# =========================
# 🔹 KoBERT Chunk Predict
# =========================
def _kobert_predict_chunk(texts: list) -> tuple:

    inputs = tokenizer(
        texts,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=64
    ).to(DEVICE)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)

    results = []
    uncertain_idx = []
    uncertain_probs = []

    for i, prob in enumerate(probs):

        max_prob, pred = torch.max(prob, dim=0)

        max_prob = max_prob.item()
        pred_label = LABEL_MAP[pred.item()]

        actual_probs = {
            "negative": prob[0].item(),
            "positive": prob[1].item(),
            "neutral": prob[2].item(),
        }

        if max_prob >= CONF_THRESHOLD:

            results.append((pred_label, actual_probs))

        else:

            results.append(None)
            uncertain_idx.append(i)
            uncertain_probs.append((max_prob, pred_label, actual_probs))

    return results, uncertain_idx, uncertain_probs

# =========================
# 🔹 전체 KoBERT 예측
# =========================
def _kobert_predict_all(texts: list) -> tuple:

    all_results = []
    all_uncertain_idx = []
    all_uncertain_probs = []

    for chunk_start in range(0, len(texts), KOBERT_CHUNK_SIZE):

        chunk = texts[chunk_start:chunk_start + KOBERT_CHUNK_SIZE]

        results, u_idx, u_probs = _kobert_predict_chunk(chunk)

        all_results.extend(results)

        all_uncertain_idx.extend([
            idx + chunk_start for idx in u_idx
        ])

        all_uncertain_probs.extend(u_probs)

    return all_results, all_uncertain_idx, all_uncertain_probs

# =========================
# 🔹 CSV 저장
# =========================
# def _save_uncertain_to_csv(texts: list, probs: list, gpt_results: list):

#     label_to_int = {
#         "negative": 0,
#         "positive": 1,
#         "neutral": 2
#     }

#     file_exists = os.path.isfile(UNCERTAIN_CSV_PATH)

#     with open(
#         UNCERTAIN_CSV_PATH,
#         "a",
#         newline="",
#         encoding="utf-8-sig"
#     ) as f:

#         writer = csv.DictWriter(
#             f,
#             fieldnames=[
#                 "text",
#                 "kobert_max_prob",
#                 "kobert_pred",
#                 "gpt_label",
#                 "label",
#                 "timestamp"
#             ]
#         )

#         if not file_exists:
#             writer.writeheader()

#         timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

#         for text, (max_prob, kobert_pred, _), gpt_label in zip(
#             texts,
#             probs,
#             gpt_results
#         ):

#             writer.writerow({
#                 "text": text,
#                 "kobert_max_prob": round(max_prob, 4),
#                 "kobert_pred": kobert_pred,
#                 "gpt_label": gpt_label,
#                 "label": label_to_int.get(gpt_label, 2),
#                 "timestamp": timestamp
#             })

#     print(f"[CSV] 애매한 댓글 {len(texts)}개 저장 완료")

# =========================
# 🔹 GPT 응답 파싱
# =========================
def _parse_gpt_response(raw: str, expected_count: int) -> list:

    raw_lines = [
        l.strip().lower()
        for l in raw.strip().split("\n")
        if l.strip()
    ]

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

    numbered = "\n".join([
        f"{i+1}. {t[:200]}"
        for i, t in enumerate(texts)
    ])

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
                    {
                        "role": "system",
                        "content": SENTIMENT_PROMPT
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                temperature=0,
                max_tokens=512,
            )

            raw = response.choices[0].message.content

            return _parse_gpt_response(raw, len(texts))

        except Exception as e:

            print("[GPT Error]", e)

            return ["neutral"] * len(texts)

# =========================
# 🔹 Taxonomy 분석
# =========================
async def analyze_taxonomy_async(comment: str, sentiment: str):

    prompt = f"""
댓글:
{comment}

sentiment:
{sentiment}

위 taxonomy 기준으로 분석하세요.
"""

    try:

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": TAXONOMY_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0,
            max_tokens=300,
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content

        return json.loads(raw)

    except Exception as e:

        print("[taxonomy error]", e)

        return {
            "emotion_strength": None,
            "issue_types": [],
            "action_intent": [],
            "virality": "low",
            "target": []
        }

# =========================
# 🔹 GPT 병렬 처리
# =========================
async def _process_uncertain_parallel(uncertain_texts: list) -> list:

    batches = [
        uncertain_texts[i:i + BATCH_SIZE]
        for i in range(0, len(uncertain_texts), BATCH_SIZE)
    ]

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    tasks = [
        _call_gpt_batch_async(batch, semaphore)
        for batch in batches
    ]

    results_nested = await asyncio.gather(*tasks)

    return [
        item
        for sublist in results_nested
        for item in sublist
    ]

# =========================
# 🔥 핵심 함수
# =========================
def analyze_comments_bulk_with_score(comments: list) -> list:

    if not comments:
        return []

    print(f"[KoBERT] 점수 포함 분류 시작 ({len(comments)}개)")

    kobert_results, uncertain_idx, uncertain_probs = _kobert_predict_all(comments)

    uncertain_texts = [comments[i] for i in uncertain_idx]

    gpt_results = []

    # =========================
    # GPT fallback
    # =========================
    if uncertain_idx:

        print(f"[GPT] 애매한 댓글 {len(uncertain_texts)}개 처리")

        gpt_results = asyncio.run(
            _process_uncertain_parallel(uncertain_texts)
        )

        # _save_uncertain_to_csv(
        #     uncertain_texts,
        #     uncertain_probs,
        #     gpt_results
        # )

    uncertain_set = set(uncertain_idx)

    gpt_cursor = 0

    final_results = []

    taxonomy_count = 0

    for i, res in enumerate(kobert_results):

        comment = comments[i]

        # =========================
        # GPT fallback 결과
        # =========================
        if i in uncertain_set:

            label = gpt_results[gpt_cursor]

            gpt_cursor += 1

            neg_prob_map = {
                "negative": 0.80,
                "positive": 0.08,
                "neutral": 0.35
            }

            neg_prob = neg_prob_map[label]

            source = "gpt"

        # =========================
        # KoBERT confident 결과
        # =========================
        else:

            label, actual_probs = res

            neg_prob = round(
                actual_probs["negative"],
                4
            )

            source = "kobert"

        # =========================
        # neutral / positive skip
        # =========================
        if label in ["neutral", "positive"]:

            taxonomy = {
                "emotion_strength": None,
                "issue_types": [],
                "action_intent": [],
                "virality": "low",
                "target": []
            }

        # =========================
        # negative taxonomy 분석
        # =========================
        else:

            if taxonomy_count >= MAX_TAXONOMY_COUNT:

                taxonomy = {
                    "emotion_strength": None,
                    "issue_types": [],
                    "action_intent": [],
                    "virality": "low",
                    "target": []
                }

            else:

                taxonomy = asyncio.run(
                    analyze_taxonomy_async(
                        comment,
                        label
                    )
                )

                taxonomy_count += 1

        final_results.append({
            "text": comment,
            "sentiment": label,
            "neg_prob": neg_prob,
            "source": source,
            "taxonomy": taxonomy
        })

    return final_results

# =========================
# 🔹 리스크 감지
# =========================
def detect_risk_spike(sentiments: list, threshold: float = 0.6) -> dict:

    total = len(sentiments)

    if total == 0:

        return {
            "alert": False,
            "message": "데이터 없음",
            "negative_ratio": 0.0
        }

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
        }
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
        "웨스턴 셔츠 이쁘네요"
    ]

    results = analyze_comments_bulk_with_score(test_comments)

    print(json.dumps(results, ensure_ascii=False, indent=2))