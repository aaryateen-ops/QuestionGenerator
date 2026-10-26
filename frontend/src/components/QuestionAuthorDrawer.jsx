import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Zap,
  Upload,
  Tag,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import CameraCaptureModal from './CameraCaptureModal';
import MathHighlightedText from './MathHighlightedText';
import SourceImagePreview from './SourceImagePreview';
import DuplicateQuestionNotice from './DuplicateQuestionNotice';

const BLOOM_BADGES = {
  L1: 'bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  L2: 'bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-500/30',
  L3: 'bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  L4: 'bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-500/30',
  L5: 'bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-500/30',
  L6: 'bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-500/30',
};

export default function QuestionAuthorDrawer({
  isOpen,
  onClose,
  initialTab = 'ai', // 'ai' | 'manual' | 'import'
  subjectId,
  subjectDetail,
  editingQuestion = null,
  onQuestionSaved,
  theme,
}) {
  const isDark = theme === 'dark';
  const drawerBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [scanOpen, setScanOpen] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const [aiEngine, setAiEngine] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scanRequest = useRef(null);
  const classificationVersion = useRef(0);

  useEffect(() => {
    if (!isOpen) { scanRequest.current?.abort(); setScanOpen(false); }
    return () => scanRequest.current?.abort();
  }, [isOpen, subjectId]);

  // -------------------------------------------------------------
  // AI Synthesizer State
  // -------------------------------------------------------------
  const [aiTopic, setAiTopic] = useState('');
  const [aiUnitNumber, setAiUnitNumber] = useState(1);
  const [aiQuestionType, setAiQuestionType] = useState('SHORT');
  const [aiBloomLevel, setAiBloomLevel] = useState('L3');
  const [aiMarks, setAiMarks] = useState(2);
  const [aiDifficulty, setAiDifficulty] = useState('MEDIUM');
  const [aiCount] = useState(2);
  const [aiDocFile] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [aiSavedSet, setAiSavedSet] = useState(new Set());
  const [aiError, setAiError] = useState(null);

  // -------------------------------------------------------------
  // Manual Question Form State
  // -------------------------------------------------------------
  const [manualText, setManualText] = useState('');
  const [manualMarks, setManualMarks] = useState(2);
  const [manualUnitId, setManualUnitId] = useState('');
  const [manualCoId, setManualCoId] = useState('');
  const [manualBloom, setManualBloom] = useState('L2');
  const [manualDiff, setManualDiff] = useState('MEDIUM');
  const [manualType, setManualType] = useState('SHORT');
  const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [manualCorrectAnswer, setManualCorrectAnswer] = useState('A');
  const [nlpAnalysis, setNlpAnalysis] = useState(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState(null);

  // -------------------------------------------------------------
  // Bulk / Document Import State
  // -------------------------------------------------------------
  const [bulkText, setBulkText] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);

  // Success toast banner inside drawer
  const [successToast, setSuccessToast] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSourceFile(null);
    if (editingQuestion) {
      setActiveTab('manual');
      setManualText(editingQuestion.question_text);
      setManualMarks(editingQuestion.marks);
      setManualUnitId(editingQuestion.unit_id);
      setManualCoId(editingQuestion.co_id);
      setManualBloom(editingQuestion.bloom_level);
      setManualDiff(editingQuestion.difficulty);
      setManualType(editingQuestion.question_type || 'SHORT');

      let parsed = { A: '', B: '', C: '', D: '' };
      if (editingQuestion.options) {
        try {
          parsed = typeof editingQuestion.options === 'string' ? JSON.parse(editingQuestion.options) : editingQuestion.options;
        } catch {}
      }
      setManualOptions(parsed);
      setManualCorrectAnswer(editingQuestion.correct_answer || 'A');
    } else {
      if (subjectDetail?.units?.length > 0) {
        const u1 = subjectDetail.units[0];
        setManualUnitId(u1.id);
        setAiUnitNumber(u1.unit_number);
        setManualCoId(subjectDetail.course_outcomes?.[0]?.id || '');
        if (u1.topics) {
          const firstTopic = u1.topics.split(',')[0].trim();
          setAiTopic(firstTopic);
        }
      }
    }
  }, [editingQuestion, subjectDetail]);

  // Sync marks when question type changes
  const handleTypeSelect = (type, isAi = false) => {
    if (isAi) {
      setAiQuestionType(type);
      if (type === 'MCQ') setAiMarks(1);
      else if (type === 'SHORT') setAiMarks(2);
      else if (type === 'LONG') setAiMarks(10);
    } else {
      setManualType(type);
      if (type === 'MCQ') setManualMarks(1);
      else if (type === 'SHORT') setManualMarks(2);
      else if (type === 'LONG') setManualMarks(10);
    }
  };

  // Real-time NLP typing trigger for manual entry
  const handleManualTextChange = async (text) => {
    const version = ++classificationVersion.current;
    setManualText(text);
    if (text.trim().length > 6) {
      try {
        const nlp = await api.classifyQuestion(text, subjectId);
        if (version !== classificationVersion.current) return;
        setNlpAnalysis(nlp);
        if (!editingQuestion) {
          setManualBloom(nlp.predicted_bloom_level);
        }
      } catch {}
    }
  };

  // -------------------------------------------------------------
  // Handlers: AI Synthesize & Ingestion
  // -------------------------------------------------------------
  const handleAiSynthesize = async () => {
    if (!aiTopic.trim() && !aiDocFile) {
      setAiError('Please provide a syllabus topic or upload a reference file.');
      return;
    }
    setAiGenerating(true);
    setAiError(null);
    setAiGeneratedQuestions([]);
    setAiSavedSet(new Set());

    try {
      let res;
      if (aiDocFile) {
        const formData = new FormData();
        formData.append('subject_id', subjectId);
        formData.append('file', aiDocFile);
        const sessionKey = sessionStorage.getItem('gemini_api_key');
        if (sessionKey) formData.append('api_key', sessionKey);
        formData.append('bloom_level', aiBloomLevel);
        formData.append('marks', aiMarks);
        formData.append('difficulty', aiDifficulty);
        formData.append('question_type', aiQuestionType);
        formData.append('count', aiCount);
        formData.append('unit_number', aiUnitNumber);
        res = await api.synthesizeFromDocument(formData);
      } else {
        const apiKey = sessionStorage.getItem('gemini_api_key');
        res = await api.synthesizeQuestions({
          topic: aiTopic.trim(),
          bloom_level: aiBloomLevel,
          marks: aiMarks,
          difficulty: aiDifficulty,
          question_type: aiQuestionType,
          count: aiCount,
          subject_id: subjectId,
          unit_number: aiUnitNumber,
          api_key: apiKey || undefined,
        });
      }

      setAiGeneratedQuestions(res.questions || []);
      setAiEngine(res.engine_used);
    } catch (err) {
      setAiError(err.message || 'AI Question synthesis failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAiQuestionToBank = async (q, index) => {
    try {
      const activeUnit = subjectDetail?.units?.find((u) => u.unit_number === (q.suggested_unit_number || aiUnitNumber));
      const activeCO = subjectDetail?.course_outcomes?.find((c) => c.code === q.suggested_co_code) || subjectDetail?.course_outcomes?.[0];

      await api.createQuestion({
        subject_id: subjectId,
        unit_id: activeUnit?.id || subjectDetail?.units?.[0]?.id,
        co_id: activeCO?.id || subjectDetail?.course_outcomes?.[0]?.id,
        question_text: q.question_text,
        marks: q.marks,
        bloom_level: q.bloom_level,
        difficulty: q.difficulty,
        question_type: q.question_type || aiQuestionType,
        options: q.options,
        correct_answer: q.correct_answer,
        action_verb: q.action_verb,
        confidence_score: q.confidence_score ?? undefined,
      });

      setAiSavedSet((prev) => new Set([...prev, index]));
      setSuccessToast('Question saved as draft. Faculty review is required before approval.');
      setTimeout(() => setSuccessToast(null), 2500);
      if (onQuestionSaved) onQuestionSaved();
    } catch (err) {
      setAiError(err.message || 'Failed to save question to repository.');
    }
  };

  // -------------------------------------------------------------
  // Handlers: Manual Form Submission
  // -------------------------------------------------------------
  const handleSaveManualQuestion = async (e) => {
    e.preventDefault();
    setManualSubmitting(true);
    setManualError(null);

    try {
      const isMCQ = manualType === 'MCQ';
      if (isMCQ && !manualCorrectAnswer) throw new Error('Select the correct answer before saving this MCQ.');
      if (isMCQ) {
        if (!manualOptions.A?.trim() || !manualOptions.B?.trim() || !manualOptions.C?.trim() || !manualOptions.D?.trim()) {
          throw new Error('Please fill in all 4 choices (A, B, C, D) for the MCQ question.');
        }
      }

      const payload = {
        question_text: manualText.trim(),
        marks: Number(manualMarks),
        unit_id: Number(manualUnitId),
        co_id: Number(manualCoId),
        bloom_level: manualBloom,
        difficulty: manualDiff,
        question_type: manualType,
        options: isMCQ ? JSON.stringify(manualOptions) : null,
        correct_answer: isMCQ ? manualCorrectAnswer : null,
      };

      if (editingQuestion) {
        await api.updateQuestion(editingQuestion.id, payload);
        setSuccessToast('Question updated and returned to draft.');
      } else {
        await api.createQuestion({
          ...payload,
          subject_id: subjectId,
          action_verb: nlpAnalysis?.primary_verb,
          confidence_score: nlpAnalysis?.confidence_score ?? undefined,
        });
        setSuccessToast('Question saved as draft.');
        setManualText('');
        setNlpAnalysis(null);
      }

      setTimeout(() => setSuccessToast(null), 2500);
      if (onQuestionSaved) onQuestionSaved();
      if (editingQuestion) onClose();
    } catch (err) {
      setManualError(err.message || 'Failed to save question.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers: Bulk / File Ingestion
  // -------------------------------------------------------------
  const handleBulkSubmit = async () => {
    if (!bulkText.trim() && !importFile) return;
    setImportSubmitting(true);
    setImportFeedback(null);

    try {
      if (importFile) {
        const res = await api.uploadDocumentFile(subjectId, importFile);
        setImportFeedback(res);
        setImportFile(null);
      } else {
        const lines = bulkText.split('\n').filter((l) => l.trim().length > 0);
        const items = [];
        for (const line of lines) {
          const parts = line.split('|').map((s) => s.trim());
          if (parts.length >= 3) {
            items.push({
              unit_number: Number(parts[0]) || 1,
              marks: Number(parts[1]) || 2,
              question_text: parts[2],
              difficulty: parts[3] || 'MEDIUM',
              bloom_level: parts[4] || undefined,
            });
          }
        }
        if (items.length === 0) {
          throw new Error('No valid pipe-delimited questions found. Format: Unit | Marks | Question Text | Difficulty');
        }
        const res = await api.bulkImport({
          subject_id: subjectId,
          questions: items,
        });
        setImportFeedback(res);
        setBulkText('');
      }

      setSuccessToast('Bulk questions ingested into repository!');
      setTimeout(() => setSuccessToast(null), 2500);
      if (onQuestionSaved) onQuestionSaved();
    } catch (err) {
      setImportFeedback({ errors: [err.message] });
    } finally {
      setImportSubmitting(false);
    }
  };

  const handleScanCopy = async file => {
    classificationVersion.current += 1;
    const controller = new AbortController();
    scanRequest.current?.abort();
    scanRequest.current = controller;
    setScanning(true);
    setManualError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', 'EXTRACT');
      if (subjectId) form.append('subject_id', subjectId);
      form.append('marks', manualMarks);
      const key = sessionStorage.getItem('gemini_api_key');
      if (key) form.append('api_key', key);
      const result = await api.scanQuestionImage(form, controller.signal);
      if (controller.signal.aborted) return;
      const question = result.questions?.[0];
      if (!question) throw new Error('No readable question found. Retake the photo with better lighting.');
      setManualText(question.question_text);
      setSourceFile(file);
      setManualMarks(question.marks);
      setManualBloom(question.bloom_level);
      setManualType(question.question_type);
      setManualDiff(question.difficulty);
      setNlpAnalysis(null);
      setManualOptions(question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : { A: '', B: '', C: '', D: '' });
      setManualCorrectAnswer(question.correct_answer || '');
      const unit = subjectDetail?.units?.find(item => item.unit_number === question.suggested_unit_number);
      const co = subjectDetail?.course_outcomes?.find(item => item.code === question.suggested_co_code);
      if (unit) setManualUnitId(unit.id);
      if (co) setManualCoId(co.id);
      setScanOpen(false);
      setSuccessToast(result.questions.length > 1
        ? `Filled the first of ${result.questions.length} questions. Use Scan Physical Copy in the AI Synthesizer to review and save the full set.`
        : 'Question transcribed. Review formulas, marks, and the answer key before saving.');
    } catch (err) {
      if (err.name !== 'AbortError') { setManualError(err.message); throw err; }
    } finally { if (scanRequest.current === controller) setScanning(false); }
  };

  if (!isOpen) return null;

  // Active unit topics for quick chips
  const activeAiUnit = subjectDetail?.units?.find((u) => u.unit_number === aiUnitNumber);
  const topicChips = activeAiUnit?.topics
    ? activeAiUnit.topics.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {scanOpen && <CameraCaptureModal theme={theme} initialFile={sourceFile}
        onClose={() => { scanRequest.current?.abort(); setScanOpen(false); }} onConfirm={handleScanCopy} />}
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={`w-screen max-w-2xl ${drawerBg} border-l flex flex-col shadow-2xl transition-transform animate-in slide-in-from-right duration-300`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border ${
                  isDark ? 'bg-zinc-900 text-zinc-300 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
                }`}>
                  Question Studio
                </span>
                <h2 className="text-sm font-bold tracking-tight">
                  {editingQuestion ? 'Edit Question' : 'Author & Generate Questions'}
                </h2>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {subjectDetail?.code} • {subjectDetail?.name}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs (Linear-Style Pill Segment) */}
          {!editingQuestion && (
            <div className={`px-6 py-2.5 border-b flex gap-1.5 ${
              isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-100/70 border-zinc-200'
            }`}>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'ai'
                    ? isDark ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Draft with AI
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'manual'
                    ? isDark ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-sky-500" />
                Manual Entry
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'import'
                    ? isDark ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-purple-500" />
                Document / Bulk Import
              </button>
            </div>
          )}

          {/* Toast Banner */}
          {successToast && (
            <div className="m-4 p-3 rounded-lg border bg-emerald-950/60 border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Drawer Body Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ============================================================ */}
            {/* TAB 1: DRAFT WITH AI                                         */}
            {/* ============================================================ */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                {aiError && (
                  <div className="p-3 rounded-md border text-xs bg-rose-950/60 border-rose-800 text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* Target Syllabus Unit & Format */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Syllabus Unit
                    </label>
                    <select
                      value={aiUnitNumber}
                      onChange={(e) => setAiUnitNumber(Number(e.target.value))}
                      className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                    >
                      {(subjectDetail?.units || []).map((u) => (
                        <option key={u.id} value={u.unit_number}>
                          Unit {u.unit_number}: {u.title.substring(0, 30)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Question Type
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {['MCQ', 'SHORT', 'LONG'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleTypeSelect(t, true)}
                          className={`py-1.5 text-xs font-mono font-bold rounded border transition-colors ${
                            aiQuestionType === t
                              ? isDark ? 'bg-zinc-800 border-zinc-400 text-zinc-100' : 'bg-zinc-100 border-zinc-900 text-zinc-950'
                              : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Topic Input & Quick Chips */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Topic / Concept Prompt:
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Alpha-Beta Pruning or Backpropagation derivation"
                    className={`w-full rounded-md p-2.5 text-xs border font-medium focus:outline-none ${inputBg}`}
                  />

                  {topicChips.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-zinc-500 font-mono">Suggested Syllabus Topics:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {topicChips.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAiTopic(chip)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              aiTopic === chip
                                ? isDark ? 'bg-zinc-800 text-zinc-200 border-zinc-500' : 'bg-zinc-200 text-zinc-900 border-zinc-400'
                                : isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cognitive Parameters */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      Bloom Level
                    </label>
                    <select
                      value={aiBloomLevel}
                      onChange={(e) => setAiBloomLevel(e.target.value)}
                      className={`w-full rounded-md p-1.5 text-xs font-mono font-bold border focus:outline-none ${inputBg}`}
                    >
                      {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className={`w-full rounded-md p-1.5 text-xs border focus:outline-none ${inputBg}`}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      Marks
                    </label>
                    <input
                      type="number"
                      value={aiMarks}
                      onChange={(e) => setAiMarks(Number(e.target.value))}
                      className={`w-full rounded-md p-1.5 text-xs font-mono border focus:outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Synthesize Action Trigger */}
                <button
                  type="button"
                  onClick={handleAiSynthesize}
                  disabled={aiGenerating}
                  className={`w-full py-2.5 text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                  }`}
                >
                  {aiGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin border-current" />
                      <span>Synthesizing Academic Questions...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                      <span>Synthesize {aiCount} Questions</span>
                    </>
                  )}
                </button>

                {/* Generated Candidates Preview List */}
                {aiEngine && <p role="status" className="text-xs border border-zinc-400 rounded p-3">Generation source: {aiEngine}. {!String(aiEngine).toLowerCase().includes('gemini') ? 'Template based output, not AI verified. Check technical accuracy and answers before saving drafts.' : 'Review technical accuracy and answer keys before saving drafts.'}</p>}
              {aiGeneratedQuestions.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-inherit">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-400 uppercase tracking-wider font-mono">
                        Generated Questions ({aiGeneratedQuestions.length})
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {aiSavedSet.size} of {aiGeneratedQuestions.length} added
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {aiGeneratedQuestions.map((q, idx) => {
                        const isSaved = aiSavedSet.has(idx);
                        let parsedOpts = null;
                        if (q.options) {
                          try { parsedOpts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch {}
                        }

                        return (
                          <div
                            key={idx}
                            className={`${subBg} p-3 rounded-lg border space-y-2 transition-all ${
                              isSaved ? 'opacity-60 border-emerald-800/80' : 'hover:border-zinc-500'
                            }`}
                          >
                            <p className="text-xs leading-relaxed font-normal">
                              {q.question_text}
                            </p>

                            {/* MCQ Options */}
                            {parsedOpts && (
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono pt-1">
                                {Array.isArray(parsedOpts)
                                  ? parsedOpts.map((opt, i) => (
                                      <div key={i} className={`p-1 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                                        {opt}
                                      </div>
                                    ))
                                  : Object.entries(parsedOpts).map(([k, v]) => (
                                      <div key={k} className={`p-1 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                                        <strong>({k})</strong> {String(v)}
                                      </div>
                                    ))}
                              </div>
                            )}

                            {q.correct_answer && (
                              <div className="text-[10px] font-mono text-emerald-500">
                                Answer Key: Option ({q.correct_answer})
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-inherit">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${BLOOM_BADGES[q.bloom_level] || ''}`}>
                                  {q.bloom_level}
                                </span>
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-inherit text-zinc-400">
                                  {q.marks}M
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={isSaved}
                                onClick={() => handleSaveAiQuestionToBank(q, idx)}
                                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  isSaved
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default'
                                    : isDark
                                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                                }`}
                              >
                                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                {isSaved ? 'Saved as draft' : 'Save as draft'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 2: MANUAL ENTRY FORM                                     */}
            {/* ============================================================ */}
            {activeTab === 'manual' && (
              <form onSubmit={handleSaveManualQuestion} className="space-y-4">
                <p className="text-xs">Questions are saved as drafts and require faculty review. Editing a reviewed or approved question returns it to draft.</p>
                <button type="button" disabled={scanning} onClick={() => setScanOpen(true)}
                  className="px-3 py-2 rounded border border-zinc-400 text-sm font-semibold disabled:opacity-50 hover:bg-zinc-500/10">
                  {scanning ? 'Scanning copy…' : 'Scan Copy'}
                </button>
                {manualError && (
                  <div className="p-3 rounded-md border text-xs bg-rose-950/60 border-rose-800 text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}

                {/* Scope: Unit & CO */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Syllabus Unit
                    </label>
                    <select
                      value={manualUnitId}
                      onChange={(e) => setManualUnitId(e.target.value)}
                      className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                    >
                      {(subjectDetail?.units || []).map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unit_number}: {u.title.substring(0, 30)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Target Course Outcome
                    </label>
                    <select
                      value={manualCoId}
                      onChange={(e) => setManualCoId(e.target.value)}
                      className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                    >
                      {(subjectDetail?.course_outcomes || []).map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.code} ({co.target_bloom_level})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Question Type Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Question Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['SHORT', 'MCQ', 'LONG'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeSelect(t, false)}
                        className={`p-2 rounded-md border text-center text-xs font-mono font-bold transition-colors ${
                          manualType === t
                            ? isDark ? 'bg-zinc-800 border-zinc-300 text-zinc-100' : 'bg-zinc-100 border-zinc-900 text-zinc-950'
                            : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                        }`}
                      >
                        {t === 'SHORT' ? 'Short (2M)' : t === 'MCQ' ? 'Objective MCQ' : 'Long (10M/16M)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Textarea */}
                <div className={sourceFile ? 'grid md:grid-cols-2 gap-4 items-start' : ''}>
                {sourceFile && <SourceImagePreview file={sourceFile} theme={theme} />}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Question Description / Stem
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={manualText}
                    onChange={(e) => handleManualTextChange(e.target.value)}
                    placeholder="Type question stem with clear cognitive action verbs (e.g. Compare, Derive, Formulate)..."
                    className={`w-full rounded-md p-3 text-xs border font-medium focus:outline-none leading-relaxed ${inputBg}`}
                  />
                  {manualText && <div className="mt-2 text-sm leading-relaxed" aria-label="Question math preview"><MathHighlightedText text={manualText} isDark={isDark} /></div>}
                </div>

                </div>
                <DuplicateQuestionNotice subjectId={subjectId} text={manualText} excludeId={editingQuestion?.id} active={isOpen && activeTab === 'manual'} />

                {/* Real-time NLP Verb Banner */}
                {nlpAnalysis && (
                  <div className={`p-2.5 rounded-md border flex items-center justify-between text-xs ${subBg}`}>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-zinc-500">Detected Verb: </span>
                      <strong className="font-mono text-zinc-200">{nlpAnalysis.primary_verb || 'N/A'}</strong>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${BLOOM_BADGES[nlpAnalysis.predicted_bloom_level] || ''}`}>
                      Predicted {nlpAnalysis.predicted_bloom_level}
                    </span>
                  </div>
                )}

                {/* MCQ Choices (if MCQ) */}
                {manualType === 'MCQ' && (
                  <div className={`${subBg} p-3 rounded-lg border space-y-2.5`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                        4 Multiple Choice Options:
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">Select correct answer radio</span>
                    </div>

                    <div className="space-y-2">
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono font-bold w-10 shrink-0">
                            <input
                              type="radio"
                              name="manual_correct_opt"
                              checked={manualCorrectAnswer === opt}
                              onChange={() => setManualCorrectAnswer(opt)}
                              className="rounded text-zinc-900 focus:ring-0"
                            />
                            <span>({opt})</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={`Choice ${opt} text`}
                            value={manualOptions[opt]}
                            onChange={(e) => setManualOptions({ ...manualOptions, [opt]: e.target.value })}
                            className={`flex-1 rounded p-1.5 text-xs border focus:outline-none ${inputBg}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cognitive Level, Marks & Difficulty */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Bloom Level
                    </label>
                    <select
                      value={manualBloom}
                      onChange={(e) => setManualBloom(e.target.value)}
                      className={`w-full rounded-md p-2 text-xs font-mono font-bold border focus:outline-none ${inputBg}`}
                    >
                      {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={manualDiff}
                      onChange={(e) => setManualDiff(e.target.value)}
                      className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Marks Weight
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={manualMarks}
                      onChange={(e) => setManualMarks(Number(e.target.value))}
                      className={`w-full rounded-md p-2 text-xs font-mono border focus:outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className={`w-full py-2.5 text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                  }`}
                >
                  {manualSubmitting ? 'Saving...' : editingQuestion ? 'Update and return to draft' : 'Save as draft'}
                </button>
              </form>
            )}

            {/* ============================================================ */}
            {/* TAB 3: DOCUMENT / BULK IMPORT                                */}
            {/* ============================================================ */}
            {activeTab === 'import' && (
              <div className="space-y-4">
                {importFeedback && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    importFeedback.errors?.length > 0
                      ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                      : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  }`}>
                    {importFeedback.errors?.length > 0 ? (
                      <div>Errors: {importFeedback.errors.join(', ')}</div>
                    ) : (
                      <div>
                        Imported {importFeedback.imported_count || importFeedback.questions_created || 0} questions successfully!
                      </div>
                    )}
                  </div>
                )}

                {/* Option 1: File Upload */}
                <div className={`${subBg} p-4 rounded-lg border space-y-2`}>
                  <span className="text-xs font-bold block">Method 1: Upload Lecture Notes or Syllabus (.pdf, .docx, .txt)</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                  />
                </div>

                {/* Option 2: Pipe Delimited Batch Text */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold block">Method 2: Paste Pipe-Delimited Questions</span>
                  <p className="text-[11px] text-zinc-500 font-mono">Format: Unit | Marks | Question Text | Difficulty</p>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"1 | 2 | Explain the purpose of activation functions in neural networks. | EASY\n2 | 10 | Derive the backpropagation algorithm for a multi-layer perceptron. | HARD"}
                    className={`w-full rounded-md p-3 text-xs font-mono border focus:outline-none leading-relaxed ${inputBg}`}
                  />
                </div>

                <button
                  type="button"
                  disabled={importSubmitting || (!importFile && !bulkText.trim())}
                  onClick={handleBulkSubmit}
                  className={`w-full py-2.5 text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                  }`}
                >
                  {importSubmitting ? 'Importing Questions...' : 'Ingest Questions to Repository'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
