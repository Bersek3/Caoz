'use client';

import { useState } from 'react';

export function FlowOrder({ order, showLabel = true }: { order?: string | null; showLabel?: boolean }) {
  const [feedback, setFeedback] = useState('');
  async function copy() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order);
      setFeedback('Orden copiada');
    } catch {
      setFeedback('Selecciona el número para copiarlo manualmente.');
    }
  }
  return <div className="space-y-1 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      {showLabel && <span className="text-slate-400">Orden Flow:</span>}
      {order ? <><span className="select-all break-all font-mono text-white">{order}</span><button type="button" onClick={copy} aria-label={'Copiar orden Flow '+order} className="text-xs text-red-300 underline">Copiar</button></> : <span className="text-slate-400">No disponible</span>}
    </div>
    {feedback && <p role="status" className="text-xs text-slate-300">{feedback}</p>}
  </div>;
}
