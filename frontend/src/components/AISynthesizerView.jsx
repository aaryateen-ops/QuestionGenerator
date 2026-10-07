import React, { useState, useEffect } from 'react';
import {
  Cpu, Plus, Check, Key, BookOpen, Tag, CheckCircle2,
  AlertCircle, Trash2, Eye, EyeOff, FileText, Upload
} from 'lucide-react';
import { api } from '../api/client';

const BLOOM_BADGES = {
  L1: 'bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  L2: 'bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-500/30',
  L3: 'bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  L4: 'bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-500/30',
  L5: 'bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-500/30',
  L6: 'bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-500/30',
};

const TYPE_BADGES = {
  MCQ: 'bg-amber-900/30 text-amber-500 border-amber-500/30',
  SHORT: 'bg-blue-900/30 text-blue-500 border-blue-500/30',
  LONG: 'bg-purple-900/30 text-purple-500 border-purple-500/30',
};

export default function AISynthesizerView({ subjectId, subjectDetail, onQuestionsAdded, theme }) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  // Synthesis Mode: 'concept' | 'document'
  const [synthesisMode, setSynthesisMode] = useState('concept');

  const [topic, setTopic] = useState('Alpha-Beta Pruning and Minimax Search Trees');
  const [unitNumber, setUnitNumber] = useState(1);
  const [questionType, setQuestionType] = useState('SHORT'); // 'MCQ' | 'SHORT' | 'LONG'
  const [bloomLevel, setBloomLevel] = useState('L3');
  const [marks, setMarks] = useState(2);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [count, setCount] = useState(3);

  // Document upload state
  const [docFile, setDocFile] = useState(null);

  // Gemini API Key State & Instant Persistence
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(() => !localStorage.getItem('gemini_api_key'));
  const [showPassword, setShowPassword] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved && saved.length > 10) {
      return { status: 'saved', message: 'API Key stored securely in browser.' };
    }
    return null;
  });

  // Background auto-validation on mount if key exists
  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored && stored.trim().length > 10) {
      api.validateApiKey(stored.trim())
        .then((res) => {
          if (res.valid) {
            setKeyStatus({ status: 'valid', message: res.message, model: res.model });
          } else {
            setKeyStatus({ status: 'invalid', message: res.error || 'Key validation failed.' });
          }
        })
        .catch(() => {
          // Keep saved status if network transient error
        });
    }
  }, []);

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    if (val.trim()) {
      localStorage.setItem('gemini_api_key', val.trim());
      setKeyStatus({ status: 'saved', message: 'API Key stored locally in browser.' });
    } else {
      localStorage.removeItem('gemini_api_key');
      setKeyStatus(null);
    }
  };

  const [generating, setGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState([]);
  const [engineNotification, setEngineNotification] = useState(null);
  const [savedMap, setSavedMap] = useState({});
  const [error, setError] = useState(null);

  // Get active unit topics for quick topic chips
  const activeUnit = subjectDetail?.units?.find((u) => u.unit_number === unitNumber);
  const unitTopicsList = activeUnit?.topics
    ? activeUnit.topics.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const handleValidateAndSaveKey = async () => {
    const keyToValidate = apiKey.trim() || localStorage.getItem('gemini_api_key') || '';
    if (!keyToValidate) {
      localStorage.removeItem('gemini_api_key');
      setKeyStatus(null);
      return;
    }
    setValidatingKey(true);
    setKeyStatus(null);
    try {
      const res = await api.validateApiKey(keyToValidate);
      if (res.valid) {
        localStorage.setItem('gemini_api_key', keyToValidate);
        setKeyStatus({ status: 'valid', message: res.message, model: res.model });
      } else {
        setKeyStatus({ status: 'invalid', message: res.error || 'API Key validation failed.' });
      }
    } catch (err) {
      setKeyStatus({ status: 'invalid', message: err.message || 'Failed to reach validation service.' });
    } finally {
      setValidatingKey(false);
    }
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem('gemini_api_key');
    setKeyStatus(null);
  };

  const handleSynthesize = async () => {
    setGenerating(true);
    setError(null);
    setEngineNotification(null);
    setSavedMap({});

    try {
      let res;
      if (synthesisMode === 'document') {
        if (!docFile) {
          throw new Error('Please select a lecture note, PDF, or Word document to synthesize questions from.');
        }
        const formData = new FormData();
        formData.append('file', docFile);
        if (subjectId) formData.append('subject_id', subjectId);
        formData.append('unit_number', unitNumber);
        formData.append('question_type', questionType);
        formData.append('bloom_level', bloomLevel);
        formData.append('marks', marks);
        formData.append('difficulty', difficulty);
        formData.append('count', count);
        if (apiKey.trim()) formData.append('api_key', apiKey.trim());

        res = await api.synthesizeFromDocument(formData);
      } else {
        if (!topic.trim()) {
          throw new Error('Please specify a target concept or select a syllabus topic.');
        }
        res = await api.synthesizeQuestions({
          topic,
          bloom_level: bloomLevel,
          marks: Number(marks),
          difficulty,
          question_type: questionType,
          count: Number(count),
          api_key: apiKey.trim() || undefined,
          subject_id: subjectId,
          unit_number: Number(unitNumber),
        });
      }

      setGeneratedList(res.questions || []);
      setEngineNotification({
        engine: res.engine_used,
        geminiError: res.gemini_error,
      });
    } catch (err) {
      setError(err.message || 'Failed to synthesize questions.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveQuestion = async (qItem, index) => {
    if (!subjectDetail) return;
    try {
      const unitObj =
        subjectDetail.units?.find((u) => u.unit_number === (qItem.suggested_unit_number || unitNumber)) ||
        subjectDetail.units?.[0];
      const coObj =
        subjectDetail.course_outcomes?.find((c) => c.code === qItem.suggested_co_code) ||
        subjectDetail.course_outcomes?.[0];

      await api.createQuestion({
        subject_id: subjectId,
        unit_id: unitObj.id,
        co_id: coObj.id,
        question_text: qItem.question_text,
        marks: qItem.marks,
        bloom_level: qItem.bloom_level,
        difficulty: qItem.difficulty,
        question_type: qItem.question_type || questionType,
        options: qItem.options || null,
        correct_answer: qItem.correct_answer || null,
        action_verb: qItem.action_verb,
        confidence_score: qItem.confidence_score,
      });

      setSavedMap((prev) => ({ ...prev, [index]: true }));
      if (onQuestionsAdded) onQuestionsAdded();
    } catch (err) {
      alert('Failed to save question: ' + err.message);
    }
  };

  const handleSaveAll = async () => {
    for (let i = 0; i < generatedList.length; i++) {
      if (!savedMap[i]) {
        await handleSaveQuestion(generatedList[i], i);
      }
    }
  };

  const isGeminiConnected = (Boolean(apiKey && apiKey.trim().length > 10) && keyStatus?.status !== 'invalid') || keyStatus?.status === 'valid';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`${cardBg} border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-zinc-400" />
            <h2 className="text-base font-bold tracking-tight">
              AI Question Synthesizer & Generator Engine
            </h2>
          </div>
          <p className="text-xs text-zinc-500 max-w-2xl">
            Generates unseen examination questions dynamically from curriculum concepts, syllabus topics, or uploaded lecture notes/PDFs.
            Enforces strict Anderson & Krathwohl Bloom's action-verb stems with full MCQ choices and course outcome alignment.
          </p>
        </div>

        {/* Engine Status & Config Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {isGeminiConnected ? (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-medium ${
              isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{keyStatus?.model ? `${keyStatus.model} Connected` : 'Google Gemini Connected'}</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-medium ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span>Procedural Academic Engine</span>
            </div>
          )}

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border font-medium transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {showKeyInput ? 'Hide Settings' : 'Configure API Key'}
          </button>
        </div>
      </div>

      {/* API Key Configuration Drawer with Live Verification */}
      {showKeyInput && (
        <div className={`${cardBg} border rounded-lg p-5 space-y-3 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Google Gemini API Key Configuration
              </h3>
              <p className="text-[11px] text-zinc-500">
                Provide your Gemini API key (free tier supported) to unlock real-time LLM question generation.
              </p>
            </div>
            {apiKey && (
              <button
                onClick={handleClearKey}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Remove Key
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Paste Gemini API key (e.g. AIzaSy...)"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className={`w-full rounded-md p-2.5 pr-10 text-xs font-mono border focus:outline-none ${inputBg}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
                title={showPassword ? 'Hide Key' : 'Show Key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleValidateAndSaveKey}
              disabled={validatingKey || !apiKey.trim()}
              className={`px-4 py-2.5 text-xs font-semibold rounded-md shadow-xs transition-colors shrink-0 flex items-center gap-1.5 ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50 font-bold'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
              }`}
            >
              {validatingKey ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin border-current" />
                  Testing Key...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Test & Save Key
                </>
              )}
            </button>
          </div>

          {/* Key Validation Feedback Alerts */}
          {keyStatus && (
            <div
              className={`p-3 rounded-md text-xs border flex items-start gap-2.5 ${
                keyStatus.status === 'valid'
                  ? isDark
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : keyStatus.status === 'invalid'
                  ? isDark
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                  : isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              {keyStatus.status === 'valid' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : keyStatus.status === 'invalid' ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <Key className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">
                  {keyStatus.status === 'valid'
                    ? 'Gemini API Key Verified & Connected!'
                    : keyStatus.status === 'invalid'
                    ? 'API Key Verification Failed'
                    : 'Key Configured Locally'}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">{keyStatus.message}</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-zinc-500">
            Note: If left unconfigured, the system automatically falls back to the built-in deep procedural Academic Scenario Generator (zero cost, zero failure).
          </p>
        </div>
      )}

      {error && (
        <div className={`p-4 rounded-md border text-xs flex items-center gap-2 ${
          isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generation Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`${cardBg} border rounded-lg p-5 space-y-4`}>
            {/* Mode Switcher */}
            <div className={`p-1 rounded-lg border flex gap-1 ${subBg}`}>
              <button
                type="button"
                onClick={() => setSynthesisMode('concept')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  synthesisMode === 'concept'
                    ? isDark
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                By Topic & Syllabus
              </button>
              <button
                type="button"
                onClick={() => setSynthesisMode('document')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  synthesisMode === 'document'
                    ? isDark
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                From Notes / PDF
              </button>
            </div>

            {/* Mode 1: Topic Input */}
            {synthesisMode === 'concept' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Target Topic / Concept
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Heuristic evaluation in A* search..."
                    className={`w-full rounded-md p-2.5 text-xs border font-medium focus:outline-none ${inputBg}`}
                  />
                </div>

                {/* Quick Topic Chips from Unit */}
                {unitTopicsList.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                      Quick Syllabus Unit {unitNumber} Topics (Click to populate):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {unitTopicsList.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTopic(t)}
                          className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${
                            topic === t
                              ? isDark
                                ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                                : 'bg-zinc-900 text-white border-zinc-900 font-bold'
                              : isDark
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                              : 'bg-zinc-50 border-zinc-300 text-zinc-700 hover:text-zinc-900'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Mode 2: Document / Notes Upload */
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-500">
                  Upload Notes, PDF, or Syllabus File (.pdf, .docx, .txt)
                </label>
                <div className={`p-4 rounded-md border border-dashed text-center space-y-2 ${
                  isDark ? 'border-zinc-700 bg-zinc-950/60' : 'border-zinc-300 bg-zinc-50'
                }`}>
                  <Upload className="w-6 h-6 mx-auto text-zinc-500" />
                  <div className="text-xs">
                    <label className="cursor-pointer font-semibold underline text-zinc-300 hover:text-white">
                      Click to choose document
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocFile(file);
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Extracts text and formulates curriculum-aligned exam questions grounded in your content.
                  </p>
                  {docFile && (
                    <div className={`p-2 rounded border text-xs font-mono flex items-center justify-between ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-white border-zinc-200 text-emerald-700'
                    }`}>
                      <span className="truncate max-w-[200px]">{docFile.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {(docFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Question Type & Marks Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setQuestionType(newType);
                    if (newType === 'MCQ') {
                      setMarks(1);
                      setCount(3);
                    } else if (newType === 'SHORT') {
                      setMarks(2);
                      setCount(2);
                    } else if (newType === 'LONG') {
                      setMarks(10);
                      setCount(1);
                    }
                  }}
                  className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                >
                  <option value="SHORT">Short Answer Question</option>
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="LONG">Long Answer / Essay Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Marks Allocation
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  className={`w-full rounded-md p-2 text-xs font-mono border focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Syllabus Unit
                </label>
                <select
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(Number(e.target.value))}
                  className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                >
                  {(subjectDetail?.units || [1, 2, 3, 4, 5]).map((u) => {
                    const num = u.unit_number || u;
                    return (
                      <option key={num} value={num}>
                        Unit {num}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Target Bloom Level
                </label>
                <select
                  value={bloomLevel}
                  onChange={(e) => setBloomLevel(e.target.value)}
                  className={`w-full rounded-md p-2 text-xs font-mono border focus:outline-none ${inputBg}`}
                >
                  <option value="L1">L1: Remember</option>
                  <option value="L2">L2: Understand</option>
                  <option value="L3">L3: Apply</option>
                  <option value="L4">L4: Analyze</option>
                  <option value="L5">L5: Evaluate</option>
                  <option value="L6">L6: Create</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={`w-full rounded-md p-2 text-xs border focus:outline-none ${inputBg}`}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Questions Count
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCount(cnt)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-mono font-bold border transition-colors ${
                        count === cnt
                          ? isDark
                            ? 'bg-zinc-100 text-zinc-950 border-white'
                            : 'bg-zinc-900 text-white border-zinc-900'
                          : `${subBg} hover:opacity-80`
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSynthesize}
              disabled={generating || (synthesisMode === 'concept' ? !topic.trim() : !docFile)}
              className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-md shadow-xs transition-colors ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50 font-bold'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
              }`}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Synthesizing with {isGeminiConnected ? 'Google Gemini' : 'Procedural Engine'}...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Synthesize {count} {questionType} Question{count > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Synthesized Output Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Synthesized Questions ({generatedList.length})
            </h3>
            {generatedList.length > 0 && (
              <button
                onClick={handleSaveAll}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Save All to Master Bank
              </button>
            )}
          </div>

          {/* Engine Notification Banner after synthesis */}
          {engineNotification && (
            <div
              className={`p-3 rounded-md text-xs border flex items-center justify-between gap-2 ${
                engineNotification.geminiError
                  ? isDark
                    ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                  : isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Engine: <strong>{engineNotification.engine}</strong>
                  {engineNotification.geminiError && (
                    <span className="block text-[11px] text-amber-500 mt-0.5">
                      Notice: {engineNotification.geminiError}. Procedural engine took over seamlessly.
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {generatedList.length === 0 ? (
            <div className={`${cardBg} border rounded-lg p-12 text-center space-y-3`}>
              <Cpu className="w-10 h-10 text-zinc-500 mx-auto" />
              <h4 className="text-sm font-semibold">Ready for Question Synthesis</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Select your synthesis mode (concept or notes/PDF) and question type, then click synthesize to produce curriculum-aligned questions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {generatedList.map((item, idx) => {
                let parsedOpts = null;
                if ((item.question_type === 'MCQ' || questionType === 'MCQ') && item.options) {
                  try {
                    parsedOpts = typeof item.options === 'string' ? JSON.parse(item.options) : item.options;
                  } catch (e) {
                    parsedOpts = null;
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`${cardBg} border rounded-lg p-4 space-y-3 transition-colors`}
                  >
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${TYPE_BADGES[item.question_type] || TYPE_BADGES.SHORT}`}>
                          {item.question_type || questionType}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
                            BLOOM_BADGES[item.bloom_level] || ''
                          }`}
                        >
                          {item.bloom_level}
                        </span>
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${subBg}`}>
                          {item.marks}M
                        </span>
                        <span className="font-mono text-xs font-semibold">
                          Unit {item.suggested_unit_number || unitNumber}
                        </span>
                        <span className="font-mono text-xs text-zinc-500">
                          {item.suggested_co_code || 'CO1'}
                        </span>
                      </div>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        item.source?.includes('Gemini')
                          ? isDark
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 font-bold'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                          : isDark
                          ? 'bg-zinc-950 text-zinc-400 border-zinc-800'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                      }`}>
                        {item.source}
                      </span>
                    </div>

                    <p className="text-xs font-normal leading-relaxed">
                      {item.question_text}
                    </p>

                    {/* MCQ Options Display */}
                    {parsedOpts && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {['A', 'B', 'C', 'D'].map((key) => {
                          const isCorrect = item.correct_answer === key;
                          const text = parsedOpts[key];
                          if (!text) return null;
                          return (
                            <div
                              key={key}
                              className={`text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5 font-mono ${
                                isCorrect
                                  ? isDark
                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-semibold'
                                    : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                  : isDark
                                    ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                              }`}
                            >
                              <span className={`font-bold w-4 ${isCorrect ? 'text-emerald-500' : 'text-zinc-500'}`}>{key}.</span>
                              <span className="flex-1 truncate">{text}</span>
                              {isCorrect && (
                                <span className="text-[9px] uppercase px-1 py-0.2 rounded font-bold bg-emerald-500 text-zinc-950">
                                  Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className={`pt-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} flex items-center justify-between`}>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Action Verb: <strong>{item.action_verb}</strong> ({Math.round(item.confidence_score * 100)}% Conf)
                      </span>

                      <button
                        onClick={() => handleSaveQuestion(item, idx)}
                        disabled={savedMap[idx]}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          savedMap[idx]
                            ? 'bg-emerald-600 text-white'
                            : isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                        }`}
                      >
                        {savedMap[idx] ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Saved to Bank
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add to Bank
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
