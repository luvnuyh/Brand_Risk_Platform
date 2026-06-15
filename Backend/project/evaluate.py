import pandas as pd
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report, confusion_matrix

# =========================
# ⚙️ 설정
# =========================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "./project/kobert_finetuned4"
BATCH_SIZE = 32
MAX_LEN = 128

# 라벨 매핑
ID2LABEL = {0: "negative", 1: "positive", 2: "neutral"}

# =========================
# 🔥 모델 로드
# =========================
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

model.to(DEVICE)
model.eval()


# =========================
# 📊 평가 함수
# =========================
def evaluate(model, texts, labels):
    preds = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch_texts = texts[i:i+BATCH_SIZE]

        inputs = tokenizer(
            batch_texts,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=MAX_LEN
        ).to(DEVICE)

        with torch.no_grad():
            outputs = model(**inputs)
            probs = F.softmax(outputs.logits, dim=1)
            batch_preds = torch.argmax(probs, dim=1).cpu().tolist()

        preds.extend(batch_preds)

    y_true = labels
    y_pred = preds

    # =========================
    # 📈 성능 출력
    # =========================
    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    print("\n===== Evaluation Result =====")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1-score : {f1:.4f}")

    print("\n===== Class-wise Report =====")
    print(classification_report(
        y_true,
        y_pred,
        target_names=["negative", "positive", "neutral"],
        zero_division=0
    ))

  # =========================
    # ❌ 오분류 데이터 저장
    # =========================
    misclassified = []

    for i, (true, pred) in enumerate(zip(y_true, y_pred)):
        if true != pred:
            misclassified.append({
                "text": texts[i],
                "original_label": true,
                "predicted_label": pred
            })

    miss_df = pd.DataFrame(misclassified)
    save_path = "./project/misclassified4.csv"
    miss_df.to_csv(save_path, index=False, encoding="utf-8-sig")

    print(f"\n❌ 오분류 샘플 수: {len(misclassified)}개 / 전체 {len(y_true)}개")
    print(f"💾 저장 완료: {save_path}")
    
    # 오분류 패턴 요약 출력
    print("\n===== 오분류 패턴 요약 =====")
    summary = miss_df.groupby(["original_label", "predicted_label"]).size().reset_index(name="count")
    summary = summary.sort_values("count", ascending=False)
    print(summary.to_string(index=False))

    return preds


# =========================
# 🚀 실행
# =========================
if __name__ == "__main__":
    df = pd.read_csv("./project/test_3000.csv")

    assert "text" in df.columns, "text 컬럼 없음"
    assert "label" in df.columns, "label 컬럼 없음"

    texts = df["text"].astype(str).tolist()
    labels = df["label"].tolist()

    print(f"총 테스트 데이터 수: {len(texts)}")

    evaluate(model, texts, labels)