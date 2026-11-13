'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from '@/components/icons';

type Dialog = { message: string; confirmation: boolean; resolve: (value: boolean) => void };
const queue: Dialog[] = [];
let refresh: (() => void) | undefined;
function enqueue(message: string, confirmation: boolean) {
  return new Promise<boolean>(resolve => {
    queue.push({ message, confirmation, resolve });
    refresh?.();
  });
}
export const showAlert = (message: string) => enqueue(message, false);
export const showConfirm = (message: string) => enqueue(message, true);

export function StyledDialog() {
  const [dialog, setDialog] = useState<Dialog>();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    refresh = () => setDialog(queue[0]);
    refresh();
    return () => { refresh = undefined; };
  }, []);
  const close = (accepted: boolean) => {
    queue.shift()?.resolve(accepted);
    refresh?.();
  };
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [dialog]);
  if (!dialog) return null;
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message"
      onKeyDown={e => {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Tab') {
          const buttons = panel.current?.querySelectorAll('button');
          if (!buttons?.length) return;
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }} className="w-full max-w-md rounded-2xl border border-red-400/30 bg-[#1b1417] p-6 shadow-2xl">
      <div className="mb-4 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <h2 id="dialog-title" className="flex-1 font-bold text-white">{dialog.confirmation ? 'Confirmar acción' : 'CAOZ Arena'}</h2>
        <button aria-label="Cerrar" onClick={() => close(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={18} /></button>
      </div>
      <p id="dialog-message" className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{dialog.message}</p>
      <div className="mt-6 flex justify-end gap-3">
        {dialog.confirmation && <button onClick={() => close(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancelar</button>}
        <button onClick={() => close(true)} className="rounded-xl bg-red-400 px-5 py-2 text-sm font-bold text-black hover:bg-red-300">{dialog.confirmation ? 'Confirmar' : 'Entendido'}</button>
      </div>
    </div>
  </div>;
}
