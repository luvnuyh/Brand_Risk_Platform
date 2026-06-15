const API_BASE = "http://localhost:8000";

// =====================================================
// 🔹 Token
// =====================================================
function getToken() {
  return localStorage.getItem("token");
}

// =====================================================
// 🔹 Analyze Brand
// =====================================================
export async function analyzeBrand() {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "분석 실패");
  }

  return res.json();
}

// =====================================================
// 🔹 Get Persons
// =====================================================
export async function getPersons() {
  const res = await fetch(`${API_BASE}/persons`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("인물 조회 실패");
  }

  return res.json();
}

// =====================================================
// 🔹 Add Person
// =====================================================
export async function addPerson({ name, role }) {
  const res = await fetch(`${API_BASE}/persons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ name, role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "인물 등록 실패");
  }

  return res.json();
}

// =====================================================
// 🔹 Delete Person
// =====================================================
export async function deletePerson(personId) {
  const res = await fetch(`${API_BASE}/persons/${personId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("인물 삭제 실패");
  }

  return res.json();
}

// =====================================================
// 🔹 AI Report
// =====================================================
export async function generateAiReport(dashData) {
  const token = localStorage.getItem("token");

  const payload = {
    summary: {
      brand: dashData.overview.brand,

      risk_score: dashData.overview.risk_score,
      risk_level: dashData.overview.risk_level,

      positive_ratio: dashData.overview.positive_ratio / 100,
      negative_ratio: dashData.overview.negative_ratio / 100,
      neutral_ratio: dashData.overview.neutral_ratio / 100,

      total_comments: dashData.overview.total_comments,

      taxonomy_summary: dashData.taxonomySummary,

      crisis_feed: dashData.crisisFeed,

      source_breakdown: dashData.sourceBreakdown,

      person_risk: {
        person_score: dashData.personRisk?.person_score,
        persons: (dashData.personRisk?.persons ?? []).map((p) => ({
          name: p.name,
          risk_score: p.risk_score,
          impact: p.impact,
        })),
      },

      top_content: {
        youtube: dashData.topContent?.youtube ?? [],
        naver: dashData.topContent?.naver ?? [],
      },

      analyzed_comments: (dashData.analyzedComments ?? []).slice(0, 20),

      comments_sample:
        (dashData.analyzedComments ?? []).slice(0, 10),
      
        score_breakdown: dashData.scoreBreakdown,
    },
  };

  const res = await fetch(`${API_BASE}/api/risk-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "AI 리포트 생성 실패");
  }

  const data = await res.json();

  console.log("[AI Report]", data);

  return data.report;
}

// =====================================================
// 🔹 Percent
// =====================================================
function toPercent(v) {
  return Math.round((v ?? 0) * 100);
}

// =====================================================
// 🔹 Dashboard Mapping
// =====================================================
export function mapApiToDashboard(apiData, personsData) {

  const {
    brand,
    risk_score,
    risk_level,
    positive_ratio,
    negative_ratio,
    neutral_ratio,
    total_comments,
    videos_analyzed,
    articles_analyzed,
    score_breakdown,
    source_breakdown,
    taxonomy_summary,
    crisis_feed,
    analyzed_comments,
    person_risk,
    top_content,
  } = apiData;

  // =====================================================
  // 🔹 Person Mapping
  // =====================================================
  const riskMap = {};

  (person_risk?.persons ?? []).forEach((p) => {
    riskMap[p.name] = p;
  });

  const associatedPersons = (personsData?.persons ?? []).map((p) => {

    const risk = riskMap[p.name];

    return {
      id: p.id,
      name: p.name,
      role: p.role ?? "-",

      risk_score: Math.round(risk?.risk_score ?? 0),
      risk_level: risk?.risk_level ?? "low",
      impact: risk?.impact_message ?? "분석 결과 없음",

      articles: risk?.articles_analyzed ?? 0,

      positive_ratio: toPercent(risk?.positive_ratio),
      negative_ratio: toPercent(risk?.negative_ratio),
      neutral_ratio: toPercent(risk?.neutral_ratio),

      top_articles: risk?.top_articles ?? [],
      top_content: [
        ...(risk?.top_articles ?? []).map(a => ({
          type: "naver",
          title: a.title,
          url: a.url,
          pub_date: a.pub_date,
          neg_ratio: a.neg_prob,
        })),
      
        ...(risk?.top_videos ?? []).map(v => ({
          type: "youtube",
          title: v.title,
          url: v.url,
          channel: v.channel,
          comment_count: v.comment_count,
          neg_ratio: v.neg_ratio,
        })),
      ]
      .sort((a, b) => b.neg_ratio - a.neg_ratio)
      .slice(0, 5),

      registered: true,
      detected: !!risk,
    };
  });

  // =====================================================
  // 🔹 YouTube
  // =====================================================
  const topYoutube = (top_content?.youtube ?? []).map((v) => ({
    title: v.title,
    channel: v.channel,
    url: v.url,
    neg_ratio: v.neg_ratio,
    comment_count: v.comment_count,
  }));

  // =====================================================
  // 🔹 Naver
  // =====================================================
  const topNaver = (top_content?.naver ?? []).map((a) => ({
    title: a.title,
    url: a.url,
    pub_date: a.pub_date,
    neg_ratio: a.neg_ratio,
    taxonomy: a.taxonomy ?? {},
  }));

  const topContent = [
    ...topYoutube,
    ...topNaver,
  ];

  // =====================================================
  // 🔹 Taxonomy Summary
  // =====================================================
  const taxonomySummary = {
    issue_types: taxonomy_summary?.issue_types ?? {},
    action_intent: taxonomy_summary?.action_intent ?? {},
    emotion_strength: taxonomy_summary?.emotion_strength ?? {},
    targets: taxonomy_summary?.targets ?? {},
    virality: taxonomy_summary?.virality ?? {},
  };

  // =====================================================
  // 🔹 Crisis Feed
  // =====================================================
  const crisisFeed = crisis_feed ?? [];

  // =====================================================
  // 🔹 Analyzed Comments
  // =====================================================
  const analyzedComments = (analyzed_comments ?? []).map((c, idx) => ({
    id: idx + 1,

    text: c.text ?? "",

    sentiment: c.sentiment ?? "neutral",

    neg_prob: Math.round((c.neg_prob ?? 0) * 100),

    source: c.source ?? "kobert",

    taxonomy: c.taxonomy ?? {
      emotion_strength: null,
      issue_types: [],
      action_intent: [],
      virality: "low",
      target: [],
    },
  }));

  // =====================================================
  // 🔥 FINAL RETURN
  // =====================================================
  return {

    // =====================================================
    // 🔹 Overview
    // =====================================================
    overview: {
      brand,

      risk_score: Math.round(risk_score),
      risk_level,

      positive_ratio: toPercent(positive_ratio),
      negative_ratio: toPercent(negative_ratio),
      neutral_ratio: toPercent(neutral_ratio),

      total_comments,
      videos_analyzed,
      articles_analyzed,

      last_analyzed: new Date().toLocaleString("ko-KR"),
    },

    // =====================================================
    // 🔹 Score Breakdown
    // =====================================================
    scoreBreakdown: {
      brand_score: Math.round(score_breakdown?.brand_score ?? 0),
      person_score: Math.round(score_breakdown?.person_score ?? 0),
    },
    sourceBreakdown: source_breakdown ?? {},

    // =====================================================
    // 🔹 Taxonomy
    // =====================================================
    taxonomySummary,

    // =====================================================
    // 🔹 Crisis Feed
    // =====================================================
    crisisFeed,

    // =====================================================
    // 🔹 Analyzed Comments
    // =====================================================
    analyzedComments,

    // =====================================================
    // 🔹 Person Risk
    // =====================================================
    personRisk: {
      detected: true,
      person_score: Math.round(person_risk?.person_score ?? 0),
      persons: associatedPersons,
    },

    // =====================================================
    // 🔹 Top Content
    // =====================================================
    topContent: topContent,
  };
}