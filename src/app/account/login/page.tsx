import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountPage } from '@/components/AccountPage';

export const metadata: Metadata = { title: 'Iniciar sesión | CZ ARENA', description: 'Entra a CZ ARENA y continúa con tus torneos, tu equipo y tus partidas.' };
export default function LoginPage() {
  return <Suspense fallback={<p className="p-8 text-slate-300">Cargando acceso…</p>}><AccountPage mode="login" /></Suspense>;
}
