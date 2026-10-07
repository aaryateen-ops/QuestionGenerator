import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  FileCheck2,
  Database,
  Layers,
  FileText,
  Printer,
  Users,
  BrainCircuit,
  Zap,
  Sun,
  Moon,
  Shield,
  ArrowRight,
  BookOpen,
  X
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  subjects = [],
  activeSubjectId,
  onSelectSubject,
  theme,
  setTheme,
  onOpenAuth,
  onOpenAuthorDrawer,
  onOpenInstitutionModal
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const list = [
      // Navigation
      {
        id: 'nav-dashboard',
        category: 'Navigation',
        title: 'Executive Overview',
        subtitle: 'Course analytics, cognitive balance, and question inventory',
        icon: LayoutDashboard,
        action: () => { onNavigate('dashboard'); onClose(); }
      },
      {
        id: 'nav-composer',
        category: 'Navigation',
        title: 'Exam Blueprint Composer',
        subtitle: '1-Click presets & combinatorial multi-constraint solver',
        icon: FileCheck2,
        action: () => { onNavigate('composer'); onClose(); }
      },
      {
        id: 'nav-questions',
        category: 'Navigation',
        title: 'Question Repository',
        subtitle: 'Question bank, batch operations, and document ingestion',
        icon: Database,
        action: () => { onNavigate('questions'); onClose(); }
      },
      {
        id: 'nav-paper-studio',
        category: 'Navigation',
        title: 'Paper Studio & Reviewer',
        subtitle: 'Interactive verification, substitute swaps, and cognitive radar',
        icon: FileText,
        action: () => { onNavigate('paper_studio'); onClose(); }
      },
      {
        id: 'nav-print',
        category: 'Navigation',
        title: 'Printable Examination Sheet',
        subtitle: 'Autonomous university formatting & direct PDF export',
        icon: Printer,
        action: () => { onNavigate('print_view'); onClose(); }
      },
      {
        id: 'nav-subjects',
        category: 'Navigation',
        title: 'Course & Syllabus Configuration',
        subtitle: 'Syllabus units with topic tags and OBE course outcomes',
        icon: Layers,
        action: () => { onNavigate('subjects'); onClose(); }
      },
      {
        id: 'nav-nlp',
        category: 'Navigation',
        title: 'Cognitive Taxonomy Analyzer',
        subtitle: "Anderson & Krathwohl Bloom's action-verb NLP engine",
        icon: BrainCircuit,
        action: () => { onNavigate('nlp_lab'); onClose(); }
      },
      {
        id: 'nav-users',
        category: 'Navigation',
        title: 'Institutional Faculty & User Management',
        subtitle: 'Manage roles, faculty authorization, and accounts',
        icon: Users,
        action: () => { onNavigate('users'); onClose(); }
      },

      // Quick Actions
      {
        id: 'action-draft-ai',
        category: 'Quick Actions',
        title: 'Draft Questions with AI',
        subtitle: 'Launch in-context drawer to author questions with AI priming',
        icon: Zap,
        action: () => {
          onNavigate('questions');
          if (onOpenAuthorDrawer) onOpenAuthorDrawer('ai');
          onClose();
        }
      },
      {
        id: 'action-add-manual',
        category: 'Quick Actions',
        title: 'Add Manual Question',
        subtitle: 'Create question with live action-verb Bloom detection',
        icon: Database,
        action: () => {
          onNavigate('questions');
          if (onOpenAuthorDrawer) onOpenAuthorDrawer('manual');
          onClose();
        }
      },
      {
        id: 'action-theme-toggle',
        category: 'Quick Actions',
        title: `Switch Theme to ${isDark ? 'Light' : 'Dark'} Mode`,
        subtitle: `Currently active: ${isDark ? 'Dark Zinc Theme' : 'Light Theme'}`,
        icon: isDark ? Sun : Moon,
        action: () => {
          setTheme(isDark ? 'light' : 'dark');
          onClose();
        }
      },
      {
        id: 'action-switch-user',
        category: 'Quick Actions',
        title: 'Switch Institutional Account / Sign In',
        subtitle: 'Dean, Controller of Exams, or Faculty credentials',
        icon: Shield,
        action: () => {
          if (onOpenAuth) onOpenAuth();
          onClose();
        }
      },
      {
        id: 'action-institution-profile',
        category: 'Quick Actions',
        title: 'Configure Institution & Examination Header',
        subtitle: 'Customize university name, department, session, and paper headers',
        icon: BookOpen,
        action: () => {
          if (onOpenInstitutionModal) onOpenInstitutionModal();
          onClose();
        }
      }
    ];

    // Subjects
    subjects.forEach((subj) => {
      list.push({
        id: `subject-${subj.id}`,
        category: 'Course Switcher',
        title: `${subj.code}: ${subj.name}`,
        subtitle: `Semester ${subj.semester} • ${subj.regulation} • ${subj.department}`,
        icon: BookOpen,
        action: () => {
          onSelectSubject(subj.id);
          onClose();
        }
      });
    });

    if (!query.trim()) return list;

    const q = query.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query, subjects, isDark, onNavigate, onSelectSubject, setTheme, onOpenAuth, onOpenAuthorDrawer, onClose]);

  // Handle Keyboard Navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Click outside to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className={`relative z-10 w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Search Input Bar */}
        <div className={`flex items-center px-4 py-3 border-b ${isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'}`}>
          <Search className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, view name, or course code..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm focus:outline-none placeholder-zinc-500 font-medium"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border bg-zinc-800 text-zinc-400 border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-transparent">
          {items.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono">
              No commands or courses matching "{query}"
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? isDark
                        ? 'bg-zinc-800 text-white'
                        : 'bg-zinc-100 text-zinc-950 font-semibold'
                      : isDark
                        ? 'text-zinc-300 hover:bg-zinc-900'
                        : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-md border shrink-0 ${
                        isSelected
                          ? isDark ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-white border-zinc-300 text-zinc-900 shadow-xs'
                          : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{item.title}</span>
                        <span className="text-[10px] uppercase tracking-wider font-mono opacity-60">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-70 truncate max-w-sm">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                      isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className={`px-4 py-2 border-t text-[11px] flex items-center justify-between font-mono ${
          isDark ? 'border-zinc-800 bg-zinc-900/30 text-zinc-500' : 'border-zinc-200 bg-zinc-50 text-zinc-500'
        }`}>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">↵</kbd> select
            </span>
          </div>
          <span>Linear / Geist Command Interface</span>
        </div>
      </div>
    </div>
  );
}
