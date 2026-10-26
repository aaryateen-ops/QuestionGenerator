import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({ theme, title, description, error, busy, onCancel, onConfirm }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const keyDown = event => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onCancel(); }
    if (event.key === 'Tab') {
      const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
      const next = buttons[(buttons.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length];
      event.preventDefault(); next?.focus();
    }
  };
  return createPortal(<div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
    <section ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={keyDown} className={`max-w-md w-full border rounded-lg p-5 shadow-xl ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
      <h2 id={titleId} className="font-semibold text-lg">{title}</h2>
      <p id={descriptionId} className="text-sm mt-2 mb-5">{description}</p>
      {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}
      <div className="flex justify-end gap-2">
        <button disabled={busy} onClick={onCancel} className="border border-zinc-400 px-3 py-2 rounded text-sm disabled:opacity-50">Cancel</button>
        <button disabled={busy} onClick={onConfirm} className="bg-red-700 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-red-800 disabled:opacity-50">{busy ? 'Deleting…' : 'Delete permanently'}</button>
      </div>
    </section>
  </div>, document.body);
}
