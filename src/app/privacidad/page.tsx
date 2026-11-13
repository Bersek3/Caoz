import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ArrowLeft, ShieldCheck } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Política de privacidad | CZ ARENA',
  description: 'Información sobre los datos personales y la privacidad en CZ ARENA.',
  robots: { index: false, follow: true },
};

// Render only the public policy, keeping editorial notes in the source document.
const document = readFileSync(path.join(process.cwd(), 'docs/politica-de-privacidad.md'), 'utf8');
const publicPolicy = document.split('\n---')[0];
const sections = publicPolicy.split(/^## /m).slice(1).map((section, index) => {
  const [title, ...body] = section.split('\n');
  return { title: title.trim(), body: body.join('\n').trim(), id: `seccion-${index + 1}` };
});

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**')) return <strong key={index} className="font-semibold text-slate-200">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={index} className="break-all rounded bg-white/5 px-1.5 py-0.5 text-xs text-red-200">{part.slice(1, -1)}</code>;
    return part;
  });
}

function content(body: string) {
  return body.split(/\n\s*\n/).map((block, index) => {
    if (block.startsWith('### ')) return <h3 key={index} className="pt-3 text-lg font-bold text-white">{block.slice(4)}</h3>;
    if (block.startsWith('- ')) return (
      <ul key={index} className="list-disc space-y-3 pl-5 marker:text-red-400">
        {block.split('\n').map((item, itemIndex) => <li key={itemIndex}>{inline(item.replace(/^- /, ''))}</li>)}
      </ul>
    );
    return <p key={index}>{inline(block)}</p>;
  });
}

export default function PrivacyPage() {
  return (
    <div className="relative isolate min-h-screen bg-[#110e0f] pb-8 pt-28 sm:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-red-950/30 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link href="/arena" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-red-400">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a la arena
        </Link>
        <header className="max-w-3xl py-10 sm:py-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-red-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> CZ ARENA · Privacidad
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Política de privacidad</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">Conoce qué datos tratamos, para qué los utilizamos y cómo ejercer tus derechos.</p>
          <p className="mt-5 text-sm text-slate-500">Borrador para revisión · 30 de octubre de 2026</p>
        </header>
        <div role="note" className="mb-10 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm leading-7 text-amber-100/80">
          Este documento está en revisión. Algunos antecedentes del responsable, el alojamiento y los plazos de conservación aún están pendientes de confirmación y aparecen señalados en el texto.
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Contenido de la política" className="rounded-2xl border border-slate-800 bg-white/[0.02] p-5 lg:sticky lg:top-28">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">En esta política</p>
            <ol className="space-y-3">
              {sections.map(section => <li key={section.id}><a href={`#${section.id}`} className="block text-sm leading-6 text-slate-400 transition-colors hover:text-red-400 focus-visible:text-red-400">{section.title}</a></li>)}
            </ol>
          </nav>
          <article className="min-w-0 rounded-2xl border border-slate-800 bg-white/[0.02] px-5 sm:px-9">
            {sections.map(section => (
              <section key={section.id} id={section.id} className="scroll-mt-28 border-b border-slate-800/80 py-8 last:border-0 sm:py-10">
                <h2 className="mb-6 text-xl font-bold tracking-tight text-white sm:text-2xl">{section.title}</h2>
                <div className="space-y-5 break-words text-sm leading-7 text-slate-400 sm:text-base sm:leading-8">{content(section.body)}</div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
