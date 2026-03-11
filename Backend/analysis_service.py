from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from gpt_service import analyze_comment_with_gpt
from collections import Counter
import re

MODEL_NAME = "klue/roberta-base"  # 또는 기존 모델 1차 모델

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

THRESHOLD = 0.75  # 확신 기준


def analyze_comments_bulk(comments):

    sentiments = []

    for text in comments:

        inputs = tokenizer(text, return_tensors="pt", truncation=True)
        outputs = model(**inputs)

        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        confidence, predicted_class = torch.max(probs, dim=1)

        confidence = confidence.item()
        predicted_class = predicted_class.item()

        # 1차 결과 매핑 (2-class 가정)
        if predicted_class == 1:
            sentiment = "positive"
        else:
            sentiment = "negative"

        # 🔥 조건부 GPT 재분석
        if confidence < THRESHOLD:
            sentiment = analyze_comment_with_gpt(text)

        sentiments.append(sentiment)

    return sentiments

def extract_top_keywords(comments, top_percent=0.1, max_keywords=10):

    words = []

    for text in comments:
        # 특수문자 제거 + 소문자 변환
        cleaned = re.sub(r"[^\w\s]", "", text.lower())
        tokens = cleaned.split()

        words.extend(tokens)

    if not words:
        return []

    counter = Counter(words)

    # 전체 단어 수 기준 상위 퍼센트 컷
    total_unique = len(counter)
    top_n = max(1, int(total_unique * top_percent))

    # 상위 top_n 중에서 다시 상위 max_keywords만 반환
    most_common = counter.most_common(top_n)

    return [word for word, _ in most_common[:max_keywords]]