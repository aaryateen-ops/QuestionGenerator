import React, { useState } from 'react';
import { Printer, ArrowLeft, Eye, EyeOff, Settings } from 'lucide-react';
import PaperPdfDownload from './PaperPdfDownload';

function parseOptions(optionsRaw) {
  if (!optionsRaw) return null;
  if (typeof optionsRaw === 'string') {
    try {
      return JSON.parse(optionsRaw);
    } catch {
      return optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return optionsRaw;
}

function RenderPrintableOptions({ options }) {
  const parsed = parseOptions(options);
  if (!parsed) return null;

  if (Array.isArray(parsed)) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-[11px] font-sans">
        {parsed.map((opt, i) => (
          <div key={i} className="leading-snug">
            {typeof opt === 'string' ? opt : JSON.stringify(opt)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof parsed === 'object') {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-[11px] font-sans">
        {Object.entries(parsed).map(([key, val]) => (
          <div key={key} className="leading-snug">
            <strong className="mr-1">({key})</strong>
            <span>{String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function PrintableExamView({ paper, onBack, theme, institutionConfig, onOpenInstitutionModal }) {
  const isDark = theme === 'dark';
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  if (!paper) {
    return (
      <div className="p-12 text-center text-zinc-500">
        No paper selected for printing.
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Collect all MCQs for faculty answer key appendix
  const allQuestions = (paper.sections || []).flatMap((s) => s.questions || []);
  const mcqQuestions = allQuestions.filter((q) => q.question_type === 'MCQ' || q.correct_answer);

  return (
    <div className="space-y-6">
      {/* Action Toolbar (Hidden in Print) */}
      <div className={`no-print border rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      }`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
            isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Paper Studio
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Configure Exam Header Button */}
          {onOpenInstitutionModal && (
            <button
              onClick={onOpenInstitutionModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors shadow-xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
              }`}
              title="Configure Institution Name and Examination Header"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Configure Header</span>
            </button>
          )}

          {/* Answer Key Toggle */}
          <button
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors shadow-sm ${
              showAnswerKey
                ? isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
            }`}
            title="Toggle between Student Exam Sheet and Faculty Evaluation Key"
          >
            {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAnswerKey ? 'Faculty Key Active' : 'Student View (No Key)'}
          </button>

          <PaperPdfDownload paper={paper}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-colors shadow-sm ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`} />

          <button
            onClick={handlePrint}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-colors ${
              isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-bold' : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Exam Paper Container */}
      <div className="exam-sheet bg-white text-black p-8 sm:p-12 rounded-xl shadow-xl max-w-4xl mx-auto border border-zinc-300 font-serif leading-normal">
        {/* Candidate Roll Number Block */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
          <div>
            <span className="text-xs font-bold font-sans tracking-wider uppercase block">
              Question Paper Code:
            </span>
            <span className="text-sm font-mono font-bold">{paper.paper_code}</span>
            {showAnswerKey && (
              <span className="inline-block mt-1 text-[10px] font-sans font-bold px-2 py-0.5 bg-black text-white uppercase tracking-wider">
                CONFIDENTIAL • FACULTY EVALUATION KEY
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-bold font-sans tracking-wider uppercase block mb-1">
              Candidate Register / Hall Ticket No:
            </span>
            <div className="inline-flex border border-black font-mono">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-6 h-6 border-r border-black last:border-r-0 flex items-center justify-center text-xs font-bold" />
              ))}
            </div>
          </div>
        </div>

        {/* Institution & Examination Header */}
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-base font-bold tracking-wide uppercase font-serif text-black">
            {institutionConfig?.institutionName ? institutionConfig.institutionName.toUpperCase() : 'SHADAN COLLEGE OF ENGINEERING & TECHNOLOGY'}
          </h2>
          {institutionConfig?.affiliation && (
            <p className="text-[11px] font-sans font-medium text-zinc-700 uppercase tracking-wide">
              {institutionConfig.affiliation}
            </p>
          )}
          {institutionConfig?.accreditation && (
            <p className="text-[10px] font-sans text-zinc-600 font-medium tracking-wide">
              {institutionConfig.accreditation}
            </p>
          )}
          {institutionConfig?.collegeCode && (
            <p className="text-[9.5px] font-mono font-bold tracking-wider text-zinc-600 uppercase">
              [{institutionConfig.collegeCode}]
            </p>
          )}
          <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-800 pt-1">
            {institutionConfig?.department || paper.department?.toUpperCase() || 'DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING'}
          </h3>
          <p className="text-xs font-bold tracking-wider uppercase mt-1">
            {institutionConfig?.examSession || `${paper.semester_label?.toUpperCase()} END SEMESTER EXAMINATIONS • ${paper.academic_year}`}
          </p>
          <div className="pt-2 text-sm font-bold border-t border-dotted border-black/40 mt-2">
            <span>{paper.subject_code} - {paper.subject_name?.toUpperCase()}</span>
            <span className="text-xs font-normal block font-sans text-zinc-700 mt-0.5">
              (Regulations: {institutionConfig?.regulation || paper.regulation || 'Autonomous - CBCS'})
            </span>
          </div>
        </div>

        {/* Exam Duration & Max Marks Bar */}
        <div className="flex justify-between items-center text-xs font-bold border-y-2 border-black py-2 mb-4 font-sans">
          <span>TIME: {Math.floor(paper.duration_minutes / 60)} HOURS ({paper.duration_minutes} MINS)</span>
          <span>MAXIMUM MARKS: {paper.total_marks}</span>
        </div>

        {/* General Instructions */}
        <div className="text-[11px] font-sans bg-zinc-50 border border-zinc-300 p-2.5 rounded mb-6 space-y-0.5">
          <strong className="block uppercase text-[10px] tracking-wider text-zinc-700">General Instructions:</strong>
          <p>1. Answer <strong>ALL</strong> questions in PART - A.</p>
          <p>2. Answer <strong>EITHER (a) OR (b)</strong> from each question in PART - B (if applicable).</p>
          <p>3. Bloom's Taxonomy Cognitive Levels: <strong>L1-Remember, L2-Understand, L3-Apply, L4-Analyze, L5-Evaluate, L6-Create</strong>.</p>
        </div>

        {/* Sections and Questions Table */}
        <div className="space-y-6">
          {paper.sections?.map((section, sIdx) => (
            <div key={sIdx} className="space-y-2">
              <div className="text-center font-bold text-xs uppercase tracking-wider py-1 border-b border-black">
                {section.name} — {section.description}
              </div>

              <table className="exam-table w-full text-left text-xs border border-black border-collapse">
                <thead>
                  <tr className="bg-zinc-100 font-sans text-[11px] font-bold border-b border-black">
                    <th className="p-2 border border-black w-14 text-center">Q.No</th>
                    <th className="p-2 border border-black">Question Description</th>
                    <th className="p-2 border border-black w-12 text-center">CO</th>
                    <th className="p-2 border border-black w-12 text-center">BL</th>
                    <th className="p-2 border border-black w-14 text-center">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {section.questions.map((q, qIdx) => {
                    const isEitherOrSecond = q.choice_option === 'B';
                    const isMCQ = q.question_type === 'MCQ' || Boolean(q.options);

                    return (
                      <React.Fragment key={qIdx}>
                        {isEitherOrSecond && (
                          <tr className="bg-zinc-50 border-t border-b border-black">
                            <td colSpan={5} className="py-1 text-center font-bold font-sans text-[11px] tracking-widest text-zinc-800">
                              (OR)
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-black/40">
                          <td className="p-2 border border-black text-center font-mono font-bold align-top">
                            {q.q_number}
                          </td>
                          <td className="p-2 border border-black text-xs align-top leading-relaxed">
                            <div>{q.question_text}</div>

                            {/* Render MCQ Choices */}
                            {isMCQ && q.options && (
                              <RenderPrintableOptions options={q.options} />
                            )}

                            {/* Faculty Answer Key Annotation */}
                            {showAnswerKey && q.correct_answer && (
                              <div className="mt-2 text-[10px] font-mono font-bold text-zinc-900 bg-zinc-100 border border-zinc-400 px-2 py-0.5 inline-block rounded">
                                [Evaluation Key: Option ({q.correct_answer})]
                              </div>
                            )}
                          </td>
                          <td className="p-2 border border-black text-center font-mono font-bold align-top">
                            {q.co_code}
                          </td>
                          <td className="p-2 border border-black text-center font-mono font-bold align-top">
                            {q.bloom_level}
                          </td>
                          <td className="p-2 border border-black text-center font-mono font-bold align-top">
                            {q.marks}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Faculty Answer Key Summary Appendix (Printed only when key is active) */}
        {showAnswerKey && mcqQuestions.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-black font-sans">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2">
              Faculty Answer Key & Scoring Guide (Confidential)
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-xs">
              {mcqQuestions.map((q) => (
                <div key={q.question_id} className="border border-zinc-400 p-1.5 text-center">
                  <span className="font-mono font-bold block text-[11px]">Q.{q.q_number}</span>
                  <span className="font-mono font-bold text-black text-xs">
                    Key: {q.correct_answer || 'N/A'}
                  </span>
                  <span className="text-[10px] text-zinc-600 block">({q.bloom_level})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification & BoS Approval Footer */}
        <div className="mt-12 pt-8 border-t border-black flex justify-between items-end text-xs font-sans">
          <div className="text-center">
            <div className="w-36 border-b border-black mb-1" />
            <span className="font-bold">Course Coordinator / Faculty</span>
          </div>

          <div className="text-center">
            <div className="w-36 border-b border-black mb-1" />
            <span className="font-bold">Head of Department (HOD)</span>
          </div>

          <div className="text-center">
            <div className="w-36 border-b border-black mb-1" />
            <span className="font-bold">Controller of Examinations (COE)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
