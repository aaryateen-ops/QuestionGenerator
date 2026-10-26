import { useEffect, useRef } from 'react';

export default function useDialogFocus(dialog, enabled, onClose, canClose = true) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!enabled || !dialog.current) return;
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.focus();
    const keyDown = event => {
      if (event.key === 'Escape' && canClose) { event.stopPropagation(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const controls = [...element.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', keyDown);
    return () => { element.removeEventListener('keydown', keyDown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [dialog, enabled, canClose]);
}
