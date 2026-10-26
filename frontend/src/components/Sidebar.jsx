import React from 'react';
import {
  BookOpen,
  Layers,
  Search,
  Cpu,
  FileText,
  Printer,
  Shield,
  User,
  Sun,
  Moon,
  Database,
  Sliders,
  CheckCircle2,
  Building2,
  Settings,
  Users,
  LogOut,
  ArrowRightLeft
} from 'lucide-react';

export default function Sidebar({
  currentUser,
  onOpenAuthModal,
  onOpenCommandPalette,
  onOpenInstitutionModal,
  institutionConfig,
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
  const isAdmin = currentUser?.role === 'ADMIN';

  const navCategories = [
    {
      title: 'CORE PLATFORM',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Layers, desc: 'Analytics & OBE metrics' },
        { id: 'subjects', label: 'Course & Syllabus', icon: BookOpen, desc: 'Manage courses, units & COs' },
        { id: 'questions', label: 'Question Repository', icon: Database, desc: 'Question bank & bulk upload' },
        ...(isAdmin
          ? [{ id: 'users', label: 'Faculty & Users', icon: Users, desc: 'Manage institutional accounts' }]
          : []),
      ],
    },
    {
      title: 'TAXONOMY & INTELLIGENCE',
      items: [
        { id: 'nlp_lab', label: 'Cognitive Analyzer', icon: Search, desc: "Bloom's action-verb NLP" },
        { id: 'ai_synth', label: 'Question Synthesizer', icon: Cpu, desc: 'Dynamic generative synthesis' },
      ],
    },
    {
      title: 'EXAM CREATION',
      items: [
        { id: 'composer', label: 'Blueprint Composer', icon: Sliders, desc: 'Multi-constraint paper solver' },
        ...(latestPaperId
          ? [
              { id: 'paper_studio', label: 'Paper Studio', icon: FileText, desc: 'Review & question swap' },
              { id: 'print_view', label: 'Printable Sheet', icon: Printer, desc: 'University exam sheet & PDF' },
            ]
          : []),
      ],
    },
  ];

  const activeSubject = (subjects || []).find((s) => s.id === activeSubjectId);

  // User initials
  const initials = (currentUser?.full_name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside
      className={`no-print w-64 md:w-72 shrink-0 border-r flex flex-col justify-between h-screen sticky top-0 transition-colors z-30 ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      }`}
    >
      {/* Top Branding & Institution */}
      <div className="p-4 border-b border-inherit space-y-4">
        <div
          onClick={onOpenInstitutionModal}
          className={`flex items-center gap-3 ${onOpenInstitutionModal ? 'cursor-pointer group' : ''}`}
          title={institutionConfig?.institutionName ? `${institutionConfig.institutionName} • Click to edit institution` : 'Configure Institution Profile'}
        >
          <img
            src="/logo.svg"
            alt="Platform Logo"
            className="w-9 h-9 rounded-lg object-contain shrink-0 shadow-xs select-none transition-transform group-hover:scale-105"
          />
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {institutionConfig?.systemBrand || 'CoE Examination Studio'}
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono truncate" title={institutionConfig?.institutionName || 'Shadan College of Engineering & Technology'}>
              {institutionConfig?.institutionName || 'Shadan College of Engineering & Technology'}
            </p>
          </div>
        </div>

        {/* Active Course Selector Card */}
        <div className={`p-2.5 rounded-lg border space-y-1.5 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              Active Course
            </span>
            {activeSubject && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {activeSubject.code}
              </span>
            )}
          </div>

          <select
            value={activeSubjectId || ''}
            onChange={(e) => setActiveSubjectId(Number(e.target.value))}
            className={`w-full text-xs font-semibold rounded p-1.5 border truncate focus:outline-none transition-colors ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-blue-600'
                : 'bg-white border-zinc-300 text-zinc-800 focus:border-blue-500'
            }`}
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code} - {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
            isDark
              ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
          }`}
          title="Press Ctrl+K to open"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-medium">Command Menu</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono rounded border bg-zinc-800 text-zinc-300 border-zinc-700">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {navCategories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <span className="px-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">
              {cat.title}
            </span>
            <div className="space-y-0.5 pt-1">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-start px-3 py-2 rounded-md text-xs font-medium text-left group outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 select-none border border-transparent transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-zinc-800 text-zinc-100 font-semibold'
                          : 'bg-zinc-100 text-zinc-900 font-semibold'
                        : isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? isDark ? 'text-zinc-100' : 'text-zinc-900'
                            : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="truncate block leading-tight">{item.label}</span>
                        <span className={`text-[10px] truncate block leading-tight font-normal ${
                          isActive ? 'text-zinc-400 dark:text-zinc-400' : 'text-zinc-500'
                        }`}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Area: User Session Profile & Theme Mode */}
      <div className="p-3 border-t border-inherit space-y-2">
        {/* User Session Profile Card */}
        <div className={`p-2.5 rounded-lg border space-y-2 transition-colors ${
          isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
              currentUser?.role === 'ADMIN'
                ? isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : isDark ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-100 text-sky-800 border border-sky-300'
            }`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold truncate block">
                  {currentUser?.full_name || 'Sign in required'}
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                  currentUser?.role === 'ADMIN'
                    ? isDark ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : isDark ? 'bg-sky-950/80 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-300'
                }`}>
                  {currentUser?.role || 'GUEST'}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono truncate block">
                {currentUser?.email || 'No active session'}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenAuthModal}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium transition-colors ${
              isDark
                ? 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-950'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3 text-zinc-400" />
            Switch User / Sign In
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              : 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <span className="flex items-center gap-2">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            <span>Interface Mode</span>
          </span>
          <span className="text-[10px] font-mono uppercase text-zinc-500">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>
      </div>
    </aside>
  );
}
