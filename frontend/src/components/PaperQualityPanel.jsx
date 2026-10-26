import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function PaperQualityPanel({ paperId, theme }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api.getPaperQuality(paperId).then(data => { if (active) setState({ data }); })
      .catch(error => { if (active) setState({ error: error.message }); });
    return () => { active = false; };
  }, [paperId, retry]);
  const dark = theme === 'dark';
  return <section className={`border rounded-lg p-4 space-y-2 ${dark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`} aria-label="Paper quality checks">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">Paper quality checks</h3>
      <button type="button" onClick={() => setRetry(value => value + 1)} className="text-xs underline underline-offset-4">Refresh checks</button>
    </div>
    {state.loading && <p role="status" className="text-sm">Checking marks and repository approval…</p>}
    {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    {state.data && <>
      <p className="text-sm">{state.data.computed_marks} answerable marks · {state.data.approved_count}/{state.data.question_count} questions currently approved</p>
      {state.data.warnings.length ? <div><ul className="list-disc pl-5 text-sm space-y-1">{state.data.warnings.slice(0, 5).map(warning => <li key={warning}>{warning}</li>)}</ul>
        {state.data.warnings.length > 5 && <details className="mt-2 text-sm"><summary className="cursor-pointer">Show {state.data.warnings.length - 5} additional checks</summary><ul className="list-disc pl-5 mt-2 space-y-1">{state.data.warnings.slice(5).map(warning => <li key={warning}>{warning}</li>)}</ul></details>}</div>
        : <p className="text-sm text-emerald-700 dark:text-emerald-400">Marks, choice groups, and repository approval checks passed.</p>}
      <p className={`text-xs ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>These checks compare the saved paper with its repository. Faculty must verify answers and syllabus suitability.</p>
    </>}
  </section>;
}
