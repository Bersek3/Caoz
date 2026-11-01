import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountPage } from '@/components/AccountPage';

export const metadata: Metadata = { title: 'Crear cuenta | CZ ARENA', description: 'Crea tu cuenta en CZ ARENA y encuentra tu próximo torneo.' };
export default function SignupPage() {
  return <Suspense fallback={<p className="p-8 text-slate-300">Cargando registro…</p>}><AccountPage mode="register" /></Suspense>;
}
