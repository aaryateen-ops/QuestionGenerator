import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../api/client';

export default function PaperPdfDownload({ paper, className }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const download = async () => {
    setBusy(true); setError('');
    try { await api.downloadPaperPdf(paper.id, paper.paper_code); }
    catch (err) { setError(err.message || 'Unable to download PDF. Please retry.'); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-col gap-1 max-w-sm">
    <button type="button" disabled={busy} aria-busy={busy} onClick={download} className={`${className} disabled:opacity-50`}><Download className="w-3.5 h-3.5" />{busy ? 'Downloading PDF…' : 'Download PDF'}</button>
    {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}
