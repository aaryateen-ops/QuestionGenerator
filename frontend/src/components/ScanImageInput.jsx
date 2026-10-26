import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import CameraCaptureModal from './CameraCaptureModal';
import { checkScanFile } from '../utils/scanImage';

export default function ScanImageInput({ file, onChange, theme, disabled = false }) {
  const [capture, setCapture] = useState(false);
  const [pending, setPending] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [error, setError] = useState('');
  const previewImage = useRef(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (previewImage.current) previewImage.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const review = selected => {
    try { checkScanFile(selected); setPending(selected); setCapture(true); setError(''); }
    catch (err) { setError(err.message); }
  };
  return <div className="space-y-3">
    <div className="border border-dashed border-zinc-400 rounded-md p-4 space-y-3"
      onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!disabled) review(event.dataTransfer.files[0]); }}>
      <button type="button" disabled={disabled} onClick={() => { setPending(null); setCapture(true); }}
        className="border border-zinc-400 rounded px-3 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-zinc-500/10 focus-visible:outline-2">
        <Camera size={16} className="inline mr-2" />Capture or upload photo
      </button>
      <p className="text-xs">Or drop a JPEG, PNG, WebP, or HEIC here. Maximum size: under 10 MB.</p>
      {file && <div className="flex gap-3 items-center">
        <button type="button" disabled={disabled} aria-label="Review selected photo" onClick={() => review(file)} className="shrink-0 rounded border border-zinc-400 focus-visible:outline-2 disabled:opacity-50">{previewFailed && <span className="w-20 h-20 flex items-center justify-center text-xs">Photo preview unavailable</span>}<img ref={previewImage} onLoad={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} alt="Selected physical copy" className={`w-20 h-20 object-contain rounded ${previewFailed ? 'hidden' : ''}`} /></button>
        <div className="min-w-0"><p className="text-xs break-all">{file.name}</p><p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB · Ready for extraction</p><button type="button" disabled={disabled} onClick={() => review(file)} className="text-xs underline mt-1">Review or rotate photo</button></div>
        <button type="button" disabled={disabled} className="text-xs underline" onClick={() => onChange(null)}>Remove</button>
      </div>}
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {capture && <CameraCaptureModal initialFile={pending} theme={theme} onClose={() => setCapture(false)}
      onConfirm={photo => { onChange(photo); setCapture(false); }} />}
  </div>;
}
