import React, { useState } from 'react';
import { Search, Brain, ArrowRight, Info, PlusCircle, Tag, Check } from 'lucide-react';
import { api } from '../api/client';

const SAMPLE_QUESTIONS = [
  { text: "Define an Abstract Data Type (ADT) and list two examples.", level: "L1: Remember" },
  { text: "Explain why B-Trees are preferred over standard BSTs for disk-based indexing.", level: "L2: Understand" },
  { text: "Calculate the single-source shortest paths using Dijkstra's algorithm for the given graph.", level: "L3: Apply" },
  { text: "Compare and contrast QuickSort and MergeSort with respect to space complexity and stability.", level: "L4: Analyze" },
  { text: "Evaluate the suitability of Splay Trees versus AVL Trees in caching high-frequency queries.", level: "L5: Evaluate" },
  { text: "Design a fault-tolerant B-Tree structure and formulate its node splitting algorithm.", level: "L6: Create" },
  { text: "Explain the working of QuickSort and calculate the worst-case time complexity with Lomuto partitioning.", level: "Compound Stem" }
];

const BLOOM_INFO = {
  L1: { name: 'Remember', badge: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/60', desc: 'Recall facts and basic concepts' },
  L2: { name: 'Understand', badge: 'bg-sky-900/40 text-sky-400 border-sky-700/60', desc: 'Explain ideas or concepts' },
  L3: { name: 'Apply', badge: 'bg-indigo-900/40 text-indigo-400 border-indigo-700/60', desc: 'Use information in new situations' },
  L4: { name: 'Analyze', badge: 'bg-amber-900/40 text-amber-400 border-amber-700/60', desc: 'Draw connections among ideas' },
  L5: { name: 'Evaluate', badge: 'bg-rose-900/40 text-rose-400 border-rose-700/60', desc: 'Justify a stand or decision' },
  L6: { name: 'Create', badge: 'bg-purple-900/40 text-purple-400 border-purple-700/60', desc: 'Produce new or original work' }
};

export default function NLPInspectorView({ subjectId, subjectDetail, onQuestionAdded, theme }) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';

  const [inputText, setInputText] = useState("Explain the working of Dijkstra's algorithm and calculate the shortest path for the given 6-vertex weighted graph.");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleClassify = async (textToAnalyze = inputText) => {
    if (!textToAnalyze.trim()) return;
    setAnalyzing(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const data = await api.classifyQuestion(textToAnalyze, subjectId);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to classify question.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectSample = (sample) => {
    setInputText(sample.text);
    handleClassify(sample.text);
  };

  const handleSaveToBank = async () => {
    if (!result || !subjectDetail) return;
    try {
      const unitNum = result.suggested_unit_number || 1;
      const unitObj = subjectDetail.units?.find(u => u.unit_number === unitNum) || subjectDetail.units?.[0];
      const coObj = subjectDetail.course_outcomes?.find(c => c.code === result.suggested_co_code) || subjectDetail.course_outcomes?.[0];

      const isShort = result.predicted_bloom_level === 'L1' || result.predicted_bloom_level === 'L2';
      await api.createQuestion({
        subject_id: subjectId,
        unit_id: unitObj.id,
        co_id: coObj.id,
        question_text: result.question_text,
        marks: isShort ? 2 : 10,
        bloom_level: result.predicted_bloom_level,
        difficulty: result.predicted_bloom_level === 'L5' || result.predicted_bloom_level === 'L6' ? 'HARD' : 'MEDIUM',
        question_type: isShort ? 'SHORT' : 'LONG',
        action_verb: result.primary_verb,
        confidence_score: result.confidence_score
      });

      setSaveSuccess(true);
      if (onQuestionAdded) onQuestionAdded();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save question: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} border rounded-lg p-6`}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-zinc-400" />
          <h2 className="text-base font-bold tracking-tight">Cognitive Taxonomy Linguistic Analyzer</h2>
        </div>
        <p className="text-xs text-zinc-500 max-w-3xl">
          Anderson & Krathwohl Revised Bloom's Taxonomy framework with grammatical action-verb decomposition,
          compound stem cognitive weighting, and automated Course Outcome syllabus alignment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Samples */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`${cardBg} border rounded-lg p-5 space-y-3`}>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Input Academic Question Stem
            </label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Design an algorithm to detect and remove a loop in a singly linked list..."
              className={`w-full ${subBg} border rounded p-3 text-xs focus:outline-none focus:border-zinc-500 font-mono leading-relaxed`}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">
                {inputText.length} characters • {inputText.split(/\s+/).filter(Boolean).length} tokens
              </span>
              <button
                onClick={() => handleClassify()}
                disabled={analyzing || !inputText.trim()}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded transition-colors ${
                  isDark
                    ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                }`}
              >
                {analyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing Syntax...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Analyze Cognitive Level
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Benchmark Engineering Presets */}
          <div className={`${cardBg} border rounded-lg p-5`}>
            <span className="text-xs font-bold text-zinc-500 block mb-3 uppercase tracking-wider">
              Benchmark Academic Stems
            </span>
            <div className="space-y-2">
              {SAMPLE_QUESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(s)}
                  className={`w-full text-left p-2.5 rounded border transition-colors flex items-start justify-between gap-3 ${
                    isDark
                      ? 'bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                  }`}
                >
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2">
                    "{s.text}"
                  </span>
                  <span className={`text-[10px] whitespace-nowrap font-mono px-2 py-0.5 rounded border ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-200 border-zinc-300 text-zinc-800'}`}>
                    {s.level}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Decomposition Output */}
        <div className="lg:col-span-6 space-y-4">
          {error && (
            <div className="p-4 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {result ? (
            <div className={`${cardBg} border rounded-lg p-5 space-y-5`}>
              {/* Primary Cognitive Tag Banner */}
              <div className={`${subBg} border p-4 rounded flex items-center justify-between`}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                    Governing Cognitive Level
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-base font-bold font-mono px-2.5 py-0.5 rounded border ${BLOOM_INFO[result.predicted_bloom_level]?.badge}`}>
                      {result.predicted_bloom_level}
                    </span>
                    <span className="text-base font-bold">
                      {result.level_name}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {BLOOM_INFO[result.predicted_bloom_level]?.desc}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                    Model Confidence
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {Math.round(result.confidence_score * 100)}%
                  </p>
                  <span className="text-[10px] text-zinc-500">Linguistic Certainty</span>
                </div>
              </div>

              {/* Action Verbs Decomposition */}
              <div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2">
                  Action Verb Extraction & Weighting
                </span>
                {result.detected_verbs && result.detected_verbs.length > 0 ? (
                  <div className="space-y-2">
                    {result.detected_verbs.map((v, i) => (
                      <div key={i} className={`flex items-center justify-between ${subBg} p-2.5 rounded border text-xs`}>
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-mono font-bold">"{v.verb}"</span>
                          <span className="text-zinc-500">$\rightarrow$</span>
                          <span className="font-semibold">{v.bloom_level} ({v.level_name})</span>
                        </div>
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-200 border-zinc-300 text-zinc-700'}`}>
                          Weight: {v.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Inferred from syntactic question structure.</p>
                )}
              </div>

              {/* Rationale */}
              <div className={`${subBg} border p-3.5 rounded space-y-1.5`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  Classification Rationale
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans">
                  {result.rationale}
                </p>
              </div>

              {/* Automated CO & Syllabus Unit Recommendation */}
              <div className={`grid grid-cols-2 gap-3 pt-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className={`${subBg} p-3 rounded border`}>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">Course Outcome</span>
                  <p className="text-sm font-bold font-mono mt-0.5">
                    {result.suggested_co_code || 'CO1'}
                  </p>
                  <span className="text-[10px] text-zinc-500">OBE Mapping</span>
                </div>

                <div className={`${subBg} p-3 rounded border`}>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">Syllabus Unit</span>
                  <p className="text-sm font-bold font-mono mt-0.5">
                    Unit {result.suggested_unit_number || 1}
                  </p>
                  <span className="text-[10px] text-zinc-500">Content Scope</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Store directly in master repository
                </span>
                <button
                  onClick={handleSaveToBank}
                  disabled={saveSuccess}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded transition-colors ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Saved to Question Bank!
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add to Question Bank
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className={`${cardBg} border rounded-lg p-12 text-center space-y-3`}>
              <Brain className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-semibold">Awaiting Linguistic Input</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Select an academic stem on the left or type your own question to inspect cognitive level decomposition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
