from typing import List, Dict
from collections import Counter


class RiskAnalyzer:
    def __init__(self):
        self.negative_weight = 1.2
        self.neutral_weight = 0.3
        self.positive_weight = 0.5

    def calculate_ratios(self, sentiments: List[str]) -> Dict:

        total = len(sentiments)
        if total == 0:
            return {
                "positive_ratio": 0,
                "negative_ratio": 0,
                "neutral_ratio": 0,
                "risk_score": 0
            }

        counter = Counter(sentiments)

        positive_ratio = counter["positive"] / total
        negative_ratio = counter["negative"] / total
        neutral_ratio = counter["neutral"] / total

        risk_score = self.calculate_risk_score(
            positive_ratio,
            negative_ratio,
            neutral_ratio
        )

        return {
            "positive_ratio": round(positive_ratio, 4),
            "negative_ratio": round(negative_ratio, 4),
            "neutral_ratio": round(neutral_ratio, 4),
            "risk_score": round(risk_score, 2)
        }

    def calculate_risk_score(self, pos: float, neg: float, neu: float) -> float:

        raw_score = (
            (neg * self.negative_weight)
            + (neu * self.neutral_weight)
            - (pos * self.positive_weight)
        )

        normalized = max(0, min(1, raw_score))

        return normalized * 100