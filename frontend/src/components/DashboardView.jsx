import React from 'react';
import {
  BookOpen,
  Layers,
  Award,
  FileCheck2,
  Activity,
  CheckCircle2,
  Search,
  Sliders,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Check
} from 'lucide-react';

const BLOOM_COLORS = {
  L1: { label: 'L1: Remember', bar: 'bg-emerald-500 dark:bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300', lots: true, badge: 'LOTS' },
  L2: { label: 'L2: Understand', bar: 'bg-sky-500 dark:bg-sky-400', text: 'text-sky-700 dark:text-sky-300', lots: true, badge: 'LOTS' },
  L3: { label: 'L3: Apply', bar: 'bg-indigo-500 dark:bg-indigo-400', text: 'text-indigo-700 dark:text-indigo-300', lots: true, badge: 'LOTS' },
  L4: { label: 'L4: Analyze', bar: 'bg-amber-500 dark:bg-amber-400', text: 'text-amber-700 dark:text-amber-300', lots: false, badge: 'HOTS' },
  L5: { label: 'L5: Evaluate', bar: 'bg-rose-500 dark:bg-rose-400', text: 'text-rose-700 dark:text-rose-300', lots: false, badge: 'HOTS' },
  L6: { label: 'L6: Create', bar: 'bg-purple-500 dark:bg-purple-400', text: 'text-purple-700 dark:text-purple-300', lots: false, badge: 'HOTS' },
};

export default function DashboardView({ stats, subjectDetail, onNavigate, onQuickGenerate, theme }) {
  const isDark = theme === 'dark';

  if (!stats || !subjectDetail) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDark ? 'border-zinc-400' : 'border-zinc-800'}`}></div>
      </div>
    );
  }

  const totalQuestions = stats.total_questions || 0;
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200';

  // Calculate HOTS vs LOTS (Higher Order Thinking Skills vs Lower Order)
  const lotsCount = (stats.bloom_distribution?.L1 || 0) + (stats.bloom_distribution?.L2 || 0) + (stats.bloom_distribution?.L3 || 0);
  const hotsCount = (stats.bloom_distribution?.L4 || 0) + (stats.bloom_distribution?.L5 || 0) + (stats.bloom_distribution?.L6 || 0);
  const lotsPct = totalQuestions > 0 ? Math.round((lotsCount / totalQuestions) * 100) : 50;
  const hotsPct = totalQuestions > 0 ? Math.round((hotsCount / totalQuestions) * 100) : 50;

  return (
    <div className="space-y-6">
      {/* Course Banner */}
      <div className={`${cardBg} border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'}`}>
              {subjectDetail.code}
            </span>
            <span className="text-xs text-zinc-500">Semester {subjectDetail.semester} • {subjectDetail.regulation}</span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> NBA/NAAC Compliant
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{subjectDetail.name}</h1>
          <p className="text-xs text-zinc-500 mt-1">{subjectDetail.department}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('questions')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Question Bank</span>
          </button>
          <button
            onClick={() => onNavigate('composer')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors ${
              isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-bold' : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Compose Blueprint</span>
          </button>
        </div>
      </div>

      {/* Institutional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Master Repository */}
        <div className={`${cardBg} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">Master Repository</span>
            <BookOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{totalQuestions}</span>
            <span className="text-xs text-emerald-500 font-medium">Questions Indexed</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Verified with action-verb NLP tags</p>
        </div>

        {/* Syllabus Coverage */}
        <div className={`${cardBg} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">Syllabus Coverage</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{subjectDetail.units?.length || 5}</span>
            <span className="text-xs text-zinc-500 font-medium">Syllabus Units</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Balanced question pool across units</p>
        </div>

        {/* Course Outcomes */}
        <div className={`${cardBg} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">Course Outcomes</span>
            <Award className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{subjectDetail.course_outcomes?.length || 5}</span>
            <span className="text-xs text-zinc-500 font-medium">Active COs (OBE)</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Mapped to Bloom cognitive levels</p>
        </div>

        {/* Cognitive HOTS Balance */}
        <div className={`${cardBg} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">Cognitive HOTS Balance</span>
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-sky-500">{hotsPct}%</span>
            <span className="text-xs text-zinc-500 font-medium">L4-L6 Analytical</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">LOTS: {lotsPct}% • HOTS: {hotsPct}%</p>
        </div>
      </div>

      {/* Grid: Bloom's Taxonomy Cognitive Distribution & Difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${cardBg} border rounded-lg p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Bloom's Taxonomy Cognitive Balance</h2>
              <p className="text-xs text-zinc-500">Anderson & Krathwohl 6-level taxonomy distribution</p>
            </div>
            {/* LOTS vs HOTS badge */}
            <div className={`text-[11px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-2 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
            }`}>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">LOTS: {lotsPct}%</span>
              <span className="text-zinc-400">|</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">HOTS: {hotsPct}%</span>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(BLOOM_COLORS).map(([level, meta]) => {
              const count = stats.bloom_distribution?.[level] || 0;
              const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
              return (
                <div key={level} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${meta.text}`}>{meta.label}</span>
                      <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                        meta.lots
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/40'
                          : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/40'
                      }`}>
                        {meta.badge}
                      </span>
                    </div>
                    <span className="text-zinc-500 font-mono">
                      {count} questions ({pct}%)
                    </span>
                  </div>
                  <div className={`w-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} h-2 rounded-full overflow-hidden`}>
                    <div
                      className={`h-full ${meta.bar} transition-all duration-300`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulty Matrix */}
        <div className={`${cardBg} border rounded-lg p-5 space-y-5`}>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Difficulty Matrix</h2>
            <p className="text-xs text-zinc-500 mb-3">Target ratio for exam balance</p>
            <div className="grid grid-cols-3 gap-2">
              <div className={`${subBg} border p-2.5 rounded text-center`}>
                <span className="text-[10px] uppercase font-bold text-emerald-500">Easy</span>
                <p className="text-lg font-bold mt-0.5 text-zinc-900 dark:text-zinc-100">{stats.difficulty_distribution?.EASY || 0}</p>
                <span className="text-[10px] text-zinc-500">Foundational</span>
              </div>
              <div className={`${subBg} border p-2.5 rounded text-center`}>
                <span className="text-[10px] uppercase font-bold text-sky-500">Medium</span>
                <p className="text-lg font-bold mt-0.5 text-zinc-900 dark:text-zinc-100">{stats.difficulty_distribution?.MEDIUM || 0}</p>
                <span className="text-[10px] text-zinc-500">Application</span>
              </div>
              <div className={`${subBg} border p-2.5 rounded text-center`}>
                <span className="text-[10px] uppercase font-bold text-rose-500">Hard</span>
                <p className="text-lg font-bold mt-0.5 text-zinc-900 dark:text-zinc-100">{stats.difficulty_distribution?.HARD || 0}</p>
                <span className="text-[10px] text-zinc-500">Synthesis</span>
              </div>
            </div>
          </div>

          <div className={`border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pt-4`}>
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Marks Breakdown</h2>
            <p className="text-xs text-zinc-500 mb-3">Question count by credit marks</p>
            <div className="grid grid-cols-2 gap-2">
              <div className={`${subBg} border p-2.5 rounded flex items-center justify-between`}>
                <div>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">2 Marks</span>
                  <p className="text-[10px] text-zinc-500">Part A Compulsory</p>
                </div>
                <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">{stats.marks_distribution?.[2] || 0}</span>
              </div>
              <div className={`${subBg} border p-2.5 rounded flex items-center justify-between`}>
                <div>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">10 / 16 Marks</span>
                  <p className="text-[10px] text-zinc-500">Part B Long Answer</p>
                </div>
                <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {(stats.marks_distribution?.[10] || 0) + (stats.marks_distribution?.[16] || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Units Breakdown */}
      <div className={`${cardBg} border rounded-lg p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Syllabus Units & Repository Readiness</h2>
            <p className="text-xs text-zinc-500">Unit-wise question inventory supporting balanced autonomous exam generation</p>
          </div>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-xs text-blue-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Manage Syllabus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(subjectDetail.units || []).map((u) => {
            const count = stats.unit_distribution?.[u.unit_number] || 0;
            return (
              <div key={u.id} className={`${subBg} border p-3.5 rounded-lg space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                    UNIT {u.unit_number}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2" title={u.title}>
                  {u.title}
                </p>
                <div className={`pt-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} flex items-center justify-between text-[11px]`}>
                  <span className="text-zinc-500">Indexed Pool:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{count} Qs</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
