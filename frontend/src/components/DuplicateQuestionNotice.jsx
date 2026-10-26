import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function DuplicateQuestionNotice({ subjectId, text, excludeId, active }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!active || !subjectId || text.trim().length < 12) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await api.checkQuestionDuplicates({ subject_id: subjectId, question_text: text.trim(), exclude_id: excludeId || undefined });
        if (!cancelled) setResult({ text, matches: data.matches || [] });
      } catch {
        if (!cancelled) setResult({ text, error: true });
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [subjectId, text, excludeId, active]);
  if (!active || result?.text !== text) return null;
  if (result.error) return <p role="status" className="text-xs text-zinc-500">Duplicate checking is unavailable. You can continue editing; the repository will check exact duplicates when saving.</p>;
  if (!result.matches.length) return null;
  return <aside role="status" className="border border-amber-500/60 rounded p-3 text-sm space-y-2">
    <p className="font-semibold">{result.matches.some(match => match.exact) ? 'This question already exists in the repository.' : 'Similar questions found in this course.'}</p>
    <p className="text-xs">Compare the wording before saving. Similarity is advisory; exact duplicates cannot be saved.</p>
    <ul className="space-y-2">{result.matches.slice(0, 3).map(match => <li key={match.id} className="text-xs"><strong>#{match.id} · {match.exact ? 'Exact match' : `${Math.round(match.similarity * 100)}% similar`}</strong><p className="mt-1 leading-relaxed line-clamp-3">{match.question_text}</p></li>)}</ul>
  </aside>;
}
