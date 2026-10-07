import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Award,
  Check,
  Zap,
  SlidersHorizontal,
  GraduationCap
} from 'lucide-react';
import { api } from '../api/client';

export default function ExamComposerView({ subjectId, subjectDetail, onPaperGenerated, theme }) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const [examType, setExamType] = useState('END_SEM');
  const [title, setTitle] = useState('Autonomous Semester End Examination');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semesterLabel, setSemesterLabel] = useState('B.Tech IV Year I Semester');
  const [totalMarks, setTotalMarks] = useState(70);
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [unitsIncluded, setUnitsIncluded] = useState([1, 2, 3, 4, 5]);

  // Section options
  const [partAType, setPartAType] = useState('SHORT'); // SHORT, MCQ, MIXED
  const [includePartC, setIncludePartC] = useState(false);

  // Advanced cognitive tuning accordion (hidden by default to eliminate slider fatigue)
  const [showAdvancedTuning, setShowAdvancedTuning] = useState(false);

  // Bloom's Target Sliders
  const [bloomDist, setBloomDist] = useState({
    L1: 15,
    L2: 20,
    L3: 30,
    L4: 20,
    L5: 10,
    L6: 5,
  });

  // Difficulty Target Sliders
  const [diffDist, setDiffDist] = useState({
    EASY: 30,
    MEDIUM: 50,
    HARD: 20,
  });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const bloomTotal = Object.values(bloomDist).reduce((a, b) => a + Number(b), 0);
  const diffTotal = Object.values(diffDist).reduce((a, b) => a + Number(b), 0);

  const presets = [
    {
      id: 'END_SEM',
      title: 'Autonomous End-Semester (70M)',
      tag: 'Most Popular',
      marks: 70,
      duration: 180,
      desc: 'Standard Autonomous CBCS regulation. Part A (10 × 2M) + Part B (5 × 10M Either/Or internal choice).',
      units: [1, 2, 3, 4, 5],
      partA: 'SHORT',
      partC: false,
      bloom: { L1: 15, L2: 20, L3: 30, L4: 20, L5: 10, L6: 5 },
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
    },
    {
      id: 'END_SEM_100',
      title: 'Autonomous End-Semester (100M)',
      tag: 'Full Standard',
      marks: 100,
      duration: 180,
      desc: 'Full 100-mark paper: Part A (20M) + Part B (65M Either/Or) + Part C (15M Case Study / System Design).',
      units: [1, 2, 3, 4, 5],
      partA: 'SHORT',
      partC: true,
      bloom: { L1: 10, L2: 20, L3: 30, L4: 25, L5: 10, L6: 5 },
      diff: { EASY: 25, MEDIUM: 50, HARD: 25 },
    },
    {
      id: 'MID_SEM',
      title: 'Continuous Assessment / Mid-Sem (30M)',
      tag: 'Internal Test',
      marks: 30,
      duration: 90,
      desc: 'Mid-term evaluation for Units 1 & 2. Part A (5 × 2M) + Part B (2 × 10M Either/Or).',
      units: [1, 2],
      partA: 'SHORT',
      partC: false,
      bloom: { L1: 20, L2: 30, L3: 35, L4: 15, L5: 0, L6: 0 },
      diff: { EASY: 40, MEDIUM: 50, HARD: 10 },
    },
    {
      id: 'QUIZ_MCQ',
      title: 'Objective Assessment Quiz (25M)',
      tag: 'Pure MCQ',
      marks: 25,
      duration: 45,
      desc: '25 Objective Multiple Choice Questions with answer keys spanning all syllabus units.',
      units: [1, 2, 3, 4, 5],
      partA: 'MCQ',
      partC: false,
      bloom: { L1: 30, L2: 40, L3: 20, L4: 10, L5: 0, L6: 0 },
      diff: { EASY: 40, MEDIUM: 40, HARD: 20 },
    },
  ];

  const handleApplyPreset = (p) => {
    setExamType(p.id);
    setTitle(p.title);
    setTotalMarks(p.marks);
    setDurationMinutes(p.duration);
    setUnitsIncluded(p.units);
    setPartAType(p.partA);
    setIncludePartC(p.partC);
    setBloomDist(p.bloom);
    setDiffDist(p.diff);
  };

  const handleUnitToggle = (unitNum) => {
    if (unitsIncluded.includes(unitNum)) {
      if (unitsIncluded.length > 1) {
        setUnitsIncluded(unitsIncluded.filter((u) => u !== unitNum));
      }
    } else {
      setUnitsIncluded([...unitsIncluded, unitNum].sort((a, b) => a - b));
    }
  };

  const handleSelectAllUnits = () => {
    const allNums = (subjectDetail?.units || []).map((u) => u.unit_number);
    setUnitsIncluded(allNums.length > 0 ? allNums : [1, 2, 3, 4, 5]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await api.generatePaper({
        subject_id: subjectId,
        title,
        academic_year: academicYear,
        semester_label: semesterLabel,
        exam_type: examType,
        total_marks: totalMarks,
        duration_minutes: durationMinutes,
        part_a_type: examType === 'QUIZ_MCQ' ? 'MCQ' : partAType,
        include_part_c: examType === 'END_SEM_100' ? true : includePartC,
        bloom_distribution: bloomDist,
        difficulty_distribution: diffDist,
        units_included: unitsIncluded,
      });

      if (onPaperGenerated) {
        onPaperGenerated(response);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate question paper.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Linear-Style Header */}
      <div className={`${cardBg} border rounded-lg p-6 space-y-4 transition-colors`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}>
                OBE Blueprint Solver
              </span>
              <span className="text-xs text-zinc-500 font-mono">Autonomous CBCS Standards</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Compose Examination Paper</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select an institutional template to generate an outcome-balanced question paper with zero manual friction.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold ${subBg}`}>
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {durationMinutes} Mins
              <span className="text-zinc-500">|</span>
              <strong className="text-emerald-500">{totalMarks} Marks</strong>
            </span>
          </div>
        </div>

        {/* 1-Click University OBE Blueprint Presets (Hero Section) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          {presets.map((preset) => {
            const isSelected = examType === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3.5 rounded-lg border text-left transition-all relative flex flex-col justify-between group ${
                  isSelected
                    ? isDark
                      ? 'bg-zinc-800/90 border-zinc-300 text-zinc-100 shadow-md ring-1 ring-zinc-400'
                      : 'bg-zinc-50 border-zinc-900 text-zinc-950 shadow-md ring-1 ring-zinc-900'
                    : isDark
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border ${
                      isSelected
                        ? isDark ? 'bg-zinc-900 text-emerald-400 border-zinc-700' : 'bg-white text-emerald-700 border-zinc-300'
                        : isDark ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}>
                      {preset.tag}
                    </span>
                    <span className="font-mono text-xs font-bold">{preset.marks}M</span>
                  </div>

                  <h3 className="text-xs font-bold tracking-tight mb-1">{preset.title}</h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">{preset.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-inherit text-[10px] font-mono text-zinc-500">
                  <span>{preset.duration} mins</span>
                  <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-emerald-500' : ''}`}>
                    {isSelected ? <Check className="w-3 h-3" /> : null}
                    {isSelected ? 'Selected' : 'Click to select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg border text-xs flex items-center gap-2 ${
          isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Studio Grid: Configuration on Left, Live Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scope, Format & Units */}
        <div className="lg:col-span-7 space-y-5">
          {/* Metadata Card */}
          <div className={`${cardBg} border rounded-lg p-5 space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Examination Header & Course Info
              </h2>
              <span className="text-[11px] font-mono text-zinc-500 font-semibold">
                {subjectDetail?.code} • Semester {subjectDetail?.semester}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  Examination Paper Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full rounded-md p-2.5 text-xs border font-medium focus:outline-none ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className={`w-full rounded-md p-2 text-xs border font-mono focus:outline-none ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Class & Semester Designation
                  </label>
                  <input
                    type="text"
                    value={semesterLabel}
                    onChange={(e) => setSemesterLabel(e.target.value)}
                    className={`w-full rounded-md p-2 text-xs border font-medium focus:outline-none ${inputBg}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Architecture Formats */}
          <div className={`${cardBg} border rounded-lg p-5 space-y-4`}>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Section Question Architecture
            </h2>

            {/* Part A Question Format Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400">
                Part A Format (Foundational & Objective Section):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'SHORT', label: 'Short Answer (2M)', desc: 'Descriptive brief questions' },
                  { id: 'MCQ', label: 'Multiple Choice (MCQ)', desc: '4-option objective with key' },
                  { id: 'MIXED', label: 'Mixed (MCQ + Short)', desc: '50% MCQ, 50% Short Answer' },
                ].map((fmt) => {
                  const isChecked = examType === 'QUIZ_MCQ' ? fmt.id === 'MCQ' : partAType === fmt.id;
                  const isDisabled = examType === 'QUIZ_MCQ';

                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setPartAType(fmt.id)}
                      className={`p-2.5 rounded-md border text-left transition-colors ${
                        isChecked
                          ? isDark
                            ? 'bg-zinc-800 border-zinc-300 text-zinc-100 font-semibold'
                            : 'bg-zinc-100 border-zinc-900 text-zinc-900 font-semibold'
                          : isDark
                            ? 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-xs">{fmt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{fmt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Part C Toggle */}
            <div className={`${subBg} p-3 rounded-md border flex items-center justify-between gap-3`}>
              <div>
                <span className="text-xs font-bold block">
                  Part C: Comprehensive Case Study / Application (15M)
                </span>
                <p className="text-[11px] text-zinc-500">
                  Higher-order evaluation (L5/L6) compulsory design scenario or case analysis.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={examType === 'END_SEM_100' ? true : includePartC}
                  disabled={examType === 'END_SEM_100'}
                  onChange={(e) => setIncludePartC(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                  isDark
                    ? 'bg-zinc-800 peer-checked:bg-emerald-600'
                    : 'bg-zinc-300 peer-checked:bg-zinc-900'
                }`} />
              </label>
            </div>
          </div>

          {/* Syllabus Unit Coverage Selector */}
          <div className={`${cardBg} border rounded-lg p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Syllabus Units In Scope
                </h2>
                <p className="text-[11px] text-zinc-500">Select syllabus units included in question selection</p>
              </div>
              <button
                type="button"
                onClick={handleSelectAllUnits}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 underline"
              >
                Select All ({subjectDetail?.units?.length || 5})
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {(subjectDetail?.units || []).map((u) => {
                const isChecked = unitsIncluded.includes(u.unit_number);

                return (
                  <div
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleUnitToggle(u.unit_number)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleUnitToggle(u.unit_number);
                      }
                    }}
                    className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer select-none transition-colors ${
                      isChecked
                        ? isDark
                          ? 'bg-zinc-950 border-zinc-600 text-zinc-100'
                          : 'bg-zinc-100 border-zinc-400 text-zinc-900 font-medium'
                        : isDark
                          ? 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500 opacity-60'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-500 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      tabIndex={-1}
                      className="mt-0.5 rounded border-zinc-600 text-zinc-900 focus:ring-0 pointer-events-none"
                    />
                    <div className="text-xs flex-1 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <strong className="font-mono">UNIT {u.unit_number}: {u.title}</strong>
                      </div>
                      {u.topics && (
                        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                          Topics: {u.topics}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Blueprint Summary Inspector & Solver Trigger */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Exam Blueprint Inspector Card (Linear / Stripe style) */}
          <div className={`${cardBg} border rounded-lg p-5 space-y-4 sticky top-20`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Live Blueprint Inspector
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                isDark ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                OBE Satisfied
              </span>
            </div>

            {/* Total Marks & Scope Pill */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold font-mono tracking-tight">{totalMarks}</span>
                <span className="text-xs text-zinc-500 ml-1 font-mono">Marks Total</span>
              </div>
              <div className="text-right font-mono text-xs text-zinc-400">
                <div>{durationMinutes} Minutes Exam</div>
                <div className="text-[11px] text-zinc-500">{unitsIncluded.length} Units Active</div>
              </div>
            </div>

            {/* Section Breakdown Matrix */}
            <div className="space-y-2 border-t pt-3 border-inherit">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Exam Section Breakdown
              </span>

              <div className="space-y-1.5 text-xs">
                {/* Part A */}
                <div className={`${subBg} p-2.5 rounded-md border flex items-center justify-between`}>
                  <div>
                    <span className="font-bold">PART - A</span>
                    <span className="text-[11px] text-zinc-500 block">
                      {examType === 'QUIZ_MCQ'
                        ? '25 × 1M Objective Questions'
                        : examType === 'MID_SEM'
                          ? `5 × 2M (${partAType})`
                          : `10 × 2M (${partAType})`}
                    </span>
                  </div>
                  <span className="font-mono font-bold">
                    {examType === 'QUIZ_MCQ' ? 25 : examType === 'MID_SEM' ? 10 : 20}M
                  </span>
                </div>

                {/* Part B (if applicable) */}
                {examType !== 'QUIZ_MCQ' && (
                  <div className={`${subBg} p-2.5 rounded-md border flex items-center justify-between`}>
                    <div>
                      <span className="font-bold">PART - B</span>
                      <span className="text-[11px] text-zinc-500 block">
                        {examType === 'MID_SEM'
                          ? '2 × 10M Internal Choice (Either/Or)'
                          : examType === 'END_SEM_100'
                            ? '5 × 13M Internal Choice (Either/Or)'
                            : '5 × 10M Internal Choice (Either/Or)'}
                      </span>
                    </div>
                    <span className="font-mono font-bold">
                      {examType === 'MID_SEM' ? 20 : examType === 'END_SEM_100' ? 65 : 50}M
                    </span>
                  </div>
                )}

                {/* Part C (if enabled) */}
                {(examType === 'END_SEM_100' || includePartC) && examType !== 'QUIZ_MCQ' && (
                  <div className={`${subBg} p-2.5 rounded-md border flex items-center justify-between`}>
                    <div>
                      <span className="font-bold">PART - C</span>
                      <span className="text-[11px] text-zinc-500 block">
                        1 × 15M Comprehensive Case Study (L5/L6)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-500">15M</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cognitive Balance Visual Indicator */}
            <div className="space-y-1.5 border-t pt-3 border-inherit">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-400">Cognitive Balance (Bloom's)</span>
                <span className="font-mono text-[11px] text-zinc-500">Target: 100%</span>
              </div>

              {/* Segmented Bar */}
              <div className={`h-2 rounded-full overflow-hidden flex ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div style={{ width: `${bloomDist.L1 + bloomDist.L2}%` }} className="bg-emerald-500" title="Foundational L1/L2" />
                <div style={{ width: `${bloomDist.L3 + bloomDist.L4}%` }} className="bg-sky-500" title="Application L3/L4" />
                <div style={{ width: `${bloomDist.L5 + bloomDist.L6}%` }} className="bg-purple-500" title="Higher-Order L5/L6" />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Recall ({bloomDist.L1 + bloomDist.L2}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Apply ({bloomDist.L3 + bloomDist.L4}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Create ({bloomDist.L5 + bloomDist.L6}%)
                </span>
              </div>
            </div>

            {/* Advanced OBE Cognitive Tuning Accordion (Power users only) */}
            <div className="border-t pt-3 border-inherit">
              <button
                type="button"
                onClick={() => setShowAdvancedTuning(!showAdvancedTuning)}
                className={`w-full flex items-center justify-between p-2 rounded-md text-xs font-semibold transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Advanced Cognitive & Difficulty Sliders</span>
                </span>
                {showAdvancedTuning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedTuning && (
                <div className="mt-3 space-y-4 p-3 rounded-lg border text-xs bg-inherit">
                  {/* Bloom's Target Sliders */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400">
                      <span>BLOOM TAXONOMY ALLOCATION</span>
                      <span className="font-mono">{bloomTotal}%</span>
                    </div>

                    {[
                      { key: 'L1', label: 'L1: Remember', color: 'text-emerald-500' },
                      { key: 'L2', label: 'L2: Understand', color: 'text-sky-500' },
                      { key: 'L3', label: 'L3: Apply', color: 'text-indigo-500' },
                      { key: 'L4', label: 'L4: Analyze', color: 'text-amber-500' },
                      { key: 'L5', label: 'L5: Evaluate', color: 'text-rose-500' },
                      { key: 'L6', label: 'L6: Create', color: 'text-purple-500' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-semibold ${color}`}>{label}</span>
                          <span className="font-mono font-bold">{bloomDist[key]}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          step="5"
                          value={bloomDist[key]}
                          onChange={(e) =>
                            setBloomDist((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                          }
                          className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${
                            isDark ? 'bg-zinc-800 accent-zinc-200' : 'bg-zinc-200 accent-zinc-800'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Difficulty Distribution */}
                  <div className="space-y-2 border-t pt-3 border-inherit">
                    <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400">
                      <span>DIFFICULTY BALANCE</span>
                      <span className="font-mono">{diffTotal}%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['EASY', 'MEDIUM', 'HARD'].map((d) => (
                        <div key={d} className={`${subBg} p-2 rounded text-center border`}>
                          <span className="text-[10px] font-bold uppercase">{d}</span>
                          <div className="font-mono font-bold text-xs mt-0.5">{diffDist[d]}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button (Vercel / Linear High-Contrast Trigger) */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-lg shadow-sm transition-all ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
              }`}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-current" />
                  <span>Solving Combinatorial Constraints...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Generate Balanced Question Paper</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
