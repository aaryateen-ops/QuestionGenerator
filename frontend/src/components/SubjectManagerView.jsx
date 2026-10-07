import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, X, ChevronRight,
  Layers, Tag, ListPlus, Check, ArrowRight
} from 'lucide-react';
import { api } from '../api/client';

export default function SubjectManagerView({
  subjects,
  activeSubjectId,
  setActiveSubjectId,
  onSubjectsUpdated,
  theme
}) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const [selectedSubjectId, setSelectedSubjectId] = useState(activeSubjectId || (subjects?.[0]?.id || null));
  const [subjectDetail, setSubjectDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isAddCOOpen, setIsAddCOOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    department: 'Computer Science & Engineering',
    semester: 4,
    regulation: 'Autonomous R2026'
  });

  const [unitForm, setUnitForm] = useState({
    unit_number: 1,
    title: '',
    description: '',
    topics: ''
  });

  const [coForm, setCOForm] = useState({
    code: 'CO1',
    description: '',
    target_bloom_level: 'L3'
  });

  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedSubjectId) {
      loadSubjectDetail(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  const loadSubjectDetail = async (id) => {
    setLoadingDetail(true);
    setActionError(null);
    try {
      const data = await api.getSubjectDetail(id);
      setSubjectDetail(data);
    } catch (err) {
      setActionError(err.message || 'Failed to load subject details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const showNotification = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // Subject actions
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const created = await api.createSubject(subjectForm);
      showNotification(`Course ${created.code} successfully registered.`);
      setIsAddSubjectOpen(false);
      setSubjectForm({
        code: '',
        name: '',
        department: 'Computer Science & Engineering',
        semester: 4,
        regulation: 'Autonomous R2026'
      });
      if (onSubjectsUpdated) await onSubjectsUpdated();
      setSelectedSubjectId(created.id);
    } catch (err) {
      setActionError(err.message || 'Failed to create subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!subjectDetail) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await api.updateSubject(subjectDetail.id, {
        name: subjectForm.name,
        department: subjectForm.department,
        semester: Number(subjectForm.semester),
        regulation: subjectForm.regulation
      });
      showNotification(`Course ${updated.code} updated.`);
      setIsEditSubjectOpen(false);
      if (onSubjectsUpdated) await onSubjectsUpdated();
      await loadSubjectDetail(subjectDetail.id);
    } catch (err) {
      setActionError(err.message || 'Failed to update subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjId, subjCode) => {
    if (!window.confirm(`Are you sure you want to delete course ${subjCode}? This will permanently remove its syllabus units, course outcomes, and question bank.`)) {
      return;
    }
    setActionError(null);
    try {
      await api.deleteSubject(subjId);
      showNotification(`Course ${subjCode} deleted.`);
      if (onSubjectsUpdated) await onSubjectsUpdated();
      const remaining = subjects.filter((s) => s.id !== subjId);
      if (remaining.length > 0) {
        setSelectedSubjectId(remaining[0].id);
        if (activeSubjectId === subjId) setActiveSubjectId(remaining[0].id);
      } else {
        setSelectedSubjectId(null);
        setSubjectDetail(null);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to delete course.');
    }
  };

  // Unit actions
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!subjectDetail) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.addUnit(subjectDetail.id, {
        unit_number: Number(unitForm.unit_number),
        title: unitForm.title.trim(),
        description: unitForm.description.trim() || undefined,
        topics: unitForm.topics.trim() || undefined
      });
      showNotification(`Unit ${unitForm.unit_number} added to ${subjectDetail.code}.`);
      setIsAddUnitOpen(false);
      setUnitForm({ unit_number: (subjectDetail.units?.length || 0) + 1, title: '', description: '', topics: '' });
      await loadSubjectDetail(subjectDetail.id);
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (err) {
      setActionError(err.message || 'Failed to add unit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!subjectDetail || !editingUnit) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.updateUnit(subjectDetail.id, editingUnit.id, {
        title: unitForm.title.trim(),
        description: unitForm.description.trim() || undefined,
        topics: unitForm.topics.trim() || undefined
      });
      showNotification(`Unit ${editingUnit.unit_number} updated.`);
      setEditingUnit(null);
      await loadSubjectDetail(subjectDetail.id);
    } catch (err) {
      setActionError(err.message || 'Failed to update unit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unitId, unitNum) => {
    if (!window.confirm(`Delete Unit ${unitNum}? Associated questions will be cascaded.`)) return;
    try {
      await api.deleteUnit(subjectDetail.id, unitId);
      showNotification(`Unit ${unitNum} deleted.`);
      await loadSubjectDetail(subjectDetail.id);
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (err) {
      setActionError(err.message || 'Failed to delete unit.');
    }
  };

  // CO actions
  const handleCreateCO = async (e) => {
    e.preventDefault();
    if (!subjectDetail) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.addCO(subjectDetail.id, {
        code: coForm.code.trim().toUpperCase(),
        description: coForm.description.trim(),
        target_bloom_level: coForm.target_bloom_level
      });
      showNotification(`Course Outcome ${coForm.code} added.`);
      setIsAddCOOpen(false);
      setCOForm({ code: `CO${(subjectDetail.course_outcomes?.length || 0) + 1}`, description: '', target_bloom_level: 'L3' });
      await loadSubjectDetail(subjectDetail.id);
    } catch (err) {
      setActionError(err.message || 'Failed to add Course Outcome.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCO = async (coId, coCode) => {
    if (!window.confirm(`Delete Course Outcome ${coCode}?`)) return;
    try {
      await api.deleteCO(subjectDetail.id, coId);
      showNotification(`Course Outcome ${coCode} deleted.`);
      await loadSubjectDetail(subjectDetail.id);
    } catch (err) {
      setActionError(err.message || 'Failed to delete Course Outcome.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`${cardBg} border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-zinc-400" />
            <h2 className="text-base font-bold tracking-tight">
              Curriculum & Course Management
            </h2>
          </div>
          <p className="text-xs text-zinc-500 max-w-2xl">
            Configure academic degree subjects, define 5-unit syllabus structures, attach granular topics,
            and map Outcome-Based Education (OBE) course outcomes with target Bloom cognitive levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSubjectForm({
                code: '',
                name: '',
                department: 'Computer Science & Engineering',
                semester: 4,
                regulation: 'Autonomous R2026'
              });
              setIsAddSubjectOpen(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors shrink-0 ${
              isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Course
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className={`p-3 rounded-md text-xs border flex items-center justify-between gap-2 ${
          isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className={`p-3 rounded-md text-xs border flex items-center gap-2 ${
          isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Two Column Layout: Subject Selector List & Selected Subject Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Courses List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
              Academic Courses ({subjects?.length || 0})
            </h3>
          </div>

          <div className="space-y-2">
            {(subjects || []).map((s) => {
              const isSelected = s.id === selectedSubjectId;
              const isActive = s.id === activeSubjectId;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-zinc-800/80 border-zinc-600 shadow-sm'
                        : 'bg-zinc-100 border-zinc-400 shadow-sm'
                      : `${cardBg} hover:border-zinc-500`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{s.code}</span>
                        {isActive && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                            isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          }`}>
                            Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-medium text-zinc-300 mt-0.5 line-clamp-1">{s.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Sem {s.semester} • {s.regulation}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActive ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSubjectId(s.id);
                            showNotification(`Switched active course to ${s.code}.`);
                          }}
                          className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                            isDark
                              ? 'bg-zinc-900 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                              : 'bg-white hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                          }`}
                          title="Set as global active course"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Syllabus & CO Structure */}
        <div className="lg:col-span-8 space-y-5">
          {loadingDetail ? (
            <div className={`${cardBg} border rounded-lg p-12 text-center text-xs text-zinc-500`}>
              Loading course details...
            </div>
          ) : !subjectDetail ? (
            <div className={`${cardBg} border rounded-lg p-12 text-center text-xs text-zinc-500`}>
              Select a course on the left to inspect and configure its syllabus.
            </div>
          ) : (
            <>
              {/* Course Meta Card */}
              <div className={`${cardBg} border rounded-lg p-5 space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-inherit pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{subjectDetail.code}</span>
                      <span className="text-xs text-zinc-500">• Semester {subjectDetail.semester}</span>
                    </div>
                    <h3 className="text-base font-bold tracking-tight mt-0.5">{subjectDetail.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {subjectDetail.department} • Regulation: {subjectDetail.regulation}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSubjectForm({
                          code: subjectDetail.code,
                          name: subjectDetail.name,
                          department: subjectDetail.department,
                          semester: subjectDetail.semester,
                          regulation: subjectDetail.regulation
                        });
                        setIsEditSubjectOpen(true);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                        isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Course
                    </button>

                    <button
                      onClick={() => handleDeleteSubject(subjectDetail.id, subjectDetail.code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border font-medium text-rose-500 hover:bg-rose-500/10 border-rose-500/30 transition-colors`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Metric Summary Pills */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-md border text-center ${subBg}`}>
                    <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Syllabus Units
                    </span>
                    <span className="text-base font-bold font-mono">
                      {subjectDetail.units?.length || 0} / 5
                    </span>
                  </div>
                  <div className={`p-3 rounded-md border text-center ${subBg}`}>
                    <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Course Outcomes
                    </span>
                    <span className="text-base font-bold font-mono">
                      {subjectDetail.course_outcomes?.length || 0}
                    </span>
                  </div>
                  <div className={`p-3 rounded-md border text-center ${subBg}`}>
                    <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Repository Bank
                    </span>
                    <span className="text-base font-bold font-mono">
                      {subjectDetail.question_count || 0} Questions
                    </span>
                  </div>
                </div>
              </div>

              {/* Units & Syllabus Section */}
              <div className={`${cardBg} border rounded-lg p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Syllabus Units & Topics
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Define curriculum boundaries used by the paper blueprint generator and AI synthesizer.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUnitForm({
                        unit_number: (subjectDetail.units?.length || 0) + 1,
                        title: '',
                        description: '',
                        topics: ''
                      });
                      setIsAddUnitOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Unit
                  </button>
                </div>

                <div className="space-y-3">
                  {(subjectDetail.units || []).map((u) => (
                    <div key={u.id} className={`p-3.5 rounded-md border space-y-1.5 ${subBg}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-800'
                          }`}>
                            Unit {u.unit_number}
                          </span>
                          <h5 className="text-xs font-bold">{u.title}</h5>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingUnit(u);
                              setUnitForm({
                                unit_number: u.unit_number,
                                title: u.title,
                                description: u.description || '',
                                topics: u.topics || ''
                              });
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Edit Unit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(u.id, u.unit_number)}
                            className="p-1 text-rose-500 hover:text-rose-400 transition-colors"
                            title="Delete Unit"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {u.description && (
                        <p className="text-[11px] text-zinc-400">{u.description}</p>
                      )}

                      {u.topics && (
                        <div className="flex items-start gap-1.5 pt-1">
                          <Tag className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-zinc-400 font-mono">
                            Topics: {u.topics}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {(subjectDetail.units || []).length === 0 && (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No units defined yet. Click "Add Unit" to set up Unit 1 through 5.
                    </div>
                  )}
                </div>
              </div>

              {/* Course Outcomes (CO) Section */}
              <div className={`${cardBg} border rounded-lg p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Course Outcomes (OBE Framework)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Accreditation outcomes with target Bloom's cognitive tiers.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCOForm({
                        code: `CO${(subjectDetail.course_outcomes?.length || 0) + 1}`,
                        description: '',
                        target_bloom_level: 'L3'
                      });
                      setIsAddCOOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Outcome
                  </button>
                </div>

                <div className="space-y-2">
                  {(subjectDetail.course_outcomes || []).map((c) => (
                    <div key={c.id} className={`p-3 rounded-md border flex items-center justify-between gap-3 ${subBg}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-zinc-300 shrink-0">{c.code}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : 'bg-white border-zinc-300 text-zinc-700'
                        }`}>
                          Target: {c.target_bloom_level}
                        </span>
                        <p className="text-xs text-zinc-400 truncate">{c.description}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteCO(c.id, c.code)}
                        className="p-1 text-rose-500 hover:text-rose-400 transition-colors shrink-0"
                        title="Delete Course Outcome"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(subjectDetail.course_outcomes || []).length === 0 && (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No Course Outcomes defined yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Add New Subject */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${cardBg} border rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="text-sm font-bold">Register New Academic Course</h3>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Course Code (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS8391, IT8501"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures and Algorithms"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={subjectForm.department}
                  onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Semester (1-8)</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                    className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Regulation</label>
                  <input
                    type="text"
                    value={subjectForm.regulation}
                    onChange={(e) => setSubjectForm({ ...subjectForm, regulation: e.target.value })}
                    className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-md border font-medium ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs ${
                    isDark ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 text-white'
                  }`}
                >
                  {submitting ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Subject */}
      {isEditSubjectOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${cardBg} border rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="text-sm font-bold">Edit Course Details</h3>
              <button onClick={() => setIsEditSubjectOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Course Code (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  value={subjectForm.code}
                  className={`w-full rounded-md p-2 text-xs font-mono border opacity-60 ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={subjectForm.department}
                  onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Semester</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                    className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Regulation</label>
                  <input
                    type="text"
                    value={subjectForm.regulation}
                    onChange={(e) => setSubjectForm({ ...subjectForm, regulation: e.target.value })}
                    className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setIsEditSubjectOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-md border font-medium ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs ${
                    isDark ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 text-white'
                  }`}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Unit */}
      {isAddUnitOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${cardBg} border rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="text-sm font-bold">Add Syllabus Unit</h3>
              <button onClick={() => setIsAddUnitOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Unit Number</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={unitForm.unit_number}
                  onChange={(e) => setUnitForm({ ...unitForm, unit_number: Number(e.target.value) })}
                  className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Unit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linear Data Structures - Stacks and Queues"
                  value={unitForm.title}
                  onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Unit Description</label>
                <textarea
                  rows="2"
                  placeholder="Overview of syllabus concepts covered in this unit..."
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Specific Topics (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Array Implementation, Linked Stack, Postfix Evaluation, Circular Queue"
                  value={unitForm.topics}
                  onChange={(e) => setUnitForm({ ...unitForm, topics: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setIsAddUnitOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-md border font-medium ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs ${
                    isDark ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 text-white'
                  }`}
                >
                  {submitting ? 'Adding...' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Unit */}
      {editingUnit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${cardBg} border rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="text-sm font-bold">Edit Unit {editingUnit.unit_number}</h3>
              <button onClick={() => setEditingUnit(null)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Unit Title</label>
                <input
                  type="text"
                  required
                  value={unitForm.title}
                  onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Unit Description</label>
                <textarea
                  rows="2"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Specific Topics</label>
                <input
                  type="text"
                  value={unitForm.topics}
                  onChange={(e) => setUnitForm({ ...unitForm, topics: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className={`px-3 py-1.5 text-xs rounded-md border font-medium ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs ${
                    isDark ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 text-white'
                  }`}
                >
                  {submitting ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add CO */}
      {isAddCOOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`${cardBg} border rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="text-sm font-bold">Add Course Outcome (OBE)</h3>
              <button onClick={() => setIsAddCOOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCO} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">CO Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CO1, CO2"
                    value={coForm.code}
                    onChange={(e) => setCOForm({ ...coForm, code: e.target.value })}
                    className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Bloom Level</label>
                  <select
                    value={coForm.target_bloom_level}
                    onChange={(e) => setCOForm({ ...coForm, target_bloom_level: e.target.value })}
                    className={`w-full rounded-md p-2 text-xs font-mono border ${inputBg}`}
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

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Outcome Description</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Design and evaluate recursive algorithms for non-linear structures..."
                  value={coForm.description}
                  onChange={(e) => setCOForm({ ...coForm, description: e.target.value })}
                  className={`w-full rounded-md p-2 text-xs border ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setIsAddCOOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-md border font-medium ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs ${
                    isDark ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 text-white'
                  }`}
                >
                  {submitting ? 'Adding...' : 'Add Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
