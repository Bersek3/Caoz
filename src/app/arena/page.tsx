'use client';

import { Suspense, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowRight, Calendar, CheckCircle2, Gamepad2, Heart, RefreshCw, Search, Star, Trophy, Users, X } from '@/components/icons';
import { useTournament } from '@/context/TournamentContext';
import { useAuth } from '@/context/AuthContext';
import { Tournament, TournamentStatus } from '@/types/tournament';
import { CreateTournamentModal } from '@/components/CreateTournamentModal';
import { OfficialGamesEditor } from '@/components/OfficialGamesEditor';
import { formatTournamentDate } from '@/lib/dateUtils';
import { findMyRegistration, formatTournamentFormat, formatTournamentMode, getFeaturedTournament, getTournamentAction, sortTournaments } from '@/lib/tournamentPresentation';

const PAGE_SIZE = 9;
const filterKeys = ['q', 'game', 'status', 'format', 'entry', 'mode', 'region', 'view', 'page'];
const statusLabels: Record<TournamentStatus, string> = { registration_open: 'Inscripciones abiertas', check_in: 'Confirmación de asistencia', in_progress: 'En juego', completed: 'Finalizado' };
const favoritesEvent = 'caoz-favorites-updated';

function subscribeFavorites(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(favoritesEvent, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(favoritesEvent, listener); };
}

function isPaid(t: Tournament) {
  return Number(t.entryFeeAmount) > 0 || !/^(gratis|free|free to play|0)$/i.test(t.entryFee.trim());
}

function StatusBadge({ tournament }: { tournament: Tournament }) {
  const colors = { registration_open: 'border-emerald-400/30 bg-emerald-950/90 text-emerald-300', check_in: 'border-amber-400/30 bg-amber-950/90 text-amber-300', in_progress: 'border-rose-400/30 bg-rose-950/90 text-rose-300', completed: 'border-slate-600 bg-slate-900/90 text-slate-300' };
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${colors[tournament.status]}`}>
    {tournament.status === 'in_progress' && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 beacon-dot" />}
    {statusLabels[tournament.status]}
  </span>;
}

function LoadingCards() {
  return <div role="status" aria-label="Cargando torneos" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {[0, 1, 2].map(i => <div key={i} aria-hidden="true" className="animate-pulse overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="h-52 bg-slate-800 sm:h-56" /><div className="space-y-4 p-5 sm:p-6"><div className="h-5 w-3/4 rounded bg-slate-800" /><div className="h-16 rounded bg-slate-800" /><div className="h-10 rounded bg-slate-800" /></div></div>)}
    <span className="sr-only">Cargando torneos…</span>
  </div>;
}

function TournamentDirectory() {
  const { tournaments, games, isLoading, error, lastUpdated, refreshTournaments } = useTournament();
  const { user, token, openAuthModal } = useAuth();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pinning, setPinning] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');
  const isAdmin = user?.role === 'admin';
  const favoritesKey = `caoz_favorite_tournaments_${user?.id || 'guest'}`;
  const favoriteSnapshot = useSyncExternalStore(subscribeFavorites, () => {
    try { return localStorage.getItem(favoritesKey) || '[]'; } catch { return '[]'; }
  }, () => '[]');
  let favorites: string[] = [];
  try { const saved: unknown = JSON.parse(favoriteSnapshot); if (Array.isArray(saved)) favorites = saved.filter((id): id is string => typeof id === 'string'); } catch { /* Ignore invalid browser preferences. */ }

  const selectedGame = params.get('game') || 'all';
  const selectedStatus = params.get('status') || 'active';
  const selectedFormat = params.get('format') || 'all';
  const selectedEntry = params.get('entry') || 'all';
  const selectedMode = params.get('mode') || 'all';
  const selectedRegion = params.get('region') || 'all';
  const requestedView = params.get('view') || 'all';
  const selectedView = requestedView === 'mine' && !user ? 'all' : requestedView;
  const searchQuery = params.get('q') || '';
  const query = searchQuery.trim().toLocaleLowerCase('es');

  function updateFilters(patch: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params.toString());
    next.delete('page');
    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === 'all' && key !== 'status' || value === 'active' && key === 'status') next.delete(key);
      else next.set(key, value);
    });
    const url = `${pathname}${next.size ? `?${next}` : ''}${window.location.hash}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }

  function clearFilters() {
    const next = new URLSearchParams(params.toString());
    filterKeys.forEach(key => next.delete(key));
    window.history.pushState(null, '', `${pathname}${next.size ? `?${next}` : ''}#torneos`);
  }

  function toggleFavorite(id: string) {
    setFavoriteError('');
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id]));
      window.dispatchEvent(new Event(favoritesEvent));
    } catch { setFavoriteError('No se pudo guardar el favorito en este navegador.'); }
  }

  async function toggleFeatured(t: Tournament) {
    setPinning(t.id); setPinError('');
    try {
      const response = await fetch(`/api/tournaments/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ isFeatured: !t.isFeatured }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el destacado.');
      await refreshTournaments({ silent: true });
    } catch (cause) { setPinError(cause instanceof Error ? cause.message : 'No se pudo actualizar el destacado.'); }
    finally { setPinning(null); }
  }

  const visible = sortTournaments(tournaments.filter(t => !t.isHidden || isAdmin));
  const mine = visible.filter(t => findMyRegistration(t, user));
  const nextTournament = mine.filter(t => t.status !== 'completed').sort((a, b) => {
    const priority = (t: Tournament) => ({ check_in: 0, match: 1, registered: 2, register: 3, full: 4, view: 5, results: 6 })[getTournamentAction(t, user).kind];
    return priority(a) - priority(b);
  })[0];
  const nextAction = nextTournament ? getTournamentAction(nextTournament, user) : null;
  const featured = getFeaturedTournament(visible.filter(t => !t.isHidden));
  const featuredAction = featured ? getTournamentAction(featured, user) : null;
  const viewTournaments = visible.filter(t => selectedView === 'mine' ? !!findMyRegistration(t, user) : selectedView === 'favorites' ? favorites.includes(t.id) : true);
  const matchesStatus = (t: Tournament) => selectedStatus === 'all' || selectedStatus === 'active' ? selectedStatus === 'all' || t.status !== 'completed' : t.status === selectedStatus;
  const searchedTournaments = viewTournaments.filter(t => (selectedFormat === 'all' || t.format === selectedFormat)
    && (selectedEntry === 'all' || (selectedEntry === 'paid' ? isPaid(t) : !isPaid(t)))
    && (selectedMode === 'all' || t.teamType === selectedMode)
    && (selectedRegion === 'all' || t.region === selectedRegion)
    && (!query || [t.title, t.gameName, t.organizer.name].some(text => text.toLocaleLowerCase('es').includes(query))));
  const statusTournaments = searchedTournaments.filter(t => selectedGame === 'all' || t.gameId === selectedGame);
  const filtered = statusTournaments.filter(matchesStatus);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(params.get('page') || 1);
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const availableFormats = [...new Set(visible.map(t => t.format))];
  const filterTags = [
    { key: 'q', value: searchQuery.trim(), label: `Búsqueda: ${searchQuery.trim()}` },
    { key: 'game', value: selectedGame === 'all' ? '' : selectedGame, label: games.find(game => game.id === selectedGame)?.name || selectedGame },
    { key: 'entry', value: selectedEntry === 'all' ? '' : selectedEntry, label: selectedEntry === 'paid' ? 'De pago' : 'Gratis' },
    { key: 'mode', value: selectedMode === 'all' ? '' : selectedMode, label: selectedMode === 'solo' ? 'Individual' : 'Equipos' },
    { key: 'region', value: selectedRegion === 'all' ? '' : selectedRegion, label: selectedRegion },
    { key: 'format', value: selectedFormat === 'all' ? '' : selectedFormat, label: formatTournamentFormat(selectedFormat) },
  ].filter(tag => tag.value);
  const hasFilters = searchQuery.trim() || selectedGame !== 'all' || selectedStatus !== 'active' || selectedFormat !== 'all' || selectedEntry !== 'all' || selectedMode !== 'all' || selectedRegion !== 'all' || selectedView !== 'all';
  const tabs = [
    ['active', 'Activos', statusTournaments.filter(t => t.status !== 'completed').length],
    ['registration_open', 'Inscripciones', statusTournaments.filter(t => t.status === 'registration_open').length],
    ['check_in', 'Check-in', statusTournaments.filter(t => t.status === 'check_in').length],
    ['in_progress', 'En juego', statusTournaments.filter(t => t.status === 'in_progress').length],
    ['completed', 'Historial', statusTournaments.filter(t => t.status === 'completed').length],
    ['all', 'Todos', statusTournaments.length],
  ] as const;

  return <div className="arena-directory min-h-screen">
    <section className="arena-directory-hero border-b border-slate-800">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-8">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-300"><Gamepad2 className="h-4 w-4" />CZ Arena · Torneos oficiales</p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Tu próxima competencia<br className="hidden sm:block" /> empieza aquí.</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">Encuentra tu juego, asegura tu cupo y sigue cada partida en un solo lugar.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isAdmin ? <button onClick={() => setIsCreateOpen(true)} className="arena-primary-button"><Trophy className="h-4 w-4" />Crear torneo</button>
              : !user && <button onClick={() => openAuthModal('register')} className="arena-primary-button"><Users className="h-4 w-4" />Crear mi cuenta</button>}
            <a href="#torneos" className="arena-secondary-button">Explorar torneos<ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
        {featured && featuredAction && <article className="overflow-hidden rounded-2xl border border-red-400/25 bg-slate-900/70">
          <div className="flex gap-4 p-4 sm:p-5">
            <img src={featured.bannerUrl} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-32 sm:w-32" />
            <div className="min-w-0 flex-1">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-300"><Star className="h-3.5 w-3.5" />Destacado · {featured.gameName}</p>
              <h2 className="line-clamp-2 text-base font-bold text-white sm:text-lg">{featured.title}</h2>
              <p className="mt-1 text-sm font-semibold text-amber-300">{featured.prizePool}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{formatTournamentDate(featured.startDate)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 sm:px-5"><StatusBadge tournament={featured} /><Link href={featuredAction.href} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-red-300 hover:text-white">{featuredAction.label}<ArrowRight className="h-4 w-4" /></Link></div>
        </article>}
      </div>
    </section>

    <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      {user && <section aria-labelledby="my-tournaments-heading" className="mb-6 rounded-2xl border border-red-400/25 bg-red-950/15 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0"><h2 id="my-tournaments-heading" className="flex items-center gap-2 text-sm font-bold text-white"><Users className="h-4 w-4 text-red-300" />Mis torneos <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{mine.filter(t => t.status !== 'completed').length} activos</span></h2>
            {nextTournament ? <><p className="mt-2 font-semibold text-slate-100">{nextTournament.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-300">{formatTournamentDate(nextTournament.startDate)}</p></> : <p className="mt-2 text-sm text-slate-300">{isLoading ? 'Buscando tus inscripciones…' : 'Tus próximas inscripciones y partidas aparecerán aquí.'}</p>}
          </div>
          <div className="flex flex-wrap gap-2">{nextAction && <Link href={nextAction.href} className="arena-primary-button">{nextAction.label}<ArrowRight className="h-4 w-4" /></Link>}<button onClick={() => updateFilters({ view: 'mine', status: 'all' })} className="arena-secondary-button">Ver mis torneos</button></div>
        </div>
      </section>}

      <section id="torneos" aria-labelledby="directory-heading" className="scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><h2 id="directory-heading" className="text-2xl font-black text-white">Encuentra tu torneo</h2><p className="mt-1 text-sm text-slate-400">Inscripciones, partidas en curso y resultados de la comunidad.</p></div>
          <div className="flex items-center gap-2 text-xs text-slate-400">{lastUpdated && <span className="hidden sm:inline">Actualizado {new Date(lastUpdated).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}<button disabled={isLoading} onClick={() => void refreshTournaments()} className="arena-secondary-button" aria-label="Actualizar torneos"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /><span>Actualizar</span></button></div>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Vista de torneos">
          <button aria-pressed={selectedView === 'all'} onClick={() => updateFilters({ view: 'all' })} className={`arena-filter-button ${selectedView === 'all' ? 'is-selected' : ''}`}>Explorar</button>
          {user && <button aria-pressed={selectedView === 'mine'} onClick={() => updateFilters({ view: 'mine' })} className={`arena-filter-button ${selectedView === 'mine' ? 'is-selected' : ''}`}><Users className="h-4 w-4" />Mis torneos ({mine.length})</button>}
          <button aria-pressed={selectedView === 'favorites'} onClick={() => updateFilters({ view: 'favorites' })} className={`arena-filter-button ${selectedView === 'favorites' ? 'is-selected' : ''}`}><Heart className="h-4 w-4" />Favoritos ({visible.filter(t => favorites.includes(t.id)).length})</button>
        </div>

        <OfficialGamesEditor><div className="mb-6 space-y-4" aria-label="Filtrar por videojuego">
          <button onClick={() => updateFilters({ game: 'all' })} aria-pressed={selectedGame === 'all'} className={`arena-filter-button ${selectedGame === 'all' ? 'is-selected' : ''}`}><Gamepad2 className="h-4 w-4" />Todos los juegos</button>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {games.map(game => {
              const count = searchedTournaments.filter(t => matchesStatus(t) && t.gameId === game.id).length;
              return <button key={game.id} data-official-game-id={game.id} onClick={() => updateFilters({ game: selectedGame === game.id ? 'all' : game.id })} aria-pressed={selectedGame === game.id} className={`group min-w-0 overflow-hidden rounded-2xl border text-left transition-colors ${selectedGame === game.id ? 'border-red-400 bg-red-950/40 ring-1 ring-red-400/30' : 'border-slate-700 bg-slate-900/80 hover:border-red-400/60'}`}>
              <div className="h-28 overflow-hidden sm:h-32"><img src={game.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>
              <div className="space-y-2 p-3 sm:p-4"><span className="block break-words text-base font-bold text-white">{game.name}</span><span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs"><span className="text-slate-400">{game.genre}</span><span className="font-semibold text-red-300">{count} {count === 1 ? 'torneo' : 'torneos'}</span></span></div>
            </button>;})}
          </div>
        </div></OfficialGamesEditor>

        <div className="mb-5 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
          <label className="relative block"><span className="sr-only">Buscar torneo, juego u organizador</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input type="search" value={searchQuery} onChange={event => updateFilters({ q: event.target.value }, true)} placeholder="Buscar torneo, juego u organizador…" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400" /></label>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Estado del torneo">{tabs.map(([value, label, count]) => <button key={value} aria-pressed={selectedStatus === value} onClick={() => updateFilters({ status: value })} className={`arena-filter-button shrink-0 ${selectedStatus === value ? 'is-selected' : ''}`}>{label}<span className="text-xs opacity-70">{count}</span></button>)}</div>
          <details><summary className="w-fit cursor-pointer rounded-lg py-1 text-sm font-semibold text-slate-300">Más filtros{[selectedFormat, selectedEntry, selectedMode, selectedRegion].filter(value => value !== 'all').length > 0 && ' · activos'}</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-300">Entrada<select value={selectedEntry} onChange={event => updateFilters({ entry: event.target.value })} className="arena-select"><option value="all">Gratis y de pago</option><option value="free">Gratis</option><option value="paid">De pago</option></select></label>
              <label className="text-xs font-semibold text-slate-300">Modalidad<select value={selectedMode} onChange={event => updateFilters({ mode: event.target.value })} className="arena-select"><option value="all">Individual y equipos</option><option value="solo">Individual</option><option value="team">Equipos</option></select></label>
              <label className="text-xs font-semibold text-slate-300">Región<select value={selectedRegion} onChange={event => updateFilters({ region: event.target.value })} className="arena-select"><option value="all">Todas las regiones</option>{['LATAM', 'NA', 'EU', 'GLOBAL'].map(region => <option key={region} value={region}>{region === 'GLOBAL' ? 'Global' : region}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-300">Formato<select value={selectedFormat} onChange={event => updateFilters({ format: event.target.value })} className="arena-select"><option value="all">Todos los formatos</option>{availableFormats.map(format => <option key={format} value={format}>{formatTournamentFormat(format)}</option>)}</select></label>
            </div>
          </details>
          {filterTags.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Filtros activos">{filterTags.map(tag => <button key={tag.key} onClick={() => updateFilters({ [tag.key]: tag.key === 'q' ? '' : 'all' })} aria-label={`Quitar filtro: ${tag.label}`} className="flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-red-400/25 bg-red-950/20 px-3 text-xs text-red-200"><span className="truncate">{tag.label}</span><X className="h-3.5 w-3.5 shrink-0" /></button>)}</div>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"><p role="status" aria-live="polite" className="text-sm text-slate-300">{isLoading && !tournaments.length ? 'Cargando torneos…' : `${filtered.length} ${filtered.length === 1 ? 'torneo encontrado' : 'torneos encontrados'}`}</p>{hasFilters && <button onClick={clearFilters} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-red-300 hover:bg-white/5"><X className="h-4 w-4" />Limpiar filtros</button>}</div>
        </div>

        {(pinError || favoriteError) && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-sm text-rose-200">{pinError || favoriteError}</p>}
        {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-950/30 p-4 text-sm text-amber-100"><p>{error}{visible.length > 0 && ' Se muestra la última información disponible.'}</p><button onClick={() => void refreshTournaments()} disabled={isLoading} className="arena-secondary-button">Reintentar</button></div>}

        {isLoading && !tournaments.length ? <LoadingCards /> : !error || visible.length > 0 ? filtered.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-12 text-center"><Trophy className="mx-auto mb-3 h-10 w-10 text-slate-500" /><h3 className="text-lg font-bold text-white">{selectedView === 'mine' ? 'Aquí estarán tus torneos' : selectedView === 'favorites' ? 'Guarda tus próximos desafíos' : hasFilters ? 'No encontramos torneos con estos filtros' : 'Pronto habrá nuevas competencias'}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">{selectedView === 'mine' ? 'Inscríbete en un torneo para seguir tu asistencia, partidas y resultados.' : selectedView === 'favorites' ? 'Toca el corazón de un torneo para guardarlo en este navegador.' : hasFilters ? 'Prueba otro juego, estado o búsqueda, o restablece el catálogo.' : visible.some(t => t.status === 'completed') ? 'Puedes revisar el historial mientras se anuncian los próximos torneos.' : 'Publicaremos aquí fechas, premios y cupos para la comunidad.'}</p><div className="mt-5 flex flex-wrap justify-center gap-2">{hasFilters && <button onClick={clearFilters} className="arena-secondary-button">Ver torneos activos</button>}{!hasFilters && visible.some(t => t.status === 'completed') && <button onClick={() => updateFilters({ status: 'completed' })} className="arena-secondary-button">Ver historial</button>}{isAdmin && !hasFilters && <button onClick={() => setIsCreateOpen(true)} className="arena-primary-button">Crear torneo</button>}</div></div> : <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map(t => {
              const action = getTournamentAction(t, user);
              const registration = findMyRegistration(t, user);
              const remaining = Math.max(0, t.maxParticipants - t.participants.length);
              return <article key={t.id} className="glass-card group flex min-w-0 flex-col overflow-hidden rounded-2xl">
                <div className="relative h-52 overflow-hidden sm:h-56"><img src={t.bannerUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" /><div className="absolute left-3 top-3"><StatusBadge tournament={t} /></div><button aria-label={`${favorites.includes(t.id) ? 'Quitar de' : 'Guardar en'} favoritos: ${t.title}`} aria-pressed={favorites.includes(t.id)} onClick={() => toggleFavorite(t.id)} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:bg-red-950"><Heart className={`h-5 w-5 ${favorites.includes(t.id) ? 'fill-red-400 text-red-400' : ''}`} /></button><div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3"><span className="text-sm font-bold text-white">{t.gameName}</span><span className="text-right text-base font-bold text-amber-300">{t.prizePool}</span></div></div>
                <div className="flex flex-1 flex-col p-5 sm:p-6"><div className="mb-3 flex flex-wrap gap-2">{t.isHidden && <span className="rounded bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">Oculto · admin</span>}{t.isFeatured && <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300"><Star className="h-3 w-3" />Destacado</span>}{registration && <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />{registration.checkedIn ? 'Asistencia confirmada' : 'Estás inscrito'}</span>}</div>
                  <h3 className="text-lg font-bold leading-snug text-white sm:text-xl"><Link href={`/tournament/${t.slug}`} className="hover:text-red-300">{t.title}</Link></h3><p className="mt-1 text-xs text-slate-400">Organiza {t.organizer.name}</p>
                  <dl className="my-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm"><div><dt className="mb-1 text-xs text-slate-400">Modalidad</dt><dd className="font-semibold text-slate-100">{formatTournamentMode(t)}</dd></div><div><dt className="mb-1 text-xs text-slate-400">Entrada</dt><dd className="font-semibold text-emerald-300">{t.entryFee}</dd></div><div><dt className="mb-1 text-xs text-slate-400">Formato</dt><dd className="text-slate-200">{formatTournamentFormat(t.format)}</dd></div><div><dt className="mb-1 text-xs text-slate-400">Región</dt><dd className="text-slate-200">{t.region}</dd></div></dl>
                  <p className="mb-4 flex items-start gap-2 text-sm leading-relaxed text-slate-300"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-red-300" /><span>{formatTournamentDate(t.startDate)}</span></p>
                  <div className="mt-auto"><div className="mb-2 flex justify-between gap-2 text-xs"><span className="text-slate-300">{t.participants.length} / {t.maxParticipants} {t.teamType === 'team' ? 'equipos' : 'jugadores'}</span><span className={`font-semibold ${remaining === 0 ? 'text-amber-300' : 'text-slate-300'}`}>{t.status === 'completed' ? 'Finalizado' : remaining === 0 ? 'Cupos completos' : `${remaining} cupos libres`}</span></div><div role="progressbar" aria-label={`Cupos de ${t.title}`} aria-valuemin={0} aria-valuemax={t.maxParticipants} aria-valuenow={t.participants.length} className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-red-400" style={{ width: `${t.maxParticipants > 0 ? Math.min(100, t.participants.length / t.maxParticipants * 100) : 0}%` }} /></div><Link href={action.href} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${['register', 'check_in', 'match'].includes(action.kind) ? 'bg-red-400 text-black hover:bg-red-300' : 'border border-slate-700 bg-slate-800 text-white hover:border-red-400'}`}>{action.label}<ArrowRight className="h-4 w-4" /></Link></div>
                  {isAdmin && !t.isHidden && t.status !== 'completed' && <button disabled={pinning !== null} onClick={() => void toggleFeatured(t)} className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"><Star className={`h-3.5 w-3.5 ${t.isFeatured ? 'fill-red-300 text-red-300' : ''}`} />{pinning === t.id ? 'Guardando…' : t.isFeatured ? 'Quitar destacado' : 'Destacar en portada'}</button>}
                </div>
              </article>;
            })}
          </div>
          {totalPages > 1 && <nav aria-label="Páginas de torneos" className="mt-7 flex flex-wrap items-center justify-center gap-3"><button disabled={page === 1} onClick={() => updateFilters({ page: String(page - 1) })} className="arena-secondary-button disabled:opacity-40">Anterior</button><span className="text-sm text-slate-300">Página {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => updateFilters({ page: String(page + 1) })} className="arena-secondary-button disabled:opacity-40">Siguiente</button></nav>}
        </> : null}
      </section>
      <p className="mt-8 flex items-center gap-2 text-xs leading-relaxed text-slate-400"><Heart className="h-3.5 w-3.5 shrink-0" />Los favoritos se guardan en este navegador{user ? ' para tu cuenta' : ''}. Los avisos de asistencia aparecen al iniciar sesión.</p>
    </div>
    <CreateTournamentModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
  </div>;
}

export default function ArenaPage() {
  return <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10"><LoadingCards /></div>}><TournamentDirectory /></Suspense>;
}

