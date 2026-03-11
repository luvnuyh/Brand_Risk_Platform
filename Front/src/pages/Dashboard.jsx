import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RiskTrendChart from "../components/RiskTrendChart";
import RiskKeywordCloud from "../components/RiskKeywordCloud";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();

  // ======================
  // ✅ Dummy Data (Brand 기본)
  // ======================
  const BRAND_BASE = {
    overview: {
      brand: "Nike",
      last_updated: "방금 전",
      risk_score: 72,
      positive_ratio: 32,
      negative_ratio: 58,
      neutral_ratio: 10,
      comment_count: 1280,
      video_count: 15,
    },

    riskTrend: [
      { date: "Mon", negative_ratio: 42, positive_ratio: 38, risk_score: 60 },
      { date: "Tue", negative_ratio: 48, positive_ratio: 34, risk_score: 64 },
      { date: "Wed", negative_ratio: 55, positive_ratio: 28, risk_score: 70 },
      { date: "Thu", negative_ratio: 51, positive_ratio: 31, risk_score: 67 },
      { date: "Fri", negative_ratio: 63, positive_ratio: 22, risk_score: 78 },
      { date: "Sat", negative_ratio: 58, positive_ratio: 26, risk_score: 74 },
      { date: "Sun", negative_ratio: 60, positive_ratio: 24, risk_score: 76 },
    ],

    riskVideos: [
      {
        video_id: "v1",
        title: "Nike Running Shoes Review (솔직후기)",
        negative_comments: 230,
        negative_ratio: 63,
        views: 45000,
        url: "https://youtube.com",
      },
      {
        video_id: "v2",
        title: "Nike Sneakers Honest Review",
        negative_comments: 180,
        negative_ratio: 51,
        views: 32000,
        url: "https://youtube.com",
      },
      {
        video_id: "v3",
        title: "Running Shoes Comparison (Top 5)",
        negative_comments: 120,
        negative_ratio: 44,
        views: 28000,
        url: "https://youtube.com",
      },
      {
        video_id: "v4",
        title: "Brand Debate: Nike vs Adidas",
        negative_comments: 95,
        negative_ratio: 41,
        views: 21000,
        url: "https://youtube.com",
      },
      {
        video_id: "v5",
        title: "Nike 제품 품질 논란 정리",
        negative_comments: 88,
        negative_ratio: 39,
        views: 19000,
        url: "https://youtube.com",
      },
    ],

    riskNews: [
      {
        news_id: "n1",
        title: "Nike 제품 품질 논란 기사",
        negative_comments: 140,
        negative_ratio: 61,
        views: 38000,
        url: "https://news.naver.com",
      },
      {
        news_id: "n2",
        title: "나이키 브랜드 이미지 하락 보도",
        negative_comments: 95,
        negative_ratio: 49,
        views: 21000,
        url: "https://news.naver.com",
      },
    ],

    allRiskComments: [
      {
        id: "c1",
        video_id: "v1",
        text: "이 브랜드 품질 진짜 별로임… 실망",
        likes: 320,
        video_title: "Nike Running Shoes Review (솔직후기)",
        video_url: "https://youtube.com",
      },
      {
        id: "c2",
        video_id: "v1",
        text: "교환/환불 대응 너무 느림",
        likes: 210,
        video_title: "Nike Running Shoes Review (솔직후기)",
        video_url: "https://youtube.com",
      },
      {
        id: "c3",
        video_id: "v2",
        text: "가격 대비 완전 별로. 가성비가 아님",
        likes: 198,
        video_title: "Nike Sneakers Honest Review",
        video_url: "https://youtube.com",
      },
      {
        id: "c4",
        video_id: "v3",
        text: "배송 지연 너무 심함. CS 답도 없음",
        likes: 154,
        video_title: "Running Shoes Comparison (Top 5)",
        video_url: "https://youtube.com",
      },
      {
        id: "c5",
        video_id: "v4",
        text: "광고만 번지르르하고 실사용은 별로",
        likes: 120,
        video_title: "Brand Debate: Nike vs Adidas",
        video_url: "https://youtube.com",
      },
      {
        id: "c6",
        video_id: "v2",
        text: "품질 이슈 계속 나오는데 개선이 안됨",
        likes: 101,
        video_title: "Nike Sneakers Honest Review",
        video_url: "https://youtube.com",
      },
    ],

    allNewsComments: [
      {
        id: "nn1",
        news_id: "n1",
        text: "요즘 나이키 품질 진짜 문제 많음",
        likes: 150,
        news_title: "Nike 제품 품질 논란 기사",
        news_url: "https://news.naver.com",
      },
      {
        id: "nn2",
        news_id: "n1",
        text: "브랜드 이미지 많이 떨어짐",
        likes: 110,
        news_title: "Nike 제품 품질 논란 기사",
        news_url: "https://news.naver.com",
      },
      {
        id: "nn3",
        news_id: "n2",
        text: "광고만 잘하고 제품은 별로",
        likes: 90,
        news_title: "나이키 브랜드 이미지 하락 보도",
        news_url: "https://news.naver.com",
      },
      {
        id: "nn4",
        news_id: "n2",
        text: "요즘 브랜드 이미지 예전 같지 않음",
        likes: 72,
        news_title: "나이키 브랜드 이미지 하락 보도",
        news_url: "https://news.naver.com",
      },
      {
        id: "nn5",
        news_id: "n2",
        text: "가격은 비싼데 품질은 별로라는 말 많음",
        likes: 64,
        news_title: "나이키 브랜드 이미지 하락 보도",
        news_url: "https://news.naver.com",
      },
    ],

    keywords: [
      { text: "품질", value: 120 },
      { text: "가격", value: 95 },
      { text: "배송", value: 80 },
      { text: "CS", value: 65 },
      { text: "환불", value: 50 },
      { text: "내구성", value: 40 },
    ],
  };

  // ======================
  // ✅ Associated Persons (연관 인물) 더미
  // - Person scope에서 드롭다운 없이 카드로 바로 노출
  // ======================
  const ASSOCIATED_PERSONS = [
    { id: "p1", name: "Lee Jae-yong", role: "Chairman", risk_score: 78 },
    { id: "p2", name: "Travis Scott", role: "Collaborator", risk_score: 63 },
    { id: "p3", name: "Michael Jordan", role: "Ambassador", risk_score: 35 },
  ];

  // Person 컨텍스트 데이터(Brand + Person) — 지금은 더미로 분위기만 맞춘 것
  const PERSON_CONTEXT = {
    p1: {
      overviewPatch: {
        risk_score: 78,
        positive_ratio: 24,
        negative_ratio: 66,
        neutral_ratio: 10,
        comment_count: 890,
        video_count: 9,
      },
      riskTrend: [
        { date: "Mon", negative_ratio: 40, positive_ratio: 45, risk_score: 52 },
        { date: "Tue", negative_ratio: 48, positive_ratio: 38, risk_score: 60 },
        { date: "Wed", negative_ratio: 55, positive_ratio: 30, risk_score: 69 },
        { date: "Thu", negative_ratio: 61, positive_ratio: 26, risk_score: 76 },
        { date: "Fri", negative_ratio: 70, positive_ratio: 18, risk_score: 84 },
        { date: "Sat", negative_ratio: 66, positive_ratio: 21, risk_score: 80 },
        { date: "Sun", negative_ratio: 64, positive_ratio: 23, risk_score: 79 },
      ],
      keywords: [
        { text: "논란", value: 120 },
        { text: "주가", value: 85 },
        { text: "사법", value: 70 },
        { text: "경영", value: 66 },
        { text: "리스크", value: 54 },
        { text: "사과", value: 40 },
      ],
    },
    p2: {
      overviewPatch: {
        risk_score: 63,
        positive_ratio: 30,
        negative_ratio: 55,
        neutral_ratio: 15,
        comment_count: 1120,
        video_count: 12,
      },
      riskTrend: [
        { date: "Mon", negative_ratio: 38, positive_ratio: 44, risk_score: 50 },
        { date: "Tue", negative_ratio: 44, positive_ratio: 40, risk_score: 56 },
        { date: "Wed", negative_ratio: 52, positive_ratio: 32, risk_score: 62 },
        { date: "Thu", negative_ratio: 58, positive_ratio: 28, risk_score: 68 },
        { date: "Fri", negative_ratio: 62, positive_ratio: 25, risk_score: 71 },
        { date: "Sat", negative_ratio: 57, positive_ratio: 29, risk_score: 66 },
        { date: "Sun", negative_ratio: 55, positive_ratio: 31, risk_score: 64 },
      ],
      keywords: [
        { text: "협업", value: 110 },
        { text: "불매", value: 82 },
        { text: "논란", value: 76 },
        { text: "하차", value: 60 },
        { text: "해명", value: 48 },
        { text: "팬덤", value: 38 },
      ],
    },
    p3: {
      overviewPatch: {
        risk_score: 35,
        positive_ratio: 52,
        negative_ratio: 30,
        neutral_ratio: 18,
        comment_count: 740,
        video_count: 6,
      },
      riskTrend: [
        { date: "Mon", negative_ratio: 24, positive_ratio: 58, risk_score: 28 },
        { date: "Tue", negative_ratio: 28, positive_ratio: 54, risk_score: 32 },
        { date: "Wed", negative_ratio: 30, positive_ratio: 52, risk_score: 35 },
        { date: "Thu", negative_ratio: 32, positive_ratio: 50, risk_score: 36 },
        { date: "Fri", negative_ratio: 29, positive_ratio: 54, risk_score: 33 },
        { date: "Sat", negative_ratio: 27, positive_ratio: 56, risk_score: 31 },
        { date: "Sun", negative_ratio: 28, positive_ratio: 55, risk_score: 32 },
      ],
      keywords: [
        { text: "레전드", value: 115 },
        { text: "클래식", value: 78 },
        { text: "감성", value: 62 },
        { text: "콜라보", value: 55 },
        { text: "스토리", value: 44 },
        { text: "브랜드", value: 38 },
      ],
    },
  };

  // ======================
  // ✅ UI States
  // ======================
  const [scope, setScope] = useState("brand"); // "brand" | "person"
  const [selectedPersonId, setSelectedPersonId] = useState(ASSOCIATED_PERSONS[0]?.id);

  // Top Risk contents 탭/선택/댓글탭 — scope별로 분리 (꼬임 방지)
  const [contentSource, setContentSource] = useState("youtube"); // table 탭
  const [commentSource, setCommentSource] = useState("youtube"); // comments 탭

  // 선택 상태를 scope+source 별로 분리
  const [selectedByContext, setSelectedByContext] = useState(() => ({
    brand: {
      youtube: BRAND_BASE.riskVideos[0]?.video_id ?? null,
      naver: BRAND_BASE.riskNews[0]?.news_id ?? null,
    },
    person: {
      youtube: BRAND_BASE.riskVideos[0]?.video_id ?? null,
      naver: BRAND_BASE.riskNews[0]?.news_id ?? null,
    },
  }));

  // Person scope 진입 시: 자동으로 첫 인물을 선택 (UX)
  useEffect(() => {
    if (scope === "person" && !selectedPersonId) {
      setSelectedPersonId(ASSOCIATED_PERSONS[0]?.id ?? null);
    }
  }, [scope, selectedPersonId, ASSOCIATED_PERSONS]);

  // ======================
  // ✅ Context Data Getter
  // - 나중에 여기만 API로 바꾸면 됨
  // ======================
  const contextData = useMemo(() => {
    if (scope === "brand") return BRAND_BASE;

    const patch = PERSON_CONTEXT[selectedPersonId];
    if (!patch) return BRAND_BASE;

    // overview는 brand 기본 + person patch
    const overview = { ...BRAND_BASE.overview, ...patch.overviewPatch };

    return {
      ...BRAND_BASE,
      overview,
      riskTrend: patch.riskTrend ?? BRAND_BASE.riskTrend,
      keywords: patch.keywords ?? BRAND_BASE.keywords,
      // MVP에서는 top contents/comments는 그대로 두고,
      // 나중에 실제로는 Brand+Person 쿼리 결과로 바꾸면 됨.
    };
  }, [scope, selectedPersonId]);

  const { overview, riskTrend, riskVideos, riskNews, allRiskComments, allNewsComments, keywords } =
    contextData;

  // 현재 컨텍스트의 선택값
  const selectedId = selectedByContext[scope]?.[commentSource];

  // Person scope에서 카드 클릭 시: 선택 person 설정 + UX상 commentSource/contentSource 유지
  const handleSelectPerson = (pid) => {
    setSelectedPersonId(pid);
  };

  // Top Risk row 클릭 시: scope 기준 selection 갱신 + comments 탭을 table 탭과 맞춰줌
  const onSelectContentRow = (source, id) => {
    setSelectedByContext((prev) => ({
      ...prev,
      [scope]: { ...prev[scope], [source]: id },
    }));
    setCommentSource(source);
  };

  // source 전환 시: 해당 scope의 선택값 없으면 첫 항목으로 자동 세팅
  useEffect(() => {
    if (contentSource === "youtube" && !selectedByContext[scope]?.youtube) {
      const first = riskVideos[0]?.video_id ?? null;
      setSelectedByContext((p) => ({ ...p, [scope]: { ...p[scope], youtube: first } }));
    }
    if (contentSource === "naver" && !selectedByContext[scope]?.naver) {
      const first = riskNews[0]?.news_id ?? null;
      setSelectedByContext((p) => ({ ...p, [scope]: { ...p[scope], naver: first } }));
    }
  }, [contentSource, scope, riskVideos, riskNews, selectedByContext]);

  // Comments filtering
  const filteredComments = useMemo(() => {
    if (!selectedId) return [];
    if (commentSource === "youtube") {
      return allRiskComments.filter((c) => c.video_id === selectedId).slice(0, 6);
    }
    return allNewsComments.filter((c) => c.news_id === selectedId).slice(0, 6);
  }, [selectedId, commentSource, allRiskComments, allNewsComments]);

  // ======================
  // ✅ UI Helpers
  // ======================
  const brandUpper = (overview.brand || "").toUpperCase();

  const riskLevel = useMemo(() => {
    const s = overview.risk_score;
    if (s >= 75) return { label: "CRITICAL", cls: "bg-red-500/90 text-white" };
    if (s >= 55) return { label: "WARNING", cls: "bg-amber-500/90 text-white" };
    return { label: "SAFE", cls: "bg-emerald-500/90 text-white" };
  }, [overview.risk_score]);

  const sentimentData = useMemo(
    () => [
      { name: "Positive", value: overview.positive_ratio },
      { name: "Negative", value: overview.negative_ratio },
      { name: "Neutral", value: overview.neutral_ratio },
    ],
    [overview]
  );

  const PIE_COLORS = ["#2563EB", "#0F172A", "#94A3B8"];

  const formatViews = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${Math.round(v / 1000)}K`;
    return String(v);
  };

  const getYoutubeThumb = (videoId) =>
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // PDF 이미지(실제 img 사용) — SVG를 data URI로 넣어서 별도 파일 없이도 "이미지"로 렌더링
  const PDF_ICON_DATA_URI =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
        <path fill="#ffffff" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8zm0 2.5L18.5 9H14z"/>
        <path fill="#ffffff" d="M7 18h10v-2H7zm0-4h10v-2H7zm0-4h6V8H7z"/>
      </svg>
    `);

  // ======================
  // ✅ Actions (UI only for now)
  // ======================
  const handleExport = () => {
    console.log("Export PDF (TODO)");
  };

  const handleInvite = () => {
    console.log("Invite Team (TODO)");
  };

  const handleOpenSettings = () => {
    navigate("/settings");
  };

  // ======================
  // ✅ Animations & Styles
  // ======================
  const pageVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.35 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const glassCard =
    "bg-white/45 backdrop-blur-2xl border border-white/55 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)] rounded-3xl";

  const kpiCard =
    `${glassCard} p-6 transition will-change-transform ` +
    `hover:-translate-y-1 hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.5)]`;

  // ======================
  // ✅ UI Components (내부에서만 사용)
  // ======================
  const ScopeToggle = () => (
    <div className="flex items-center gap-3 mt-8">
      <div className="text-sm font-semibold text-slate-600">Scope</div>
      <div className="inline-flex bg-white/55 border border-white/55 rounded-2xl p-1 backdrop-blur-xl">
        <button
          onClick={() => setScope("brand")}
          className={[
            "px-4 py-2 rounded-xl text-sm font-semibold transition",
            scope === "brand"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-700 hover:bg-white/60",
          ].join(" ")}
        >
          Brand
        </button>
        <button
          onClick={() => setScope("person")}
          className={[
            "px-4 py-2 rounded-xl text-sm font-semibold transition",
            scope === "person"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-700 hover:bg-white/60",
          ].join(" ")}
        >
          Person
        </button>
      </div>

      {scope === "person" && (
        <div className="ml-auto text-xs text-slate-600">
          Click a person card to switch context
        </div>
      )}
    </div>
  );

  const AssociatedPersonsPanel = () => {
    if (scope !== "person") return null;

    return (
      <motion.div variants={fadeUp} className={`${glassCard} p-6 mt-4`}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              Associated Persons
            </div>
            <div className="text-sm text-slate-600 mt-1">
              Brand-related people who can influence reputation risk
            </div>
          </div>

          <div className="text-xs text-slate-600">
            Current:{" "}
            <span className="font-bold text-slate-900">
              {ASSOCIATED_PERSONS.find((p) => p.id === selectedPersonId)?.name ?? "-"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ASSOCIATED_PERSONS.map((p) => {
            const isActive = p.id === selectedPersonId;

            const badge =
              p.risk_score >= 75
                ? "bg-red-500/90 text-white"
                : p.risk_score >= 55
                ? "bg-amber-500/90 text-white"
                : "bg-emerald-500/90 text-white";

            const initials = p.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0].toUpperCase())
              .join("");

            return (
              <button
                key={p.id}
                onClick={() => handleSelectPerson(p.id)}
                className={[
                  "text-left w-full rounded-3xl border transition p-5",
                  "bg-white/45 backdrop-blur-xl",
                  "hover:bg-white/65 hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.5)]",
                  isActive
                    ? "border-blue-500/60 ring-2 ring-blue-400/40"
                    : "border-white/55",
                ].join(" ")}
              >
                <div className="flex items-center gap-4">
                  {/* avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-sm text-slate-600 font-semibold">
                      {p.role}
                    </div>
                  </div>

                  <div className="ml-auto flex flex-col items-end">
                    <div className={`px-3 py-1 rounded-full text-xs font-extrabold ${badge}`}>
                      {p.risk_score >= 75
                        ? "CRITICAL"
                        : p.risk_score >= 55
                        ? "WARNING"
                        : "SAFE"}
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-900">
                      {p.risk_score}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-600">
                  Scope switches to <span className="font-bold text-slate-900">{brandUpper}</span>{" "}
                  + <span className="font-bold text-slate-900">{p.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // ======================
  // ✅ Render
  // ======================
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="min-h-screen pt-28 pb-20 px-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 relative "
    >
      <div className="max-w-7xl mx-auto relative">
        {/* ✅ Header Card "밖/위"에 Invite + Settings */}
        <div className="flex justify-end items-center gap-3 mb-3">
          <button
            onClick={handleInvite}
            className="px-4 py-2 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-lg"
          >
            Invite Team
          </button>

          <button
            onClick={handleOpenSettings}
            className="w-10 h-10 rounded-2xl bg-white/70 border border-white/60 backdrop-blur-xl hover:bg-white transition flex items-center justify-center shadow"
            title="Settings"
          >
            <span className="text-lg">⚙</span>
          </button>
        </div>

        {/* ====================== Header Card ====================== */}
        <motion.div variants={fadeUp} className={`${glassCard} p-7`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            {/* Left */}
            <div>
              <div className="flex items-end gap-3 flex-wrap">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {brandUpper}
                </h1>
                <div className="pb-1.5 text-sm md:text-base text-slate-600 font-semibold">
                  {scope === "brand"
                    ? "Brand Risk Dashboard"
                    : "Brand + Person Risk Dashboard"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-slate-600">
                  Last updated:{" "}
                  <span className="font-semibold">{overview.last_updated}</span>
                </span>
                <span className="text-slate-600">
                  Videos: <span className="font-semibold">{overview.video_count}</span>
                </span>
                <span className="text-slate-600">
                  Comments:{" "}
                  <span className="font-semibold">
                    {overview.comment_count.toLocaleString()}
                  </span>
                </span>

                {scope === "person" && (
                  <span className="px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-700 font-semibold">
                    Person:{" "}
                    <span className="text-slate-900 font-extrabold">
                      {ASSOCIATED_PERSONS.find((p) => p.id === selectedPersonId)?.name ?? "-"}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col items-end gap-4">
              {/* ✅ Export (헤더 카드 안) */}
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500 text-white font-extrabold hover:bg-red-600 transition shadow-lg"
                title="Export PDF Report"
              >
                <img
                  src={PDF_ICON_DATA_URI}
                  alt="pdf"
                  className="w-4 h-4"
                  draggable={false}
                />
                Export Report
              </button>

              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-2xl font-bold tracking-wide ${riskLevel.cls} shadow-lg`}>
                  {riskLevel.label}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Risk Score</div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {overview.risk_score}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ====================== Scope Toggle + Person Panel ====================== */}
        <ScopeToggle />
        <AssociatedPersonsPanel />

        {/* ====================== Trend Chart ====================== */}
        <div className="mt-8">
          <RiskTrendChart data={riskTrend} />
        </div>

        {/* ====================== KPI Cards ====================== */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6"
        >
          <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className={kpiCard}>
            <div className="text-sm text-slate-600 font-semibold">Risk Score</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{overview.risk_score}</div>
            <div className="mt-3 text-xs text-slate-500">Overall brand reputation risk indicator</div>
          </motion.div>

          <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className={kpiCard}>
            <div className="text-sm text-slate-600 font-semibold">Negative Sentiment</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{overview.negative_ratio}%</div>
            <div className="mt-3 text-xs text-slate-500">Negative sentiment among analyzed comments</div>
          </motion.div>

          <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className={kpiCard}>
            <div className="text-sm text-slate-600 font-semibold">Positive Sentiment</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{overview.positive_ratio}%</div>
            <div className="mt-3 text-xs text-slate-500">Positive sentiment among analyzed comments</div>
          </motion.div>

          <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className={kpiCard}>
            <div className="text-sm text-slate-600 font-semibold">Neutral Sentiment</div>
            <div className="mt-2 text-4xl font-extrabold text-slate-900">{overview.neutral_ratio}%</div>
            <div className="mt-3 text-xs text-slate-500">Neutral sentiment among analyzed comments</div>
          </motion.div>
        </motion.div>

        {/* ====================== Top Risk Contents ====================== */}
        <motion.div variants={fadeUp} className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Top Risk Contents</h2>
              <div className="text-sm text-slate-600 mt-1">
                Content with high negative sentiment
                {scope === "person" && (
                  <>
                    {" "}· Context:{" "}
                    <span className="font-bold text-slate-900">
                      {ASSOCIATED_PERSONS.find((p) => p.id === selectedPersonId)?.name ?? "-"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-slate-600">Click a row to view evidence comments</div>
          </div>

          <div className={`${glassCard}`}>
            <div className="bg-slate-900 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="font-bold">Top contents by negative signals</div>
                <div className="text-xs text-white/70">Sorted by negative comments / ratio</div>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setContentSource("youtube")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    contentSource === "youtube"
                      ? "bg-white text-slate-900"
                      : "bg-white/20 text-white hover:bg-white/25"
                  }`}
                >
                  YouTube
                </button>

                <button
                  onClick={() => setContentSource("naver")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    contentSource === "naver"
                      ? "bg-white text-slate-900"
                      : "bg-white/20 text-white hover:bg-white/25"
                  }`}
                >
                  Naver News
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/40 text-slate-700">
                  <tr className="border-b border-white/40">
                    <th className="text-left px-6 py-4">Rank</th>
                    <th className="text-left px-6 py-4">Thumbnail</th>
                    <th className="text-left px-6 py-4">
                      {contentSource === "youtube" ? "Video" : "Article"}
                    </th>
                    <th className="text-left px-6 py-4">Neg. Comments</th>
                    <th className="text-left px-6 py-4">Neg. Ratio</th>
                    <th className="text-left px-6 py-4">Views</th>
                    <th className="text-left px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {(contentSource === "youtube" ? riskVideos : riskNews).map((item, idx) => {
                    const rowId =
                      contentSource === "youtube" ? item.video_id : item.news_id;

                    const isSelected =
                      rowId === selectedByContext[scope]?.[contentSource];

                    return (
                      <tr
                        key={rowId}
                        onClick={() => onSelectContentRow(contentSource, rowId)}
                        className={[
                          "border-b border-white/40 transition cursor-pointer",
                          "hover:bg-blue-50/60",
                          isSelected ? "bg-blue-50/80" : "bg-white/20",
                        ].join(" ")}
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                            {idx + 1}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {contentSource === "youtube" ? (
                            <div className="w-20 h-12 rounded-xl border border-white/60 bg-white/40">
                              <img
                                src={getYoutubeThumb(rowId)}
                                alt="thumbnail"
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-12 rounded-xl border border-white/60 bg-white/40 flex items-center justify-center text-xs font-bold text-slate-600">
                              NEWS
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 line-clamp-2">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {contentSource === "youtube" ? "Video ID:" : "News ID:"} {rowId}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {item.negative_comments.toLocaleString()}
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
                            {item.negative_ratio}%
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-700 font-semibold">
                          {formatViews(item.views)}
                        </td>

                        <td className="px-6 py-4">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-blue-900 transition shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contentSource === "youtube" ? "View Video" : "View Article"}
                            <span className="opacity-80">↗</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 text-xs text-slate-600 bg-white/25">
              Evidence comments are shown below for the selected content.
            </div>
          </div>
        </motion.div>

        {/* ====================== Comments + Sentiment ====================== */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
          {/* Risk Comments */}
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Risk Comments</h3>
              <div className="text-xs text-slate-600">Evidence (Top {filteredComments.length})</div>
            </div>

            <div className="flex gap-3 mb-4 mt-4">
              <button
                onClick={() => setCommentSource("youtube")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  commentSource === "youtube"
                    ? "bg-slate-900 text-white"
                    : "bg-white/50 text-slate-700 hover:bg-white/70"
                }`}
              >
                YouTube
              </button>

              <button
                onClick={() => setCommentSource("naver")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  commentSource === "naver"
                    ? "bg-slate-900 text-white"
                    : "bg-white/50 text-slate-700 hover:bg-white/70"
                }`}
              >
                Naver
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {filteredComments.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/40 border border-white/50 text-slate-600">
                  No evidence comments found for the selected content.
                </div>
              ) : (
                filteredComments.map((c) => (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -2, scale: 1.01 }}
                    className="p-5 rounded-2xl bg-white/45 border border-white/50 shadow-lg"
                  >
                    <div className="text-slate-900 font-semibold leading-relaxed">“{c.text}”</div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                        👍 {c.likes}
                      </span>

                      <span className="truncate">
                        {commentSource === "youtube" ? "Video:" : "Article:"}{" "}
                        <span className="font-semibold">
                          {commentSource === "youtube" ? c.video_title : c.news_title}
                        </span>
                      </span>

                      <a
                        href={commentSource === "youtube" ? c.video_url : c.news_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-blue-900 transition"
                      >
                        Open ↗
                      </a>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Sentiment Overview */}
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Sentiment Overview</h3>
              <div className="text-xs text-slate-600">Donut chart</div>
            </div>

            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={2}
                  >
                    {sentimentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.5)",
                      backdropFilter: "blur(16px)",
                      background: "rgba(255,255,255,0.65)",
                      color: "#0F172A",
                      boxShadow: "0 20px 60px -25px rgba(15,23,42,0.35)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/45 border border-white/50">
                <div className="text-xs text-slate-600 font-semibold">Positive</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {overview.positive_ratio}%
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/45 border border-white/50">
                <div className="text-xs text-slate-600 font-semibold">Negative</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {overview.negative_ratio}%
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/45 border border-white/50">
                <div className="text-xs text-slate-600 font-semibold">Neutral</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {overview.neutral_ratio}%
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ====================== Risk Keywords ====================== */}
        <div className="mt-10">
          <RiskKeywordCloud keywords={keywords} />
        </div>
      </div>
    </motion.div>
  );
}