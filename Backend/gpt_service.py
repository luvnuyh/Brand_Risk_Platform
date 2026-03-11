from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch


MODEL_NAME = "nlptown/bert-base-multilingual-uncased-sentiment"

tokenizer_2 = AutoTokenizer.from_pretrained(MODEL_NAME)
model_2 = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)


def analyze_comment_with_gpt(comment: str):
    """
    GPT 대신 사용하는 2차 정밀 감정 분석 모델
    """

    inputs = tokenizer_2(comment, return_tensors="pt", truncation=True)
    outputs = model_2(**inputs)

    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    predicted_class = torch.argmax(probs, dim=1).item()

    # 이 모델은 1~5점 감정 분류
    # 1~2: negative
    # 3: neutral
    # 4~5: positive

    if predicted_class <= 1:
        return "negative"
    elif predicted_class == 2:
        return "neutral"
    else:
        return "positive"