import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import NLPInspectorView from './components/NLPInspectorView';
import AISynthesizerView from './components/AISynthesizerView';
import QuestionBankView from './components/QuestionBankView';
import ExamComposerView from './components/ExamComposerView';
import PaperStudioView from './components/PaperStudioView';
import PrintableExamView from './components/PrintableExamView';
import SubjectManagerView from './components/SubjectManagerView';
import UserManagementView from './components/UserManagementView';
import AuthModal from './components/AuthModal';
import CommandPalette from './components/CommandPalette';
import InstitutionSettingsModal, { DEFAULT_INSTITUTION_CONFIG } from './components/InstitutionSettingsModal';
import { ToastProvider, useToast } from './components/Toast';
import { api } from './api/client';
import {
  AlertCircle,
  RefreshCw,
  FileText,
  Menu,
  X,
  BookOpen,
  Shield,
  User,
  ArrowRightLeft,
  Search,
  Sun,
  Moon,
  CheckCircle2,
  SlidersHorizontal,
  Building2
} from 'lucide-react';

const TAB_TITLES = {
  dashboard: { title: 'Executive Overview', subtitle: 'Course analytics, cognitive balance, and question inventory' },
  subjects: { title: 'Course & Syllabus Configuration', subtitle: 'Manage academic courses, syllabus units with topic tags, and OBE course outcomes' },
  questions: { title: 'Question Repository', subtitle: 'Question bank, batch operations, action verb tags, and document ingestion' },
  nlp_lab: { title: 'Cognitive Taxonomy Analyzer', subtitle: "Anderson & Krathwohl Bloom's action-verb NLP engine" },
  ai_synth: { title: 'Question Synthesizer', subtitle: 'Generative AI assessment authoring and numerical synthesis' },
  composer: { title: 'Exam Blueprint Composer', subtitle: '1-Click presets & combinatorial multi-constraint exam paper solver' },
  paper_studio: { title: 'Paper Studio & Reviewer', subtitle: 'Interactive verification, substitute swap, and distribution metrics' },
  print_view: { title: 'Printable Examination Sheet', subtitle: 'Autonomous university formatting & direct PDF export' },
  users: { title: 'Institutional Faculty & User Management', subtitle: 'Manage academic roles, faculty authorization, and account credentials' },
};

function MainAppContent() {
  const { showToast } = useToast();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('qp_theme') || 'dark';
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const accountGeneration = useRef(0);
  const subjectGeneration = useRef(0);

  const [institutionConfig, setInstitutionConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('qp_institution_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.institutionName || parsed.institutionName === 'Autonomous Institute of Technology') {
          return DEFAULT_INSTITUTION_CONFIG;
        }
        return { ...DEFAULT_INSTITUTION_CONFIG, ...parsed };
      }
      return DEFAULT_INSTITUTION_CONFIG;
    } catch {
      return DEFAULT_INSTITUTION_CONFIG;
    }
  });

  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subjects, setSubjects] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [subjectDetail, setSubjectDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [currentPaper, setCurrentPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSaveInstitutionConfig = (newConfig) => {
    setInstitutionConfig(newConfig);
    localStorage.setItem('qp_institution_config', JSON.stringify(newConfig));
  };

  useEffect(() => {
    document.title = `${institutionConfig.institutionName} | ${institutionConfig.coeTitle || 'Examination Studio'}`;
  }, [institutionConfig]);

  useEffect(() => {
    localStorage.setItem('qp_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    initApp();
  }, []);

  const clearAccountContext = () => {
    sessionStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_api_key');
    accountGeneration.current += 1;
    subjectGeneration.current += 1;
    setSubjects([]);
    setActiveSubjectId(null);
    setSubjectDetail(null);
    setStats(null);
    setCurrentPaper(null);
    setActiveTab('dashboard');
  };

  const initApp = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const config = await api.getRuntimeConfig();
      setDemoMode(Boolean(config.demo_mode));
      if (localStorage.getItem('qp_token')) {
        try {
          const profile = await api.getMe();
          setCurrentUser(profile);
          localStorage.setItem('qp_user', JSON.stringify(profile));
          await loadInitialData();
        } catch {
          localStorage.removeItem('qp_token');
          localStorage.removeItem('qp_user');
          setCurrentUser(null);
          clearAccountContext();
          setIsAuthModalOpen(true);
        }
      } else {
        setIsAuthModalOpen(true);
      }
    } catch (err) {
      setConnectionError('Unable to connect to the Examination Engine backend. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Reload subject details and stats when active subject changes
  useEffect(() => {
    if (activeSubjectId) {
      loadSubjectContext(activeSubjectId);
    }
  }, [activeSubjectId]);

  const loadInitialData = async () => {
    const generation = accountGeneration.current;
    setConnectionError(null);
    try {
      const subs = await api.getSubjects();
      if (generation !== accountGeneration.current) return;
      setSubjects(subs);
      if (subs && subs.length > 0) {
        setActiveSubjectId(subs[0].id);
      }
    } catch (err) {
      console.error('Failed to load subjects:', err);
      setConnectionError(
        'Unable to connect to the Examination Engine backend (http://127.0.0.1:8000). Please ensure the backend server is running.'
      );
    }
  };

  const loadSubjectContext = async (subjectId) => {
    const generation = ++subjectGeneration.current;
    const account = accountGeneration.current;
    setSubjectDetail(null); setStats(null); setCurrentPaper(null);
    try {
      const [detail, repoStats, papers] = await Promise.all([
        api.getSubjectDetail(subjectId),
        api.getRepositoryStats(subjectId),
        api.listPapers(),
      ]);
      if (generation !== subjectGeneration.current || account !== accountGeneration.current) return;
      setSubjectDetail(detail);
      setStats(repoStats);

      const subjectPapers = papers?.filter(paper => paper.subject_id === subjectId || paper.subject_code === detail.code);
      if (subjectPapers?.length > 0) {
        const latest = await api.getPaper(subjectPapers[0].id);
        if (generation !== subjectGeneration.current || account !== accountGeneration.current) return;
        setCurrentPaper(latest);
      }
    } catch (err) {
      console.error('Failed to load subject context:', err);
    }
  };

  const handlePaperGenerated = (newPaper) => {
    setCurrentPaper(newPaper);
    setActiveTab('paper_studio');
    showToast(`Exam Paper #${newPaper.id} successfully solved and generated!`, 'success');
    if (activeSubjectId) {
      api.getRepositoryStats(activeSubjectId).then(setStats);
    }
  };

  const handlePaperUpdated = (updatedPaper) => {
    setCurrentPaper(updatedPaper);
    showToast('Paper modifications saved', 'info');
  };

  const handleQuestionChange = () => {
    if (activeSubjectId) {
      api.getRepositoryStats(activeSubjectId).then(setStats);
      api.getSubjectDetail(activeSubjectId).then(setSubjectDetail);
    }
  };

  const isDark = theme === 'dark';
  const activeSubject = (subjects || []).find((s) => s.id === activeSubjectId);
  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'Assessment Platform', subtitle: '' };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center space-y-3 font-sans transition-colors ${
          isDark ? 'bg-zinc-950 text-zinc-400' : 'bg-zinc-50 text-zinc-600'
        }`}
      >
        <div
          className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? 'border-zinc-400' : 'border-zinc-800'
          }`}
        />
        <p className="text-xs font-mono">Initializing Examination Repository & Blueprint Engine...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex font-sans transition-colors ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
      }`}
    >
      {/* Desktop Left Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenInstitutionModal={() => setIsInstitutionModalOpen(true)}
          institutionConfig={institutionConfig}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
          subjects={subjects}
          activeSubjectId={activeSubjectId}
          setActiveSubjectId={setActiveSubjectId}
          latestPaperId={currentPaper?.id}
          theme={theme}
          setTheme={setTheme}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50">
            <Sidebar
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenCommandPalette={() => {
                setMobileSidebarOpen(false);
                setIsCommandPaletteOpen(true);
              }}
              onOpenInstitutionModal={() => {
                setMobileSidebarOpen(false);
                setIsInstitutionModalOpen(true);
              }}
              institutionConfig={institutionConfig}
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
              }}
              subjects={subjects}
              activeSubjectId={activeSubjectId}
              setActiveSubjectId={setActiveSubjectId}
              latestPaperId={currentPaper?.id}
              theme={theme}
              setTheme={setTheme}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Minimal Enterprise Topbar */}
        <header
          className={`no-print border-b px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-20 transition-colors ${
            isDark
              ? 'bg-zinc-950/90 backdrop-blur border-zinc-800 text-zinc-100'
              : 'bg-white/90 backdrop-blur border-zinc-200 text-zinc-900 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className={`p-1.5 rounded-md border lg:hidden ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
              }`}
            >
              {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider hidden sm:inline">
                  Examination Platform /
                </span>
                <h2 className="text-xs font-bold tracking-tight">{currentTabInfo.title}</h2>
              </div>
              <p className="text-[11px] text-zinc-500 hidden md:block">{currentTabInfo.subtitle}</p>
            </div>
          </div>

          {/* Topbar Center: Quick Command Palette Trigger */}
          <div className="flex items-center gap-2">
            {demoMode && <span className="hidden lg:inline text-xs border border-amber-500/60 rounded px-2 py-1">Local demo</span>}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-normal text-[11px] hidden sm:inline">Search or jump to...</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono rounded border bg-zinc-800 text-zinc-400 border-zinc-700">
                Ctrl K
              </kbd>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-1.5 rounded-md border transition-colors ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:text-zinc-950'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* User Session Chip */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
              }`}
              title="Click to switch account or sign in"
            >
              <div className="flex items-center gap-1.5">
                {currentUser?.role === 'ADMIN' ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="font-semibold hidden lg:inline">{currentUser?.full_name || 'Sign In'}</span>
              </div>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                currentUser?.role === 'ADMIN'
                  ? isDark ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : isDark ? 'bg-sky-950/80 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-300'
              }`}>
                {currentUser?.role || 'FACULTY'}
              </span>
            </button>

            {/* Primary Action Button */}
            {activeTab !== 'composer' && (
              <button
                onClick={() => setActiveTab('composer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors ${
                  isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-bold' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compose</span>
              </button>
            )}
          </div>
        </header>

        {/* Backend Connection Error Alert Banner */}
        {connectionError && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <div
              className={`p-4 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                isDark
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{connectionError}</span>
              </div>
              <button
                onClick={loadInitialData}
                className="flex items-center gap-1 px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded font-medium text-xs transition-colors shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* View Routing */}
        <main key={currentUser?.id || "signed-out"} className="p-4 sm:px-6 lg:px-8 flex-1">
          {!currentUser && <p className="text-sm text-zinc-500">Sign in to access your assigned courses.</p>}
          {currentUser && subjects.length === 0 && <div className={`border rounded-lg p-5 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
            <h3 className="text-base font-semibold">{currentUser.role === 'ADMIN' ? 'Add your first course' : 'No courses assigned yet'}</h3>
            <p className="text-sm mt-2">{currentUser.role === 'ADMIN' ? 'Configure a course, syllabus units and outcomes to begin building the repository.' : 'Ask an administrator to assign your courses under Faculty & Users. Your account is active.'}</p>
            {currentUser.role === 'ADMIN' && <button className="mt-3 text-sm underline" onClick={() => setActiveTab('subjects')}>Configure courses</button>}
          </div>}
          {currentUser && <>
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              subjectDetail={subjectDetail}
              onNavigate={setActiveTab}
              onQuickGenerate={handlePaperGenerated}
              theme={theme}
              institutionConfig={institutionConfig}
              onOpenInstitutionModal={() => setIsInstitutionModalOpen(true)}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectManagerView
              subjects={subjects}
              activeSubjectId={activeSubjectId}
              setActiveSubjectId={setActiveSubjectId}
              onSelectSubject={setActiveSubjectId}
              onSubjectsUpdated={loadInitialData}
              theme={theme}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              currentUser={currentUser}
              theme={theme}
            />
          )}

          {activeTab === 'nlp_lab' && (
            <NLPInspectorView
              subjectId={activeSubjectId}
              subjectDetail={subjectDetail}
              onQuestionAdded={handleQuestionChange}
              theme={theme}
            />
          )}

          {activeTab === 'ai_synth' && (
            <AISynthesizerView
              subjectId={activeSubjectId}
              subjectDetail={subjectDetail}
              onQuestionsAdded={handleQuestionChange}
              theme={theme}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionBankView
              currentUser={currentUser}
              subjectId={activeSubjectId}
              subjectDetail={subjectDetail}
              onUpdate={handleQuestionChange}
              theme={theme}
            />
          )}

          {activeTab === 'composer' && (
            <ExamComposerView
              subjectId={activeSubjectId}
              subjectDetail={subjectDetail}
              onPaperGenerated={handlePaperGenerated}
              theme={theme}
            />
          )}

          {activeTab === 'paper_studio' && (
            <PaperStudioView
              paper={currentPaper}
              onPaperUpdated={handlePaperUpdated}
              onNavigateToPrint={() => setActiveTab('print_view')}
              theme={theme}
            />
          )}

          {activeTab === 'print_view' && (
            <PrintableExamView
              paper={currentPaper}
              onBack={() => setActiveTab('paper_studio')}
              theme={theme}
              institutionConfig={institutionConfig}
              onOpenInstitutionModal={() => setIsInstitutionModalOpen(true)}
            />
          )}
          </>}
        </main>

        <footer
          className={`no-print border-t py-4 text-center text-xs font-mono transition-colors ${
            isDark
              ? 'border-zinc-900 bg-zinc-950/90 text-zinc-500'
              : 'border-zinc-200 bg-white/90 text-zinc-600'
          }`}
        >
          Autonomous Question Paper Generation & Management Platform • Outcome-Based Education (OBE) & Bloom's Taxonomy Framework
        </footer>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        subjects={subjects}
        activeSubjectId={activeSubjectId}
        onSelectSubject={setActiveSubjectId}
        theme={theme}
        setTheme={setTheme}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenInstitutionModal={() => setIsInstitutionModalOpen(true)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        demoMode={demoMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          clearAccountContext();
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          loadInitialData();
          showToast(`Signed in as ${user.full_name}`, 'success');
        }}
        theme={theme}
        canClose={Boolean(currentUser)}
      />

      {/* Institution Settings Modal */}
      <InstitutionSettingsModal
        isOpen={isInstitutionModalOpen}
        onClose={() => setIsInstitutionModalOpen(false)}
        config={institutionConfig}
        onSaveConfig={handleSaveInstitutionConfig}
        theme={theme}
      />
    </div>
  );
}

export default function App() {
  const [theme] = useState(() => localStorage.getItem('qp_theme') || 'dark');
  return (
    <ToastProvider theme={theme}>
      <MainAppContent />
    </ToastProvider>
  );
}
