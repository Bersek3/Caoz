'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Tournament } from '@/types/tournament';

type Announcement = { id: string; senderName: string; message: string; timestamp: string };

export function BattleRoyaleAnnouncements({ tournament }: { tournament: Tournament }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Announcement[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'admin';
  const registered = tournament.participants.some(participant => participant.userId === user?.id || participant.roster.some(member => member.userId === user?.id));

  useEffect(() => {
    if (!token || (!isAdmin && !registered)) return;
    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/tournaments/${tournament.id}/announcements`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!cancelled && response.ok) setMessages(data.messages || []);
      if (!cancelled && !response.ok) setError(data.error || 'No se pudieron cargar los anuncios.');
    };
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isAdmin, registered, token, tournament.id]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !token) return;
    setError('');
    const response = await fetch(`/api/tournaments/${tournament.id}/announcements`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message: draft }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'No se pudo publicar el anuncio.'); return; }
    setMessages(previous => [data.message, ...previous]); setDraft('');
  }

  if (!isAdmin && !registered) return null;
  return <section className="space-y-4 rounded-2xl border border-red-400/30 bg-red-950/10 p-4 sm:p-6">
    <div><h2 className="text-lg font-bold text-white">Canal general Battle Royale</h2><p className="mt-1 text-sm text-slate-300">Anuncios oficiales, instrucciones y códigos de sala para todos los inscritos.</p></div>
    <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-black/20 p-3">{messages.length ? messages.map(message => <article key={message.id} className="rounded-lg bg-slate-950/80 p-3"><div className="flex justify-between gap-3 text-xs"><strong className="text-red-300">{message.senderName}</strong><span className="text-slate-500">{message.timestamp}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{message.message}</p></article>) : <p className="py-5 text-center text-sm text-slate-400">Aún no hay anuncios del staff.</p>}</div>
    {isAdmin && <form onSubmit={send} className="space-y-2"><label className="block text-sm font-semibold text-white">Enviar anuncio a todos<textarea required maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ej.: Código de sala: 1234-5678-9012 · Contraseña: CAOZ" className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label><button className="rounded-xl bg-red-400 px-4 py-2 text-sm font-bold text-black hover:bg-red-300">Publicar anuncio</button></form>}
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
  </section>;
}
