import React, { useState } from 'react';
import { FileText, RefreshCw, Printer, Download, CheckCircle, BarChart3, ArrowRightLeft, X, Check, Award, AlertCircle, CheckSquare, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';

const BLOOM_BADGES = {
  L1: 'bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  L2: 'bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-500/30',
  L3: 'bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  L4: 'bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-500/30',
  L5: 'bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-500/30',
  L6: 'bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-500/30',
};

function parseOptions(optionsRaw) {
  if (!optionsRaw) return null;
  if (typeof optionsRaw === 'string') {
    try {
      return JSON.parse(optionsRaw);
    } catch {
      return optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return optionsRaw;
}

function RenderQuestionOptions({ options, isDark }) {
  const parsed = parseOptions(options);
  if (!parsed) return null;

  if (Array.isArray(parsed)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
        {parsed.map((opt, i) => (
          <div
            key={i}
            className={`text-[11px] px-2.5 py-1.5 rounded border font-mono ${
              isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            {typeof opt === 'string' ? opt : JSON.stringify(opt)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof parsed === 'object') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
        {Object.entries(parsed).map(([key, val]) => (
          <div
            key={key}
            className={`text-[11px] px-2.5 py-1.5 rounded border font-mono ${
              isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            <strong className="text-zinc-400 mr-1.5">({key})</strong>
            <span>{String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function PaperStudioView({ paper, onPaperUpdated, onNavigateToPrint, theme }) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';

  const [selectedQuestionForSwap, setSelectedQuestionForSwap] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState(null);
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);

  if (!paper) {
    return (
      <div className={`${cardBg} border rounded-lg p-12 text-center text-zinc-500`}>
        No generated paper selected. Please generate a paper from the Exam Blueprint Composer.
      </div>
    );
  }

  const handleOpenSwap = async (question) => {
    setSelectedQuestionForSwap(question);
    setCandidates([]);
    setLoadingCandidates(true);
    setSwapError(null);

    try {
      const data = await api.getSwapCandidates(paper.id, question.question_id);
      setCandidates(data);
    } catch (err) {
      setSwapError(err.message || 'Failed to fetch swap candidates.');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleExecuteSwap = async (targetQuestionId) => {
    if (!selectedQuestionForSwap) return;
    setSwapping(true);
    try {
      const updated = await api.swapQuestion({
        paper_id: paper.id,
        current_question_id: selectedQuestionForSwap.question_id,
        target_question_id: targetQuestionId,
      });
      setSelectedQuestionForSwap(null);
      if (onPaperUpdated) onPaperUpdated(updated);
    } catch (err) {
      setSwapError(err.message || 'Failed to swap question.');
    } finally {
      setSwapping(false);
    }
  };

  const coQualityLabel = paper.co_attainment?.balance_metric?.quality_label || paper.co_attainment?.quality_label || 'Optimal CO Balance';
  const coStdDev = paper.co_attainment?.balance_metric?.std_deviation !== undefined
    ? paper.co_attainment.balance_metric.std_deviation
    : (paper.co_attainment?.std_dev !== undefined ? paper.co_attainment.std_dev : null);

  return (
    <div className="space-y-6">
      {/* Exam Paper Header & Actions */}
      <div className={`${cardBg} border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded border ${
              isDark ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}>
              {paper.paper_code}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              {paper.academic_year} • {paper.semester_label}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">{paper.title}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {paper.subject_code} - {paper.subject_name} • {paper.department}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`text-right px-3 py-1.5 rounded-md border font-mono text-xs ${subBg}`}>
            <span className="text-zinc-500">Total Marks: </span>
            <strong className="font-bold">{paper.total_marks}M</strong>
            <span className="text-zinc-400 dark:text-zinc-600 mx-1.5">|</span>
            <span className="text-zinc-500">Duration: </span>
            <strong className="font-bold">{paper.duration_minutes}m</strong>
          </div>

          {/* Toggle Answer Key Button */}
          <button
            onClick={() => setShowAnswerKeys(!showAnswerKeys)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors shadow-sm ${
              showAnswerKeys
                ? isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
            }`}
            title="Toggle display of MCQ answer keys in studio"
          >
            {showAnswerKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAnswerKeys ? 'Hide Keys' : 'Show Keys'}
          </button>

          <a
            href={api.getDownloadPdfUrl(paper.id)}
            download
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors shadow-sm ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>

          <button
            onClick={onNavigateToPrint}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md shadow-sm transition-colors ${
              isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-bold' : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Print View
          </button>
        </div>
      </div>

      {/* Analytics Summary Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bloom Distribution Attainment */}
        <div className={`${cardBg} border rounded-lg p-4 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Bloom's Taxonomy Breakdown</span>
            <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="space-y-1.5 pt-1">
            {Object.entries(paper.bloom_analysis?.percentages || {}).map(([bl, pct]) => (
              <div key={bl} className="flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-500 font-semibold">{bl}:</span>
                <div className="flex items-center gap-2 flex-1 mx-2">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <div className="bg-zinc-600 dark:bg-zinc-300 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="font-mono font-bold">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Course Outcome (CO) Attainment */}
        <div className={`${cardBg} border rounded-lg p-4 space-y-2`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold">Course Outcome Coverage</span>
              <span className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isDark ? 'bg-zinc-800 text-emerald-400 border-zinc-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                {coQualityLabel}
              </span>
            </div>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="grid grid-cols-5 gap-1 pt-2">
            {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => {
              const count = paper.co_attainment?.counts?.[co] || 0;
              const pct = paper.co_attainment?.percentages?.[co] || 0;
              return (
                <div key={co} className={`${subBg} p-2 rounded text-center border`}>
                  <span className="text-[10px] font-mono font-bold text-zinc-400">{co}</span>
                  <p className="text-xs font-bold mt-0.5">{count}</p>
                  <span className="text-[9px] text-zinc-500">{pct}%</span>
                </div>
              );
            })}
          </div>
          {coStdDev !== null && (
            <p className="text-[10px] text-zinc-500 font-mono text-right pt-0.5">
              Coverage StdDev: {coStdDev}
            </p>
          )}
        </div>

        {/* Difficulty Ratio */}
        <div className={`${cardBg} border rounded-lg p-4 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Difficulty Distribution</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['EASY', 'MEDIUM', 'HARD'].map((d) => {
              const count = paper.difficulty_analysis?.counts?.[d] || 0;
              const pct = paper.difficulty_analysis?.percentages?.[d] || 0;
              return (
                <div key={d} className={`${subBg} p-2 rounded text-center border`}>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">{d}</span>
                  <p className="text-xs font-bold mt-0.5">{count}</p>
                  <span className="text-[9px] text-zinc-500">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sections & Questions Preview */}
      <div className="space-y-6">
        {paper.sections?.map((section, sIdx) => (
          <div key={sIdx} className={`${cardBg} border rounded-lg overflow-hidden shadow-sm`}>
            {/* Section Header */}
            <div className={`border-b px-6 py-3 flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div>
                <h3 className="text-sm font-bold tracking-tight">{section.name}</h3>
                <p className="text-xs text-zinc-500">{section.description}</p>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                isDark ? 'bg-zinc-900 text-zinc-300 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
              }`}>
                {section.total_marks} Marks
              </span>
            </div>

            {/* Questions List */}
            <div className={`divide-y p-4 space-y-3 ${isDark ? 'divide-zinc-800/80' : 'divide-zinc-200'}`}>
              {section.questions.map((q, qIdx) => {
                const isEitherOrSecond = q.choice_option === 'B';
                const isMCQ = q.question_type === 'MCQ' || Boolean(q.options);

                return (
                  <React.Fragment key={qIdx}>
                    {/* Render visual OR divider between internal choice pairs */}
                    {isEitherOrSecond && (
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className={`w-full border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className={`px-3 font-mono font-bold text-amber-500 text-[11px] uppercase tracking-widest border rounded ${
                            isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-100 border-zinc-300'
                          }`}>
                            (OR)
                          </span>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-start justify-between gap-4 p-3 rounded-md transition-colors group ${
                      isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-100/70'
                    }`}>
                      <div className="flex items-start gap-3 flex-1">
                        <span className="font-mono font-bold text-xs text-zinc-400 w-12 shrink-0 pt-0.5">
                          {q.q_number}.
                        </span>
                        <div className="space-y-1.5 flex-1">
                          <p className="text-xs font-normal leading-relaxed">
                            {q.question_text}
                          </p>

                          {/* MCQ Options Display */}
                          {isMCQ && q.options && (
                            <RenderQuestionOptions options={q.options} isDark={isDark} />
                          )}

                          {/* Faculty Answer Key Indicator */}
                          {isMCQ && showAnswerKeys && q.correct_answer && (
                            <div className="text-[11px] font-mono text-emerald-500 font-semibold pt-1">
                              Answer Key: ({q.correct_answer})
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {/* Question Type Badge */}
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              q.question_type === 'MCQ'
                                ? isDark ? 'bg-sky-950/80 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-300'
                                : isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                            }`}>
                              {q.question_type || 'SHORT'}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                            }`}>
                              Unit {q.unit_number}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              isDark ? 'bg-zinc-950 text-zinc-300 border-zinc-800' : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                            }`}>
                              {q.co_code}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${BLOOM_BADGES[q.bloom_level] || ''}`}>
                              {q.bloom_level}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-mono font-bold text-xs px-2 py-1 rounded border ${
                          isDark ? 'bg-zinc-950 text-zinc-200 border-zinc-800' : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                        }`}>
                          {q.marks}M
                        </span>
                        <button
                          onClick={() => handleOpenSwap(q)}
                          className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border transition-colors ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border-zinc-300'
                          }`}
                          title="Substitute with another question from the repository"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-zinc-400" />
                          Swap
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Question Swap Modal */}
      {selectedQuestionForSwap && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className={`${cardBg} border rounded-lg w-full max-w-2xl p-6 space-y-4 shadow-2xl`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                  Swap Question: {selectedQuestionForSwap.q_number}
                </h3>
                <p className="text-xs text-zinc-500">
                  Select a compatible question from Unit {selectedQuestionForSwap.unit_number} ({selectedQuestionForSwap.marks} Marks)
                </p>
              </div>
              <button
                onClick={() => setSelectedQuestionForSwap(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Question */}
            <div className={`${subBg} p-3 rounded-md border space-y-1`}>
              <span className="text-[10px] uppercase font-semibold text-zinc-500">Current Question:</span>
              <p className="text-xs">{selectedQuestionForSwap.question_text}</p>
              {selectedQuestionForSwap.options && (
                <RenderQuestionOptions options={selectedQuestionForSwap.options} isDark={isDark} />
              )}
            </div>

            {/* Compatible Candidates List */}
            <div className="space-y-2">
              <span className="text-xs font-bold block">
                Compatible Repository Candidates:
              </span>

              {loadingCandidates ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Searching compatible repository questions...
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No alternative questions available in the repository matching Unit {selectedQuestionForSwap.unit_number} and {selectedQuestionForSwap.marks} Marks.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {candidates.map((cand) => (
                    <div
                      key={cand.question_id}
                      className={`${subBg} p-3 rounded-md border hover:border-zinc-500 transition-colors flex items-start justify-between gap-3 group`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <p className="text-xs">{cand.question_text}</p>
                        {cand.options && (
                          <RenderQuestionOptions options={cand.options} isDark={isDark} />
                        )}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            cand.question_type === 'MCQ'
                              ? isDark ? 'bg-sky-950/80 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-300'
                              : isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}>
                            {cand.question_type || 'SHORT'}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${BLOOM_BADGES[cand.bloom_level] || ''}`}>
                            {cand.bloom_level}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-zinc-400">
                            {cand.co_code}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Match Score: {cand.match_score}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleExecuteSwap(cand.question_id)}
                        disabled={swapping}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md shrink-0 flex items-center gap-1 shadow-sm transition-colors ${
                          isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-bold' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Replace
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`flex justify-end pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                onClick={() => setSelectedQuestionForSwap(null)}
                className={`px-4 py-2 text-xs font-medium rounded-md border ${
                  isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
