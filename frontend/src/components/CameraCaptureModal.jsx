import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RotateCw, X } from 'lucide-react';
import { checkScanFile, SCAN_IMAGE_ACCEPT } from '../utils/scanImage';

export default function CameraCaptureModal({ onClose, onConfirm, initialFile = null, theme }) {
  const [file, setFile] = useState(initialFile);
  const [rotation, setRotation] = useState(0);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const video = useRef(null);
  const reviewImage = useRef(null);
  const dialog = useRef(null);
  const mounted = useRef(true);
  const streamRef = useRef(null);
  const dark = theme === 'dark';
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
  };

  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      mounted.current = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (reviewImage.current) reviewImage.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream]);

  const choose = selected => {
    try {
      checkScanFile(selected);
      stopCamera();
      setFile(selected);
      setPreviewFailed(false);
      setRotation(0);
      setError('');
    } catch (err) { setError(err.message); }
  };

  const startCamera = async () => {
    setBusy(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS and a supported browser. Use Upload photo below.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stopCamera();
      streamRef.current = media;
      setStream(media);
      setFile(null);
    } catch (err) {
      if (mounted.current) setError(err.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access or upload a photo.'
        : err.message || 'Camera unavailable. Upload a photo instead.');
    } finally { if (mounted.current) setBusy(false); }
  };

  const snap = () => {
    const source = video.current;
    if (!source?.videoWidth) { setError('The camera is still starting. Try again in a moment.'); return; }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(source.videoWidth, source.videoHeight));
    canvas.width = Math.round(source.videoWidth * scale);
    canvas.height = Math.round(source.videoHeight * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (mounted.current && blob) choose(new File([blob], 'physical-copy.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      checkScanFile(file);
      let output = file;
      if (previewFailed && !file.type && /\.hei[cf]$/i.test(file.name)) {
        output = new File([file], file.name, { type: /\.heif$/i.test(file.name) ? 'image/heif' : 'image/heic' });
      }
      if (!previewFailed) {
        const image = new Image();
        image.src = reviewImage.current.src;
        await image.decode();
        const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.round(image.naturalWidth * scale);
        const height = Math.round(image.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = rotation % 180 ? height : width;
        canvas.height = rotation % 180 ? width : height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate(rotation * Math.PI / 180);
        context.drawImage(image, -width / 2, -height / 2, width, height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) throw new Error('Unable to prepare this photo. Please choose another image.');
        output = new File([blob], 'physical-copy.jpg', { type: 'image/jpeg' });
      }
      checkScanFile(output);
      if (mounted.current) await onConfirm(output);
    } catch (err) { if (mounted.current) setError(err.message || 'Unable to prepare photo.'); }
    finally { if (mounted.current) setBusy(false); }
  };

  const keyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  const button = 'px-3 py-2 rounded border border-zinc-400 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 hover:bg-zinc-500/10';

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={event => event.stopPropagation()}>
      <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="capture-title" onKeyDown={keyDown}
        className={`w-full max-w-xl max-h-[90vh] overflow-auto rounded-lg border p-5 space-y-4 shadow-xl ${dark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        <header className="flex items-center justify-between gap-4">
          <h2 id="capture-title" className="text-lg font-semibold">Scan physical copy</h2>
          <button type="button" className={button} onClick={onClose} aria-label="Close camera"><X size={18} /></button>
        </header>
        <p className="text-sm">Keep the full question in frame. Use even lighting and check that every formula is readable.</p>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {stream && <video ref={video} autoPlay playsInline muted className="w-full max-h-80 bg-black rounded object-contain" />}
        {file && <div className="min-h-48 flex items-center justify-center overflow-hidden bg-zinc-100 rounded p-4">
          {!previewFailed ? <img ref={reviewImage} alt="Physical copy for review" onError={() => setPreviewFailed(true)}
            className="max-h-72 max-w-full object-contain" style={{ transform: `rotate(${rotation}deg)` }} />
            : <p className="text-sm text-zinc-800">This browser cannot preview this image. You can submit the original HEIC photo or choose a JPEG for review.</p>}
        </div>}
        <div className="flex gap-2 flex-wrap">
          {!file && <button type="button" disabled={busy} className={button} onClick={startCamera}><Camera size={16} className="inline mr-2" />Open camera</button>}
          {stream && <button type="button" disabled={busy} className={button} onClick={snap}>Snap photo</button>}
          <label className={`${button} cursor-pointer`}>Upload photo
            <input aria-label="Upload photo" type="file" accept={SCAN_IMAGE_ACCEPT} capture="environment" className="block w-full text-xs mt-2 max-w-60"
              disabled={busy} onChange={event => { const selected = event.target.files?.[0]; if (selected) choose(selected); event.target.value = ''; }} />
          </label>
          {file && <>
            <button type="button" disabled={busy} className={button} onClick={() => { setFile(null); setRotation(0); setError(''); }}>Retake</button>
            <button type="button" disabled={busy || previewFailed} className={button} onClick={() => setRotation(value => (value + 90) % 360)}><RotateCw size={16} className="inline mr-1" />Rotate 90°</button>
            <button type="button" disabled={busy} className={`${button} bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`} onClick={confirm}>{busy ? 'Preparing photo…' : 'Confirm photo'}</button>
          </>}
        </div>
      </section>
    </div>, document.body);
}
