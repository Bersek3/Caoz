'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Tournament = { id: string; title: string; slug: string; game_name: string; status: string; start_date: string; team_type: string; team_size: number; participant_count: number };
type Participant = { id: string; tournament_id: string; name: string; tag: string; team_id: string | null; checked_in: boolean; registered_at: string; captain_name: string; captain_discord: string; captain_in_game_id: string; username: string | null; full_name: string | null; email: string | null; phone: string | null };

const date = (value: string) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin fecha';

export default function AdminPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') router.replace('/arena');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return;
    const controller = new AbortController();
    fetch('/api/admin/tournaments', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar el panel.'); if (!controller.signal.aborted) { setTournaments(data.tournaments || []); setParticipants(data.participants || []); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el panel.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, user?.role]);

  const visibleParticipants = useMemo(() => participants.filter(participant => {
    if (selectedTournament && participant.tournament_id !== selectedTournament) return false;
    const query = search.trim().toLocaleLowerCase();
    return !query || [participant.name, participant.username, participant.full_name, participant.email, participant.captain_name].some(value => value?.toLocaleLowerCase().includes(query));
  }), [participants, selectedTournament, search]);
  const selected = tournaments.find(tournament => tournament.id === selectedTournament);

  if (isLoading || user?.role !== 'admin') return <main className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-300">Verificando acceso…</main>;

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 text-white sm:px-6">
    <header className="rounded-3xl border border-purple-500/30 bg-[#1c1417] p-6 shadow-2xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">Solo administración</p>
      <h1 className="mt-2 text-3xl font-black">Panel de torneos y participantes</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Consulta los inscritos y sus correos de contacto para comunicar cambios operativos. Usa estos datos únicamente para la gestión del torneo.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/profile" className="arena-secondary-button">Gestión de torneos</Link><Link href="/arena/pagos" className="arena-secondary-button">Pagos</Link></div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    {loading ? <p role="status" className="py-12 text-center text-slate-300">Cargando participantes…</p> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-wider text-slate-400">Torneos</p><p className="mt-2 text-3xl font-black">{tournaments.length}</p></article>
        <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-wider text-slate-400">Inscripciones</p><p className="mt-2 text-3xl font-black">{participants.length}</p></article>
        <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-wider text-slate-400">Check-in confirmado</p><p className="mt-2 text-3xl font-black text-emerald-300">{participants.filter(item => item.checked_in).length}</p></article>
        <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-wider text-slate-400">Con correo</p><p className="mt-2 text-3xl font-black text-cyan-300">{participants.filter(item => item.email).length}</p></article>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-700 bg-[#191213] p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row"><label className="flex flex-1 flex-col gap-1 text-sm text-slate-300">Torneo<select value={selectedTournament} onChange={event => setSelectedTournament(event.target.value)} className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-white"><option value="">Todos los torneos</option>{tournaments.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.title} · {tournament.participant_count} inscritos</option>)}</select></label><label className="flex flex-1 flex-col gap-1 text-sm text-slate-300">Buscar participante<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, usuario o correo" className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-white" /></label></div>
        {selected && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-950/20 p-4"><div><p className="font-bold text-white">{selected.title}</p><p className="text-xs text-slate-300">{selected.game_name} · {selected.participant_count} inscritos · {date(selected.start_date)}</p></div><Link href={`/tournament/${selected.slug}`} className="text-sm text-red-300 underline">Abrir torneo</Link></div>}
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Participantes y contactos de torneos</caption><thead className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-3">Participante</th><th className="p-3">Torneo</th><th className="p-3">Contacto</th><th className="p-3">Equipo / datos</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr></thead><tbody>{visibleParticipants.map(participant => { const tournament = tournaments.find(item => item.id === participant.tournament_id); const recipient = participant.email ? `mailto:${encodeURIComponent(participant.email)}?subject=${encodeURIComponent(`Información sobre ${tournament?.title || 'tu torneo'} · CZ Arena`)}` : ''; return <tr key={participant.id} className="border-b border-slate-800 align-top"><td className="p-3"><p className="font-semibold text-white">{participant.name}</p><p className="text-xs text-slate-400">@{participant.username || 'sin usuario'}{participant.full_name ? ` · ${participant.full_name}` : ''}</p></td><td className="p-3"><p>{tournament?.title || 'Torneo eliminado'}</p><p className="text-xs text-slate-400">{tournament?.game_name}</p></td><td className="p-3">{participant.email ? <><a href={`mailto:${participant.email}`} className="text-cyan-300 underline">{participant.email}</a>{participant.phone && <p className="mt-1 text-xs text-slate-400">{participant.phone}</p>}</> : <span className="text-slate-500">Sin correo</span>}</td><td className="p-3"><p>{participant.team_id ? 'Inscripción de equipo' : 'Individual'}</p><p className="text-xs text-slate-400">Capitán: {participant.captain_name || '—'}</p></td><td className="p-3"><span className={participant.checked_in ? 'text-emerald-300' : 'text-amber-300'}>{participant.checked_in ? 'Check-in confirmado' : 'Check-in pendiente'}</span><p className="mt-1 text-xs text-slate-500">{date(participant.registered_at)}</p></td><td className="p-3">{recipient ? <a href={recipient} className="inline-flex rounded-lg border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-400/20">Enviar correo</a> : <span className="text-xs text-slate-500">No disponible</span>}</td></tr>; })}</tbody></table></div>
        {!visibleParticipants.length && <p className="py-10 text-center text-sm text-slate-400">No hay participantes para este filtro.</p>}
      </section>
    </>}
  </main>;
}
