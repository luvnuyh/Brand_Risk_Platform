from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from gpt_service import analyze_comment_with_gpt
from collections import Counter
import re

MODEL_NAME = "beomi/KcELECTRA-base-v2022"  # 1차 모델

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

THRESHOLD = 0.65  # 확신 기준


def analyze_comments_bulk(comments):

    sentiments = []

    for text in comments:

        inputs = tokenizer(text, return_tensors="pt", truncation=True)
        outputs = model(**inputs)

        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        confidence, predicted_class = torch.max(probs, dim=1)

        confidence = confidence.item()
        predicted_class = predicted_class.item()

        # 1차 결과 매핑 (KcELECTRA: 0=negative, 1=neutral, 2=positive)
        if predicted_class == 0:
            sentiment = "negative"
        elif predicted_class == 1:
            sentiment = "neutral"
        else:
            sentiment = "positive"

        # 조건부 GPT 재분석
        if confidence < THRESHOLD:
            sentiment = analyze_comment_with_gpt(text)

        sentiments.append(sentiment)

    return sentiments


def extract_top_keywords(comments, sentiments, top_percent=0.1, max_keywords=10, brand_name=None):
    """
    negative로 분류된 댓글에서만 키워드를 추출하여
    브랜드 리스크 원인과 관련된 키워드를 반환한다.
    negative 댓글이 부족할 경우 neutral까지 포함한다.
    """

    # ✅ 영어 불용어
    stopwords = {
        "i", "the", "to", "and", "a", "is", "it", "was", "in", "of", "for",
        "on", "this", "that", "my", "me", "we", "you", "he", "she", "they",
        "be", "are", "have", "has", "do", "did", "so", "but", "if", "at",
        "by", "or", "an", "not", "no", "its", "with", "as", "just", "how"
    }

    # ✅ 한국어 불용어 - 의미 없는 단어
    korean_stopwords = {
        # 조사 / 어미 / 접속사
        "그리고", "그런데", "하지만", "근데", "그냥", "진짜", "정말", "너무",
        "아무", "아직", "여기", "거기", "이거", "저거", "그거", "이게", "저게",
        "있어요", "없어요", "같아요", "좋아요", "해요", "해서", "하고", "하면",
        "이제", "이런", "저런", "그런", "뭔가", "왜냐", "뭐가", "어떤",
        "때문에", "그래서", "또한", "더욱", "또는", "혹은", "하여", "으로",
        "에서", "에게", "한테", "부터", "까지", "에도", "에는", "으로는",

        # 패션 / 상품 관련 단어 (브랜드 리스크와 무관)
        "코디", "코디가", "아우터", "원피스", "티셔츠", "바지", "스커트",
        "자켓", "점퍼", "후드", "맨투맨", "니트", "코트", "패딩", "가디건",
        "청바지", "셔츠", "블라우스", "조끼", "반팔", "긴팔", "민소매",
        "룩북", "코디북", "착장", "스타일링", "패션", "옷", "의류",
        "사이즈", "핏", "기장", "소재", "색상", "컬러",

        # 감탄사 / 리뷰 상투어
        "대박", "완전", "완전히", "너무나", "진짜로", "헐", "와우", "오마이",
        "갓", "레전드", "인정", "ㅋㅋ", "ㅠㅠ", "ㅎㅎ", "ㄷㄷ", "ㅇㅇ",
        "굿", "좋다", "좋은", "나쁜", "별로", "그냥저냥", "보통", "평범",

        # 일반 동사 / 형용사
        "이다", "있다", "없다", "같다", "하다", "되다", "보다", "주다",
        "알다", "모르다", "오다", "가다", "만들다", "쓰다", "받다",
        "이번", "저번", "항상", "자주", "가끔", "매번", "언제나", "처음",
    }

    stopwords.update(korean_stopwords)

    # ✅ 브랜드명도 불용어 처리
    if brand_name:
        stopwords.add(brand_name.lower())
        stopwords.add(brand_name)

    # ✅ negative 댓글만 필터링
    negative_comments = [
        text for text, sentiment in zip(comments, sentiments)
        if sentiment == "negative"
    ]

    # negative 댓글이 너무 적으면 neutral까지 포함
    MIN_COMMENTS = 10
    if len(negative_comments) < MIN_COMMENTS:
        negative_comments = [
            text for text, sentiment in zip(comments, sentiments)
            if sentiment in ("negative", "neutral")
        ]

    if not negative_comments:
        return []

    # ✅ 단어 추출
    words = []

    for text in negative_comments:
        cleaned = re.sub(r"[^\w\s]", "", text.lower())
        tokens = [
            t for t in cleaned.split()
            if t not in stopwords and len(t) > 1
        ]
        words.extend(tokens)

    if not words:
        return []

    counter = Counter(words)

    # 전체 고유 단어 수 기준 상위 퍼센트 컷
    total_unique = len(counter)
    top_n = max(1, int(total_unique * top_percent))

    most_common = counter.most_common(top_n)

    return [word for word, _ in most_common[:max_keywords]]


def detect_risk_spike(sentiments, threshold=0.6):

    total = len(sentiments)
    if total == 0:
        return None

    negative_count = sentiments.count("negative")
    ratio = negative_count / total

    if ratio >= threshold:
        return {
            "alert": True,
            "message": "부정 여론 급증 감지",
            "negative_ratio": round(ratio, 2)
        }

    return {
        "alert": False
    }