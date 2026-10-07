import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Upload,
  Trash2,
  Edit2,
  X,
  Tag,
  Zap,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileJson,
  Rows,
  AlignJustify,
  FolderInput,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import QuestionAuthorDrawer from './QuestionAuthorDrawer';
import MathHighlightedText from './MathHighlightedText';

const BLOOM_META = {
  L1: { label: 'L1', name: 'Remember', dot: 'bg-emerald-500' },
  L2: { label: 'L2', name: 'Understand', dot: 'bg-sky-500' },
  L3: { label: 'L3', name: 'Apply', dot: 'bg-indigo-500' },
  L4: { label: 'L4', name: 'Analyze', dot: 'bg-amber-500' },
  L5: { label: 'L5', name: 'Evaluate', dot: 'bg-rose-500' },
  L6: { label: 'L6', name: 'Create', dot: 'bg-purple-500' },
};

const BLOOM_RANK = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, L6: 6 };
const DIFF_RANK = { EASY: 1, MEDIUM: 2, HARD: 3 };

export default function QuestionBankView({ subjectId, subjectDetail, onUpdate, theme }) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedBloom, setSelectedBloom] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedMarks, setSelectedMarks] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Table Density: 'comfortable' vs 'compact'
  const [density, setDensity] = useState(() => {
    return localStorage.getItem('qp_table_density') || 'comfortable';
  });

  const handleDensityChange = (newDensity) => {
    setDensity(newDensity);
    localStorage.setItem('qp_table_density', newDensity);
  };

  // Sorting State
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Batch Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetBatchUnit, setTargetBatchUnit] = useState('');
  const [targetBatchCO, setTargetBatchCO] = useState('');
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Linear Slide-over Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState('ai');
  const [drawerEditQuestion, setDrawerEditQuestion] = useState(null);

  useEffect(() => {
    fetchQuestions();
    setSelectedIds([]);
  }, [subjectId]);

  // Keyboard shortcut: Escape deselects all
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedIds.length > 0 && !isAssignModalOpen && !isDrawerOpen) {
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, isAssignModalOpen, isDrawerOpen]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await api.getQuestions({
        subject_id: subjectId,
      });
      setAllQuestions(data || []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (tab = 'ai', questionToEdit = null) => {
    setDrawerEditQuestion(questionToEdit);
    setDrawerInitialTab(tab);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this question from the repository?')) {
      try {
        await api.deleteQuestion(id);
        fetchQuestions();
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        if (onUpdate) onUpdate();
      } catch (err) {
        alert(err.message || 'Failed to delete question');
      }
    }
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fast in-memory filtering: 0ms latency, persistent master counts
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (selectedType && q.question_type !== selectedType) return false;
      if (selectedBloom && q.bloom_level !== selectedBloom) return false;
      if (selectedUnit && q.unit_id !== Number(selectedUnit)) return false;
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
      if (selectedMarks && q.marks !== Number(selectedMarks)) return false;
      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        const textMatch = (q.question_text || '').toLowerCase().includes(s);
        const verbMatch = (q.action_verb || '').toLowerCase().includes(s);
        if (!textMatch && !verbMatch) return false;
      }
      return true;
    });
  }, [allQuestions, selectedType, selectedBloom, selectedUnit, selectedDifficulty, selectedMarks, search]);

  // Process and sort filtered questions
  const sortedQuestions = useMemo(() => {
    const list = [...filteredQuestions];
    if (!sortField) return list;

    list.sort((a, b) => {
      let valA, valB;
      const unitA = subjectDetail?.units?.find((u) => u.id === a.unit_id)?.unit_number || 0;
      const unitB = subjectDetail?.units?.find((u) => u.id === b.unit_id)?.unit_number || 0;
      const coA = subjectDetail?.course_outcomes?.find((c) => c.id === a.co_id)?.code || '';
      const coB = subjectDetail?.course_outcomes?.find((c) => c.id === b.co_id)?.code || '';

      switch (sortField) {
        case 'unit':
          valA = unitA;
          valB = unitB;
          break;
        case 'marks':
          valA = a.marks || 0;
          valB = b.marks || 0;
          break;
        case 'bloom':
          valA = BLOOM_RANK[a.bloom_level] || 0;
          valB = BLOOM_RANK[b.bloom_level] || 0;
          break;
        case 'difficulty':
          valA = DIFF_RANK[a.difficulty] || 0;
          valB = DIFF_RANK[b.difficulty] || 0;
          break;
        case 'type':
          valA = a.question_type || '';
          valB = b.question_type || '';
          break;
        case 'co':
          valA = coA;
          valB = coB;
          break;
        case 'usage':
          valA = a.usage_count || 0;
          valB = b.usage_count || 0;
          break;
        case 'created_at':
        default:
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredQuestions, sortField, sortDirection, subjectDetail]);

  // Selection Logic
  const allSelected = sortedQuestions.length > 0 && sortedQuestions.every((q) => selectedIds.includes(q.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedQuestions.map((q) => q.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Operations
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (window.confirm(`Permanently delete ${count} selected question${count > 1 ? 's' : ''} from the repository?`)) {
      setBatchActionLoading(true);
      try {
        await api.batchDeleteQuestions(selectedIds);
        setSelectedIds([]);
        await fetchQuestions();
        if (onUpdate) onUpdate();
      } catch (err) {
        alert(err.message || 'Batch delete failed');
      } finally {
        setBatchActionLoading(false);
      }
    }
  };

  const handleBatchAssign = async () => {
    if (selectedIds.length === 0) return;
    if (!targetBatchUnit && !targetBatchCO) {
      alert('Please select either a Unit or a Course Outcome (CO) to assign.');
      return;
    }
    setBatchActionLoading(true);
    try {
      await api.batchAssignQuestions({
        question_ids: selectedIds,
        unit_id: targetBatchUnit ? Number(targetBatchUnit) : undefined,
        co_id: targetBatchCO ? Number(targetBatchCO) : undefined,
      });
      setIsAssignModalOpen(false);
      setTargetBatchUnit('');
      setTargetBatchCO('');
      setSelectedIds([]);
      await fetchQuestions();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Batch assign failed');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Batch Export CSV
  const handleExportCSV = () => {
    const selectedQuestions = sortedQuestions.filter((q) => selectedIds.includes(q.id));
    if (selectedQuestions.length === 0) return;

    const headers = [
      'ID',
      'Subject Code',
      'Unit Number',
      'Question Type',
      'Marks',
      'Bloom Level',
      'Course Outcome',
      'Difficulty',
      'Question Text',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Answer',
      'Action Verb',
      'Usage Count'
    ];

    const rows = selectedQuestions.map((q) => {
      const unitObj = subjectDetail?.units?.find((u) => u.id === q.unit_id);
      const coObj = subjectDetail?.course_outcomes?.find((c) => c.id === q.co_id);
      let parsedOpts = { A: '', B: '', C: '', D: '' };
      if (q.question_type === 'MCQ' && q.options) {
        try {
          parsedOpts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch (e) {}
      }

      return [
        q.id,
        subjectDetail?.code || '',
        unitObj?.unit_number || '',
        q.question_type || 'SHORT',
        q.marks || '',
        q.bloom_level || '',
        coObj?.code || '',
        q.difficulty || '',
        `"${(q.question_text || '').replace(/"/g, '""')}"`,
        `"${(parsedOpts.A || '').replace(/"/g, '""')}"`,
        `"${(parsedOpts.B || '').replace(/"/g, '""')}"`,
        `"${(parsedOpts.C || '').replace(/"/g, '""')}"`,
        `"${(parsedOpts.D || '').replace(/"/g, '""')}"`,
        q.correct_answer || '',
        q.action_verb || '',
        q.usage_count || 0
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${subjectDetail?.code || 'QB'}_questions_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch Export JSON
  const handleExportJSON = () => {
    const selectedQuestions = sortedQuestions.filter((q) => selectedIds.includes(q.id));
    if (selectedQuestions.length === 0) return;

    const exportData = {
      subject_code: subjectDetail?.code,
      subject_name: subjectDetail?.name,
      exported_at: new Date().toISOString(),
      total_questions: selectedQuestions.length,
      questions: selectedQuestions
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${subjectDetail?.code || 'QB'}_questions_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Stats Metrics computed from the MASTER repository (allQuestions)
  const typeCounts = useMemo(() => {
    const counts = { MCQ: 0, SHORT: 0, LONG: 0 };
    allQuestions.forEach((q) => {
      if (counts[q.question_type] !== undefined) counts[q.question_type]++;
    });
    return counts;
  }, [allQuestions]);

  const bloomCounts = useMemo(() => {
    const counts = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 };
    allQuestions.forEach((q) => {
      if (counts[q.bloom_level] !== undefined) counts[q.bloom_level]++;
    });
    return counts;
  }, [allQuestions]);

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-25 group-hover:opacity-70 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-400" />
    );
  };

  return (
    <div className="space-y-3 relative pb-16">
      {/* Top Segment: Search & Action Toolbar */}
      <div className={`${cardBg} border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors`}>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search questions or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-md pl-9 pr-3 py-1.5 text-xs border focus:outline-none ${inputBg}`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Unit Filter */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className={`text-xs rounded-md px-2.5 py-1.5 border focus:outline-none ${inputBg}`}
          >
            <option value="">All Units</option>
            {subjectDetail?.units?.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unit_number}
              </option>
            ))}
          </select>

          {/* Bloom Filter */}
          <select
            value={selectedBloom}
            onChange={(e) => setSelectedBloom(e.target.value)}
            className={`text-xs rounded-md px-2.5 py-1.5 border focus:outline-none ${inputBg}`}
          >
            <option value="">All Bloom Levels</option>
            <option value="L1">L1: Remember</option>
            <option value="L2">L2: Understand</option>
            <option value="L3">L3: Apply</option>
            <option value="L4">L4: Analyze</option>
            <option value="L5">L5: Evaluate</option>
            <option value="L6">L6: Create</option>
          </select>

          {/* Question Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`text-xs rounded-md px-2.5 py-1.5 border focus:outline-none ${inputBg}`}
          >
            <option value="">All Types</option>
            <option value="SHORT">Short Answer</option>
            <option value="LONG">Long Answer</option>
            <option value="MCQ">Multiple Choice</option>
          </select>

          {/* Table Density Switcher */}
          <div className={`flex items-center rounded-md border p-0.5 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            <button
              onClick={() => handleDensityChange('comfortable')}
              className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
                density === 'comfortable'
                  ? isDark ? 'bg-zinc-800 text-white font-medium shadow-xs' : 'bg-white text-zinc-900 font-medium shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
              title="Comfortable View: Detailed view with option keys"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDensityChange('compact')}
              className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
                density === 'compact'
                  ? isDark ? 'bg-zinc-800 text-white font-medium shadow-xs' : 'bg-white text-zinc-900 font-medium shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
              title="Compact View: High-density list"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-700/40 mx-1 hidden sm:block" />

          {/* Action Trigger 1: Draft with AI */}
          <button
            onClick={() => handleOpenDrawer('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md shadow-xs transition-colors ${
              isDark
                ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>Draft with AI</span>
          </button>

          {/* Action Trigger 2: Manual Add */}
          <button
            onClick={() => handleOpenDrawer('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>

          {/* Action Trigger 3: Bulk Import */}
          <button
            onClick={() => handleOpenDrawer('import')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Top Filter Bar: Linear-style Segmented Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-0.5 text-xs">
        <div className={`inline-flex items-center p-0.5 rounded-lg border text-xs font-medium ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
        }`}>
          {[
            { id: '', label: 'All', count: allQuestions.length, activeStyle: isDark ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'bg-white text-zinc-900 font-semibold shadow-xs' },
            { id: 'MCQ', label: 'MCQs', count: typeCounts.MCQ, activeStyle: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-semibold shadow-xs border border-amber-200/80 dark:border-amber-800/60' },
            { id: 'SHORT', label: 'Short', count: typeCounts.SHORT, activeStyle: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold shadow-xs border border-sky-200/80 dark:border-sky-800/60' },
            { id: 'LONG', label: 'Long', count: typeCounts.LONG, activeStyle: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-semibold shadow-xs border border-purple-200/80 dark:border-purple-800/60' },
          ].map((tab) => {
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? tab.activeStyle
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono opacity-80 ${isActive ? 'font-bold' : ''}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Minimal Cognitive Indicators */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">Cognitive:</span>
          {Object.entries(BLOOM_META).map(([lvl, meta]) => {
            const count = bloomCounts[lvl] || 0;
            const isSelected = selectedBloom === lvl;

            return (
              <button
                key={lvl}
                onClick={() => setSelectedBloom(selectedBloom === lvl ? '' : lvl)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-zinc-800 text-white font-bold ring-1 ring-zinc-600'
                      : 'bg-zinc-200 text-zinc-950 font-bold ring-1 ring-zinc-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title={`Filter by Bloom Level ${lvl} (${meta.name})`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                <span>{lvl}</span>
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions Data Table: Clean, Zero Box Overdose, Crystal Clear Text */}
      <div className={`${cardBg} border rounded-lg overflow-hidden shadow-xs`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
            }`}>
              <tr>
                {/* Master Selection Checkbox */}
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    disabled={sortedQuestions.length === 0}
                    className="flex items-center justify-center p-0.5 text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-40"
                    title={allSelected ? 'Deselect all' : 'Select all visible'}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-500" />
                    ) : someSelected ? (
                      <MinusSquare className="w-4 h-4 text-sky-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {/* Column: Type (Plain text, no box) */}
                <th
                  onClick={() => handleSort('type')}
                  className="py-3 px-3 w-18 cursor-pointer select-none group hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>

                {/* Column: Marks (Plain text, no box) */}
                <th
                  onClick={() => handleSort('marks')}
                  className="py-3 px-3 w-16 cursor-pointer select-none group hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Marks</span>
                    {renderSortIndicator('marks')}
                  </div>
                </th>

                {/* Column: Cognitive Bloom Level (Dot + text, no box) */}
                <th
                  onClick={() => handleSort('bloom')}
                  className="py-3 px-3 w-28 cursor-pointer select-none group hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Cognitive</span>
                    {renderSortIndicator('bloom')}
                  </div>
                </th>

                {/* Column: Syllabus (Unit & CO) */}
                <th
                  onClick={() => handleSort('unit')}
                  className="py-3 px-3 w-24 cursor-pointer select-none group hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Syllabus</span>
                    {renderSortIndicator('unit')}
                  </div>
                </th>

                {/* Column: Question Stem & Content (Takes full space) */}
                <th className="py-3 px-4">Question Text & Stem Decomposition</th>

                {/* Column: Actions */}
                <th className="py-3 px-3 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-zinc-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Loading questions from repository...
                  </td>
                </tr>
              ) : sortedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-zinc-600 dark:text-zinc-400">No questions found</p>
                      <p className="text-[11px] text-zinc-500">
                        {search || selectedUnit || selectedBloom || selectedType
                          ? 'No questions matched the active filters. Try clearing filters.'
                          : 'Draft questions with AI or author manual questions for this subject.'}
                      </p>
                      <button
                        onClick={() => handleOpenDrawer('ai')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md mt-1 ${
                          isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                        Draft with AI
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedQuestions.map((q) => {
                  const unitObj = subjectDetail?.units?.find((u) => u.id === q.unit_id);
                  const coObj = subjectDetail?.course_outcomes?.find((c) => c.id === q.co_id);
                  const isSelected = selectedIds.includes(q.id);

                  let parsedOpts = null;
                  if (q.question_type === 'MCQ' && q.options) {
                    try {
                      parsedOpts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                    } catch (e) {
                      parsedOpts = null;
                    }
                  }

                  const rowPadding = density === 'compact' ? 'py-2' : 'py-3.5';

                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${
                        isSelected
                          ? isDark
                            ? 'bg-zinc-800/70 border-l-2 border-l-sky-400'
                            : 'bg-sky-50 border-l-2 border-l-sky-500'
                          : isDark
                            ? 'hover:bg-zinc-800/30'
                            : 'hover:bg-zinc-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className={`${rowPadding} px-3 text-center`}>
                        <button
                          onClick={() => handleToggleSelect(q.id)}
                          className="flex items-center justify-center p-0.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Type: Flat clean text, zero box */}
                      <td className={`${rowPadding} px-3`}>
                        <span className={`font-mono text-xs font-semibold ${
                          q.question_type === 'MCQ'
                            ? 'text-amber-500 dark:text-amber-400'
                            : q.question_type === 'LONG'
                              ? 'text-purple-500 dark:text-purple-400'
                              : 'text-sky-500 dark:text-sky-400'
                        }`}>
                          {q.question_type || 'SHORT'}
                        </span>
                      </td>

                      {/* Marks: Flat clean text, zero box */}
                      <td className={`${rowPadding} px-3`}>
                        <span className={`font-mono text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {q.marks}M
                        </span>
                      </td>

                      {/* Cognitive Bloom Level: Dot + clean text, zero box */}
                      <td className={`${rowPadding} px-3`}>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${BLOOM_META[q.bloom_level]?.dot || 'bg-zinc-400'}`} />
                          <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            {q.bloom_level}
                          </span>
                          <span className={`text-[11px] font-sans hidden xl:inline ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {BLOOM_META[q.bloom_level]?.name}
                          </span>
                        </div>
                      </td>

                      {/* Syllabus: Flat text, zero box */}
                      <td className={`${rowPadding} px-3`}>
                        <div className="font-mono text-xs">
                          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            U{unitObj?.unit_number || '1'}
                          </span>
                          <span className="mx-1 text-zinc-400">/</span>
                          <span className="text-zinc-500 font-medium">
                            {coObj?.code || 'CO1'}
                          </span>
                        </div>
                      </td>

                      {/* Question Text & Decomposition (Crisp, High-Contrast 14px Text) */}
                      <td className={`${rowPadding} px-4`}>
                        {density === 'compact' ? (
                          // Compact View
                          <div className="flex items-center gap-2">
                            <span className={`text-sm truncate max-w-2xl font-normal ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              <MathHighlightedText text={q.question_text} query={search} isDark={isDark} />
                            </span>
                            {parsedOpts && (
                              <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                                [4 Options • Key: {q.correct_answer || 'A'}]
                              </span>
                            )}
                          </div>
                        ) : (
                          // Comfortable View: Full readable decomposition & options
                          <div className="space-y-2">
                            <div className={`text-sm font-normal leading-relaxed ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              <MathHighlightedText text={q.question_text} query={search} isDark={isDark} />
                            </div>

                            {/* Clean MCQ Options Display */}
                            {parsedOpts && (
                              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {['A', 'B', 'C', 'D'].map((key) => {
                                  const isCorrect = q.correct_answer === key;
                                  const text = parsedOpts[key];
                                  if (!text) return null;

                                  return (
                                    <div
                                      key={key}
                                      className={`text-xs px-3 py-2 rounded border flex items-center gap-2 font-mono transition-colors ${
                                        isCorrect
                                          ? isDark
                                            ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300 font-semibold'
                                            : 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                                          : isDark
                                            ? 'border-zinc-800 bg-zinc-950/60 text-zinc-200'
                                            : 'border-zinc-200 bg-zinc-50 text-zinc-800'
                                      }`}
                                    >
                                      <strong className={isCorrect ? 'text-emerald-500 font-bold' : 'text-zinc-500 font-semibold'}>
                                        ({key})
                                      </strong>
                                      <div className="truncate">
                                        <MathHighlightedText text={text} query={search} isDark={isDark} />
                                      </div>
                                      {isCorrect && (
                                        <span className="ml-auto text-[10px] uppercase tracking-wider text-emerald-600 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
                                          Correct
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Action Verb, Usage & Difficulty Tag */}
                            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                              {q.action_verb && (
                                <span className="flex items-center gap-1 text-zinc-500">
                                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Action:</span>
                                  <strong className="text-blue-600 dark:text-blue-400 font-semibold">{q.action_verb}</strong>
                                </span>
                              )}
                              <span className="text-zinc-400">•</span>
                              <span className="text-zinc-500">Usage: <strong className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{q.usage_count || 0}</strong> papers</span>
                              <span className="text-zinc-400">•</span>
                              <span className={`font-semibold ${
                                q.difficulty === 'EASY'
                                  ? 'text-emerald-500'
                                  : q.difficulty === 'MEDIUM'
                                    ? 'text-sky-500'
                                    : 'text-rose-500'
                              }`}>
                                {q.difficulty}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className={`${rowPadding} px-3 text-center`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDrawer('manual', q)}
                            className="p-1 rounded text-zinc-400 hover:text-sky-500 transition-colors"
                            title="Edit Question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-500 transition-colors"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Linear/Stripe-Style Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-3 text-white text-xs">
            {/* Selected Count */}
            <div className="flex items-center gap-2 font-semibold pr-2 border-r border-zinc-700/70">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>
                {selectedIds.length} {selectedIds.length === 1 ? 'question' : 'questions'} selected
              </span>
            </div>

            {/* Batch Assign Unit / CO */}
            <button
              onClick={() => setIsAssignModalOpen(true)}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium transition-colors"
            >
              <FolderInput className="w-3.5 h-3.5 text-sky-400" />
              <span>Assign Unit/CO</span>
            </button>

            {/* Batch Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {/* Batch Export JSON */}
            <button
              onClick={handleExportJSON}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium transition-colors hidden sm:flex"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>

            {/* Batch Delete */}
            <button
              onClick={handleBatchDelete}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors ml-1"
              title="Deselect all (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Assign Unit / CO Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`${cardBg} border max-w-md w-full rounded-xl p-5 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <div className="flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold">Batch Re-assign Unit & CO</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Re-assign <strong>{selectedIds.length}</strong> selected questions to a specific Syllabus Unit or Course Outcome (CO):
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 mb-1 block">
                  Target Syllabus Unit
                </label>
                <select
                  value={targetBatchUnit}
                  onChange={(e) => setTargetBatchUnit(e.target.value)}
                  className={`w-full rounded-md px-3 py-2 text-xs border focus:outline-none ${inputBg}`}
                >
                  <option value="">Leave Unchanged</option>
                  {subjectDetail?.units?.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}: {u.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 mb-1 block">
                  Target Course Outcome (CO)
                </label>
                <select
                  value={targetBatchCO}
                  onChange={(e) => setTargetBatchCO(e.target.value)}
                  className={`w-full rounded-md px-3 py-2 text-xs border focus:outline-none ${inputBg}`}
                >
                  <option value="">Leave Unchanged</option>
                  {subjectDetail?.course_outcomes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                disabled={batchActionLoading}
                className="px-3 py-1.5 text-xs rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAssign}
                disabled={batchActionLoading || (!targetBatchUnit && !targetBatchCO)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors ${
                  isDark
                    ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                }`}
              >
                {batchActionLoading ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply to {selectedIds.length} Questions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linear-Style Question Author Slide-Over Drawer */}
      <QuestionAuthorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab={drawerInitialTab}
        subjectId={subjectId}
        subjectDetail={subjectDetail}
        editingQuestion={drawerEditQuestion}
        onQuestionSaved={() => {
          fetchQuestions();
          if (onUpdate) onUpdate();
        }}
        theme={theme}
      />
    </div>
  );
}
