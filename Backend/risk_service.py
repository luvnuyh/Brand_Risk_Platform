from typing import List, Dict
from collections import Counter
import math


class RiskAnalyzer:
    def __init__(self):
        pass

    def calculate_ratios(self, sentiments: List[str]) -> Dict:

        total = len(sentiments)
        if total == 0:
            return {
                "positive_ratio": 0,
                "negative_ratio": 0,
                "neutral_ratio": 0,
                "risk_score": 0,
                "risk_level": "low"
            }

        counter = Counter(sentiments)

        positive_ratio = counter["positive"] / total
        negative_ratio = counter["negative"] / total
        neutral_ratio  = counter["neutral"]  / total

        risk_score = self.calculate_risk_score(
            positive_ratio,
            negative_ratio,
            neutral_ratio
        )

        risk_level = self.get_risk_level(risk_score)

        return {
            "positive_ratio": round(positive_ratio, 4),
            "negative_ratio": round(negative_ratio, 4),
            "neutral_ratio":  round(neutral_ratio,  4),
            "risk_score":     round(risk_score,     2),
            "risk_level":     risk_level
        }

    def calculate_risk_score(self, pos: float, neg: float, neu: float) -> float:
        """
        비선형 리스크 계산 공식.

        핵심 아이디어:
        1. negative ratio에 제곱 가중치를 적용해 낮은 구간에서는 완만하게,
           높은 구간에서는 급격하게 리스크가 상승하도록 설계.
        2. positive ratio가 높을수록 리스크를 더 강하게 상쇄.
        3. neutral은 리스크에 소폭만 기여 (잠재 리스크 반영).

        예시:
          neg=0.10, pos=0.60 → risk ≈  8점  (낮음)
          neg=0.30, pos=0.40 → risk ≈ 22점  (낮음)
          neg=0.39, pos=0.31 → risk ≈ 30점  (보통)
          neg=0.50, pos=0.25 → risk ≈ 48점  (보통)
          neg=0.65, pos=0.15 → risk ≈ 70점  (높음)
          neg=0.80, pos=0.10 → risk ≈ 88점  (위험)
        """

        # 1️⃣ negative 기여: 제곱 비선형 가중 (낮은 구간 완만, 높은 구간 급격)
        neg_score = (neg ** 1.8) * 130

        # 2️⃣ positive 상쇄: positive가 높을수록 리스크를 강하게 낮춤
        pos_penalty = pos * 25

        # 3️⃣ neutral 기여: 잠재 부정 여론으로 소폭 반영
        neu_score = neu * 8

        raw_score = neg_score + neu_score - pos_penalty

        # 0 ~ 100 범위로 클램핑
        return max(0.0, min(100.0, raw_score))

    def get_risk_level(self, score: float) -> str:
        """
        리스크 점수를 등급으로 변환.

        low      :  0 ~ 25  (브랜드 평판 양호)
        moderate : 25 ~ 50  (모니터링 필요)
        high     : 50 ~ 75  (적극 대응 필요)
        critical : 75 ~ 100 (즉각 조치 필요)
        """
        if score < 25:
            return "low"
        elif score < 50:
            return "moderate"
        elif score < 75:
            return "high"
        else:
            return "critical"