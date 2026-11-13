'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@/components/icons';
export function TournamentReturnLink() {
  const target=useSearchParams().get('returnTo');
  if(!target || !/^\/tournament\/[a-zA-Z0-9_-]+(?:[?#].*)?$/.test(target))return null;
  return <aside className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-sm">
    <p className="text-slate-200">Completa tu equipo o tu perfil y continúa tu inscripción.</p>
    <Link href={target} className="inline-flex min-h-11 items-center gap-2 font-semibold text-red-300"><ArrowLeft size={17}/>Volver al torneo</Link>
  </aside>;
}
