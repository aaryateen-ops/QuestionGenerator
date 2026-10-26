import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { api } from '../api/client';
import MathHighlightedText from './MathHighlightedText';

const statusLabel = status => (status || 'DRAFT').charAt(0) + (status || 'DRAFT').slice(1).toLowerCase();

export default function QuestionReviewPanel({ question, currentUser, theme, onClose, onSaved, questionIds }) {
  const [status, setStatus] = useState(question.review_status || 'DRAFT');
  const [comment, setComment] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const dark = theme === 'dark';
  const admin = String(currentUser?.role || '').toUpperCase() === 'ADMIN';
  let options = null;
  try { options = question.options ? JSON.parse(question.options) : null; } catch { /* Legacy options remain visible in the repository editor. */ }
  const loadHistory = useCallback(async () => {
    setLoading(true); setHistoryError('');
    try { setHistory(questionIds ? [] : await api.getQuestionHistory(question.id)); }
    catch (err) { setHistoryError(err.message || 'Review history is unavailable.'); }
    finally { setLoading(false); }
  }, [question.id, questionIds]);
  useEffect(() => { const timer = setTimeout(loadHistory, 0); return () => clearTimeout(timer); }, [loadHistory]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const save = async nextStatus => {
    if (!comment.trim()) { setSaveError('Add a reviewer comment explaining this decision.'); return; }
    setBusy(true); setSaveError('');
    try {
      const saved = questionIds
        ? await api.batchReviewQuestions(questionIds, { status: nextStatus, comment: comment.trim() })
        : await api.reviewQuestion(question.id, { status: nextStatus, comment: comment.trim() });
      setStatus(questionIds ? nextStatus : saved.review_status); setComment(''); onSaved(); await loadHistory();
    } catch (err) { setSaveError(err.message || 'Review could not be saved. Your comment has been retained.'); }
    finally { setBusy(false); }
  };
  const keyDown = event => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  const button = 'border border-zinc-400 rounded px-3 py-2 text-sm font-medium hover:bg-zinc-500/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2';
  return createPortal(<div className="fixed inset-0 z-[100] bg-black/60 flex justify-end">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="question-review-title" onKeyDown={keyDown} className={`w-full max-w-xl h-full overflow-y-auto border-l p-5 sm:p-7 shadow-xl ${dark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200'}`}>
      <header className="flex items-start justify-between gap-4 mb-5">
        <div><h2 id="question-review-title" className="text-lg font-semibold">Faculty review</h2><p className="text-sm mt-1">{questionIds ? `${questionIds.length} selected questions` : `Question #${question.id}`} · <strong>{statusLabel(status)}</strong></p></div>
        <button disabled={busy} onClick={onClose} aria-label="Close review" className={button}><X size={18} /></button>
      </header>
      <p className={`text-xs text-zinc-500 mb-2 ${questionIds ? 'hidden' : ''}`}>{question.question_type} · {question.marks} marks · {question.bloom_level} · {question.difficulty}</p>
      <div className="text-sm leading-relaxed border-y border-zinc-400/40 py-4">{questionIds ? <p>The same review decision and comment will be recorded for every selected question.</p> : <MathHighlightedText text={question.question_text} isDark={dark} />}</div>
      {!questionIds && question.question_type === 'MCQ' && <div className="mt-3 space-y-2 text-sm">
        {options && Object.entries(options).map(([key, value]) => <div key={key} className="flex gap-2"><strong>{key}.</strong><MathHighlightedText text={value} isDark={dark} /></div>)}
        <p className="font-semibold">Answer key: {question.correct_answer || 'Not supplied — confirm in the question editor before review.'}</p>
      </div>}
      <p className="text-xs mt-4 mb-4">Draft → Reviewed → Approved. Approval is reserved for administrators. Editing a question returns it to draft.</p>
      <label htmlFor="review-comment" className="block text-sm font-semibold">Reviewer comment <span className="font-normal">(required)</span></label>
      <textarea id="review-comment" maxLength={2000} disabled={busy} value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Record corrections, syllabus alignment, or the reason for this decision." className={`mt-2 w-full border rounded p-3 text-sm ${dark ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-zinc-400'}`} />
      {saveError && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mt-2">{saveError}</p>}
      <div className="flex gap-2 flex-wrap mt-3">
        {status !== 'DRAFT' && <button disabled={busy} onClick={() => save('DRAFT')} className={button}>Return to draft</button>}
        {status === 'DRAFT' && <button disabled={busy} onClick={() => save('REVIEWED')} className={button}>Mark reviewed</button>}
        {admin && status === 'REVIEWED' && <button disabled={busy} onClick={() => save('APPROVED')} className={`${button} bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`}>Approve question</button>}
        {busy && <span role="status" className="text-sm self-center">Saving review…</span>}
      </div>
      <h3 className="text-sm font-semibold mt-8 mb-3">Review history</h3>
      {loading ? <p role="status" className="text-sm">Loading review history…</p> : historyError ? <div role="alert" className="text-sm"><p>{historyError}</p><button onClick={loadHistory} className="underline mt-2">Retry history</button></div> : history.length === 0 ? <p className="text-sm text-zinc-500">{questionIds ? 'Open an individual question to see its review history.' : 'No reviews have been recorded for this question.'}</p> : <ol className="divide-y divide-zinc-400/30">{history.map(entry => <li key={entry.id} className="py-3 text-sm">
        <div className="flex justify-between gap-3 flex-wrap"><strong>{statusLabel(entry.from_status)} → {statusLabel(entry.to_status)}</strong><time dateTime={entry.created_at} className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleString()}</time></div>
        <p className="text-xs mt-1 text-zinc-500">{entry.reviewer_name || 'Faculty reviewer'}</p><p className="whitespace-pre-wrap break-words mt-2">{entry.comment}</p>
        {entry.question_text && <details className="mt-2 text-sm"><summary className="cursor-pointer underline underline-offset-2">View saved version</summary><div className="mt-2 leading-relaxed"><MathHighlightedText text={entry.question_text} isDark={dark} /><p className="text-xs mt-2">{entry.marks} marks · {entry.bloom_level}</p></div></details>}
      </li>)}</ol>}
    </section>
  </div>, document.body);
}
