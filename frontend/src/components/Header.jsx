import React from 'react';
import { Shield, User, Layers, FileText, Search, Cpu, Printer, Sun, Moon } from 'lucide-react';

export default function Header({
  activeRole,
  setActiveRole,
  activeTab,
  setActiveTab,
  subjects,
  activeSubjectId,
  setActiveSubjectId,
  latestPaperId,
  theme,
  setTheme,
}) {
  const isDark = theme === 'dark';

  return (
    <header
      className={`no-print border-b sticky top-0 z-40 transition-colors ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Institution Platform Title */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Platform Logo"
              className="w-9 h-9 rounded-lg object-contain shrink-0 shadow-xs select-none"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">Question Paper Management System</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                    isDark ? 'bg-zinc-900 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  OBE Framework
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Autonomous Assessment & Bloom's Taxonomy Platform</p>
            </div>
          </div>

          {/* Active Course Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider hidden sm:inline">
              Course:
            </span>
            <select
              value={activeSubjectId || ''}
              onChange={(e) => setActiveSubjectId(Number(e.target.value))}
              className={`text-xs rounded-md px-3 py-1.5 focus:outline-none border font-medium transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-zinc-500'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500'
              }`}
            >
              {subjects && subjects.length > 0 ? (
                subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.regulation})
                  </option>
                ))
              ) : (
                <option value="">No Course Loaded</option>
              )}
            </select>
          </div>

          {/* Right Controls: Role & Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-md border text-xs flex items-center gap-1.5 transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>

            {/* Role Switcher */}
            <div
              className={`flex items-center p-1 rounded-md border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
              }`}
            >
              <button
                onClick={() => setActiveRole('faculty')}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  activeRole === 'faculty'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                      : 'bg-white text-zinc-900 font-bold shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <User className="w-3 h-3" />
                Faculty
              </button>
              <button
                onClick={() => setActiveRole('admin')}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  activeRole === 'admin'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                      : 'bg-white text-zinc-900 font-bold shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Shield className="w-3 h-3" />
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Clean Architecture) */}
        <div className={`flex space-x-1 border-t py-1.5 overflow-x-auto text-xs ${isDark ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'dashboard'
                ? isDark
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'questions'
                ? isDark
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Question Repository
          </button>

          <button
            onClick={() => setActiveTab('nlp_lab')}
            className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'nlp_lab'
                ? isDark
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Cognitive Taxonomy Analyzer
          </button>

          <button
            onClick={() => setActiveTab('ai_synth')}
            className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'ai_synth'
                ? isDark
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Question Synthesizer
          </button>

          <button
            onClick={() => setActiveTab('composer')}
            className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'composer'
                ? isDark
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Exam Blueprint Composer
          </button>

          {latestPaperId && (
            <>
              <button
                onClick={() => setActiveTab('paper_studio')}
                className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'paper_studio'
                    ? isDark
                      ? 'bg-zinc-800 text-white'
                      : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                Paper Studio & Reviewer
              </button>

              <button
                onClick={() => setActiveTab('print_view')}
                className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'print_view'
                    ? isDark
                      ? 'bg-zinc-800 text-white'
                      : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Printable Exam Sheet
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
