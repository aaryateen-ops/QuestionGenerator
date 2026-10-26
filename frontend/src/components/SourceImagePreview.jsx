import React, { useEffect, useRef, useState } from 'react';

export default function SourceImagePreview({ file, theme }) {
  const image = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!file) return null;
  return <figure className={`border rounded-md p-3 space-y-2 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-zinc-50 border-zinc-300'}`}>
    <figcaption className="flex justify-between items-center gap-3 text-xs font-semibold"><span>Source photo</span><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="underline underline-offset-2">{expanded ? 'Fit photo' : 'Enlarge photo'}</button></figcaption>
    {failed && <p className="text-xs">This browser cannot preview the source photo. Use the capture controls to upload a JPEG for comparison.</p>}
    <div className={`overflow-auto ${expanded ? 'max-h-[65vh]' : 'max-h-80'}`}><img ref={image} onLoad={() => setFailed(false)} onError={() => setFailed(true)} alt="Original physical copy for checking transcribed questions and formulas" className={failed ? 'hidden' : expanded ? 'max-w-none w-[150%]' : 'w-full max-h-80 object-contain'} /></div>
    <p className="text-xs break-all">{file.name} · Compare wording, mathematical notation, and answer options before saving.</p>
  </figure>;
}
