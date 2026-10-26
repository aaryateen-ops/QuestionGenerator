import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import useDialogFocus from '../hooks/useDialogFocus';

export default function SubjectAssignments({ user, theme, onClose }) {
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const dark = theme === 'dark';
  const dialog = useRef(null);
  useDialogFocus(dialog, true, onClose, !loading);
  useEffect(() => {
    Promise.all([api.getSubjects(), api.getUserSubjects(user.id)])
      .then(([courses, ids]) => { setSubjects(courses); setSelected(ids); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.id]);
  const save = async () => {
    setLoading(true); setError('');
    try { await api.setUserSubjects(user.id, selected); onClose(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="assignment-title" className={`w-full max-w-lg border rounded-xl p-6 ${dark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`}>
      <h3 id="assignment-title" className="font-semibold">Course assignments · {user.full_name}</h3>
      <p className="text-sm text-zinc-500 mt-2">Faculty can view and author questions and papers only for assigned courses. Administrators can access every course.</p>
      {error && <p role="alert" className="text-sm text-rose-500 mt-3">{error}</p>}
      <div className="my-4 max-h-72 overflow-y-auto space-y-2">
        {subjects.map(subject => <label key={subject.id} className="flex items-center gap-3 border border-zinc-500/30 rounded-md p-3 text-sm">
          <input type="checkbox" disabled={loading} checked={selected.includes(subject.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, subject.id] : ids.filter(id => id !== subject.id))} />
          <span><strong>{subject.code}</strong> · {subject.name}</span>
        </label>)}
        {!loading && !subjects.length && <p className="text-sm text-zinc-500">Create a course before assigning access.</p>}
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="text-sm border border-zinc-500 rounded-md px-3 py-2">Cancel</button>
        <button onClick={save} disabled={loading} className="text-sm rounded-md px-3 py-2 bg-slate-700 text-white disabled:opacity-50">{loading ? 'Loading…' : 'Save assignments'}</button>
      </div>
    </section>
  </div>;
}
