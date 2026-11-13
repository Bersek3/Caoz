'use client';

import Link from 'next/link';
import { Mail, LifeBuoy } from '@/components/icons';
import type { Tournament } from '@/types/tournament';

export const SUPPORT_EMAIL = 'contacto.caoz@gmail.com';
export function TournamentSupport({ tournament }: { tournament?: Tournament }) {
  const subject = encodeURIComponent(`Ayuda CZ ARENA${tournament ? ' · '+tournament.title : ''}`);
  return <section id="ayuda" className="scroll-mt-24 space-y-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-white"><LifeBuoy className="h-5 w-5 text-red-300" />Ayuda para competir</h2>
        <p className="mt-1 text-sm text-slate-300">Resuelve tus dudas antes de inscribirte o durante el torneo.</p></div>
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-400 px-4 py-2 text-sm font-bold text-black hover:bg-red-300"><Mail size={17} />Contactar soporte</a>
    </div>
    <div className="divide-y divide-slate-700/70 text-sm">
      {[
        ['¿Qué necesito para participar?', 'Inicia sesión, completa tu perfil y tu ID del juego. En equipos, el capitán debe revisar los integrantes antes de inscribir. Consulta el reglamento y los horarios de cada torneo.'],
        ['¿Inscribirme confirma mi asistencia?', 'Son pasos distintos. Tras inscribirte, vuelve durante el horario de check-in y confirma tu asistencia. En tu participación verás si está pendiente o confirmada.'],
        ['¿Cómo sé si se confirmó mi pago?', 'Consulta Mis pagos. La inscripción se confirma cuando el proveedor aprueba el pago. Si está en revisión, contacta a soporte antes de volver a pagar.'],
        ['¿Qué ocurre si se llenaron los cupos?', 'Puedes entrar en la lista de espera. Si se libera un cupo, verás tu turno en esta página. Entrar en la lista no realiza una inscripción ni un cobro.'],
        ['¿Cómo pido una devolución?', 'Abre Mis pagos, consulta la operación y contacta a soporte con su referencia. Las devoluciones se revisan manualmente; el estado del pago indica cuándo requiere atención.'],
        ['¿Cómo reporto un problema en una partida?', 'Entra en tu sala, envía las pruebas por el chat privado y usa Llamar a un árbitro. Para problemas de acceso o inscripción, escribe al correo de soporte.']
      ].map(([question,answer]) => <details key={question} className="group py-3"><summary className="cursor-pointer py-1 font-semibold text-slate-100 marker:text-red-300">{question}</summary><p className="mt-2 leading-relaxed text-slate-300">{answer}</p></details>)}
    </div>
    <Link href="/arena/pagos" className="inline-block text-sm font-semibold text-red-300 underline underline-offset-4">Consultar mis pagos</Link>
  </section>;
}
