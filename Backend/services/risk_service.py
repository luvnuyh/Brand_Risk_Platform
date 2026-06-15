from typing import List, Dict
from collections import Counter


class RiskAnalyzer:

    ISSUE_WEIGHTS = {
        "quality_issue": 2,
        "service_issue": 2,
        "pricing_issue": 2,
        "trust_issue": 4,
        "creator_issue": 4,
        "false_advertising": 5,
        "ethical_issue": 6,
    }

    ACTION_WEIGHTS = {
        "complaint": 1,
        "refund_request": 2,
        "brand_switch": 3,
        "warning_others": 4,
        "mocking": 2,
        "boycott": 8,
    }

    VIRALITY_WEIGHTS = {
        "low": 0,
        "medium": 2,
        "high": 5,
    }

    def __init__(self):
        pass

    # ==========================================
    # 기존 호환용
    # ==========================================

    def calculate_ratios(
        self,
        sentiments: List[str]
    ) -> Dict:

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

        return {
            "positive_ratio": round(positive_ratio, 4),
            "negative_ratio": round(negative_ratio, 4),
            "neutral_ratio":  round(neutral_ratio,  4),
            "risk_score":     round(risk_score, 2),
            "risk_level":     self.get_risk_level(risk_score)
        }

    # ==========================================
    # 신규 브랜드 리스크
    # ==========================================

    def calculate_risk(
        self,
        analyzed_results: List[Dict]
    ) -> Dict:

        if not analyzed_results:
            return {
                "positive_ratio": 0,
                "negative_ratio": 0,
                "neutral_ratio":  0,
                "risk_score":     0,
                "risk_level":     "low"
            }

        sentiments = [r["sentiment"] for r in analyzed_results]
        counter    = Counter(sentiments)
        total      = len(sentiments)

        pos = counter["positive"] / total
        neg = counter["negative"] / total
        neu = counter["neutral"]  / total

        sentiment_score = self._sentiment_score(pos, neg, neu)
        intensity_score = self._intensity_score(analyzed_results, neg)
        taxonomy_score  = self._taxonomy_score(analyzed_results, total, neg)
        virality_score  = self._virality_score(analyzed_results, total, neg)

        risk_score = min(
            100,
            sentiment_score
            + intensity_score
            + taxonomy_score
            + virality_score
        )

        return {
            "positive_ratio": round(pos, 4),
            "negative_ratio": round(neg, 4),
            "neutral_ratio":  round(neu, 4),

            "sentiment_score": round(sentiment_score, 2),
            "intensity_score": round(intensity_score, 2),
            "taxonomy_score":  round(taxonomy_score,  2),
            "virality_score":  round(virality_score,  2),

            "risk_score": round(risk_score, 2),
            "risk_level": self.get_risk_level(risk_score)
        }

    # ==========================================
    # 감성 비율 점수
    # 최대 65점
    #
    # 지수 1.2: 부정 비율이 낮을 때는 완만하게,
    # 40%+ 구간에서 가파르게 상승
    # ==========================================

    def _sentiment_score(self, pos, neg, neu):
        score = (neg ** 1.2) * 100 + neu * 5 - pos * 8
        return max(0, min(65, score))

    # ==========================================
    # 부정 강도
    # 최대 15점
    #
    # neg_ratio 가중치 적용:
    #   부정 비율이 낮은 브랜드에서 neg_prob가 높아도
    #   intensity가 점수를 과도하게 끌어올리지 않도록 조정.
    #   부정 비율 25% 이상에서 100% 반영.
    # ==========================================

    def _intensity_score(self, analyzed_results, neg_ratio: float):
        negatives = [
            r.get("neg_prob", 0)
            for r in analyzed_results
            if r["sentiment"] == "negative"
        ]

        if not negatives:
            return 0

        avg_neg = sum(negatives) / len(negatives)
        raw     = avg_neg * 15

        # 부정 비율이 낮을수록 intensity 기여 축소
        weight = min(1.0, neg_ratio / 0.25)
        return min(15, raw * weight)

    # ==========================================
    # taxonomy 점수
    # 최대 13점
    #
    # 부정 댓글 수 기준 정규화:
    #   전체 댓글 수 기준 정규화 시 대규모 데이터에서
    #   점수가 과소평가되는 문제 수정.
    #   부정 댓글 1개당 평균 weighted score가 4점이면 만점.
    # ==========================================

    def _taxonomy_score(
        self,
        analyzed_results,
        total: int,
        neg_ratio: float
    ):
        neg_count = max(1, int(total * neg_ratio))

        raw = 0
        for item in analyzed_results:
            taxonomy = item.get("taxonomy", {})

            for issue in taxonomy.get("issue_types", []):
                raw += self.ISSUE_WEIGHTS.get(issue, 0)

            for action in taxonomy.get("action_intent", []):
                raw += self.ACTION_WEIGHTS.get(action, 0)

        normalized = raw / neg_count
        return min(13, normalized * 4)

    # ==========================================
    # 확산성
    # 최대 8점
    #
    # 부정 댓글 수 기준 정규화:
    #   부정 댓글 중 high virality 비율로 측정.
    # ==========================================

    def _virality_score(
        self,
        analyzed_results,
        total: int,
        neg_ratio: float
    ):
        neg_count = max(1, int(total * neg_ratio))

        raw = 0
        for item in analyzed_results:
            taxonomy = item.get("taxonomy", {})
            virality = taxonomy.get("virality", "low")
            raw += self.VIRALITY_WEIGHTS.get(virality, 0)

        normalized = raw / neg_count
        return min(8, normalized * 3)

    # ==========================================
    # 인물 리스크
    # 최대 50점
    # ==========================================

    def calculate_person_score(self, person_results):
        if not person_results:
            return 0

        highest = max(
            p["risk_score"] for p in person_results
        )
        avg = (
            sum(p["risk_score"] for p in person_results)
            / len(person_results)
        )

        score = avg * 0.4 + highest * 0.3
        return min(50, score)

    # ==========================================
    # 최종 점수
    # ==========================================

    def calculate_final_score(self, brand_score, person_score):
        return round(
            brand_score * 0.8 + person_score * 0.2,
            2
        )

    # ==========================================
    # 기존 호환 공식 (calculate_ratios 전용)
    # ==========================================

    def calculate_risk_score(self, pos, neg, neu):
        neg_score   = (neg ** 1.8) * 130
        pos_penalty = pos * 25
        neu_score   = neu * 8
        raw_score   = neg_score + neu_score - pos_penalty
        return max(0.0, min(100.0, raw_score))

    # ==========================================
    # 등급
    # ==========================================

    def get_risk_level(self, score):
        if score < 15:
            return "low"
        elif score < 35:
            return "moderate"
        elif score < 60:
            return "high"
        else:
            return "critical"