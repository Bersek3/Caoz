'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Mail,
  CheckCircle2,
  Send
} from 'lucide-react';

const TYPEWRITER_PHRASES = [
  "Streamer Oficial en Kick & Twitch",
  "Creador de Contenido (+2.17M Comunidad)",
  "Shooters, Gaming & Dinámicas en Vivo",
  "Usa el Código de Creador: CAOZ"
];

const STATS_DATA = [
  { platform: "YouTube", count: "1.07M+", label: "Suscriptores", handle: "@caoz", url: "https://www.youtube.com/@caoz" },
  { platform: "TikTok", count: "923K+", label: "Seguidores", handle: "@caozyt", url: "https://www.tiktok.com/@caozyt" },
  { platform: "Twitch", count: "78K+", label: "Seguidores", handle: "caozssj", url: "https://www.twitch.tv/caozssj?lang=es" },
  { platform: "Kick", count: "38K+", label: "Seguidores", handle: "kick.com/caoz", url: "https://kick.com/caoz" },
  { platform: "Instagram", count: "64K+", label: "Seguidores", handle: "@caozyt", url: "https://www.instagram.com/caozyt/" }
];

export default function CaozPortalPage() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [formSent, setFormSent] = useState(false);

  // Efecto de máquina de escribir
  useEffect(() => {
    const currentPhrase = TYPEWRITER_PHRASES[phraseIndex];
    const updateSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        if (displayText.length + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
        }
      }
    }, updateSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => setFormSent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#070508] text-white selection:bg-[#ff1744] selection:text-white">
      {/* Resplandores ambientales cyberpunk */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-rose-600/10 blur-[140px]" />
        <div className="absolute top-[35%] right-[10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[160px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[150px]" />
      </div>

      {/* NAVBAR OFICIAL CAOZ */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a060b]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-500 p-[2px] shadow-lg shadow-rose-500/25 group-hover:shadow-rose-500/50 transition-all duration-300">
              <div className="w-full h-full bg-[#0d070b] rounded-[10px] flex items-center justify-center font-black text-white text-base">
                CZ
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-wider uppercase text-white font-mono">
                CAOZ<span className="text-[#ff1744]"></span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase -mt-1">
                Streamer & Creator
              </span>
            </div>
          </Link>

          {/* Enlaces de navegación */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-zinc-300">
            <a href="#hero" className="hover:text-white transition-colors">Inicio</a>
            <a href="#metrics" className="hover:text-white transition-colors">Métricas</a>
            <a href="#brands" className="hover:text-white transition-colors">Colaboraciones</a>
            <a href="#contact" className="hover:text-white transition-colors">Contacto</a>
          </nav>

          {/* Botón CTA a contacto */}
          <div className="flex items-center space-x-3">
            <a
              href="#contact"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-[#ff1744] to-red-500 hover:from-rose-500 hover:to-red-400 shadow-lg shadow-rose-600/30 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Mail className="w-4 h-4 text-white" />
              <span>Contacto Comercial</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="hero" className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Contenido izquierdo */}
            <div className="lg:col-span-7 space-y-6">

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white font-mono leading-none">
                HOLA,SOY <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff1744] via-rose-500 to-amber-400 drop-shadow-[0_0_35px_rgba(255,23,68,0.4)]">
                  CAOZ
                </span>
              </h1>

              <div className="h-8 flex items-center">
                <p className="text-lg sm:text-xl font-medium text-zinc-300">
                  {displayText}
                  <span className="inline-block w-2 h-5 ml-1 bg-[#ff1744] animate-pulse align-middle" />
                </p>
              </div>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Llevando el streaming, el gaming y el entretenimiento al nivel más alto.
                Creando contenido de alto impacto para una comunidad consolidada de más de 2 millones de seguidores.
              </p>


              {/* Barra de estadísticas resumida */}
              <div className="grid grid-cols-3 gap-4 pt-6 max-w-lg border-t border-white/10">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">1.07M+</div>
                  <div className="text-xs text-zinc-400 font-medium">YouTube Subs</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">923K+</div>
                  <div className="text-xs text-zinc-400 font-medium">TikTok Fans</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#ff1744] font-mono">2.17M+</div>
                  <div className="text-xs text-zinc-400 font-medium">Audiencia Total</div>
                </div>
              </div>
            </div>

            {/* Visual derecho: Avatar de Caoz con aura glow */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#ff1744] via-rose-600 to-cyan-500 opacity-30 group-hover:opacity-60 blur-2xl transition-all duration-500" />
                <div className="relative w-72 sm:w-84 lg:w-96 aspect-square rounded-3xl overflow-hidden border-2 border-white/20 bg-zinc-950 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/avatar.jpg"
                    alt="Caoz Streamer Oficial"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
      {/* MÉTRICAS & COMUNIDAD */}
      <section id="metrics" className="relative z-10 py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-[#ff1744] uppercase tracking-widest">// COMUNIDAD VERIFICADA</span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-mono mt-2">
              Audiencia <span className="text-[#ff1744]">Total</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              Alcance consolidado en las principales plataformas de contenido gaming y streaming.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {STATS_DATA.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {item.platform}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-3xl font-black font-mono text-white group-hover:scale-105 transition-transform origin-left">
                    {item.count}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{item.label}</div>
                </div>
                <div className="pt-4 mt-4 border-t border-white/10 text-xs font-mono text-zinc-400">
                  {item.handle}
                </div>
              </a>
            ))}
          </div>

          {/* Banner Total Consolidado */}
          <div className="mt-10 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-950/30 to-amber-950/40 border border-[#ff1744]/30 p-8 text-center">
            <div className="text-xs font-mono uppercase tracking-widest text-[#ff1744] font-bold">
              // AUDIENCIA CONSOLIDADA TOTAL
            </div>
            <div className="text-4xl sm:text-6xl font-black text-white font-mono mt-2">
              +2,170,000
            </div>
            <div className="text-xs sm:text-sm text-zinc-400 mt-2">
              Seguidores combinados en YouTube, TikTok, Kick, Twitch e Instagram
            </div>
          </div>

        </div>
      </section>

      {/* COLABORACIONES OFICIALES & MARCAS */}
      <section id="brands" className="relative z-10 py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">// ALIANZAS TOP</span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-mono mt-2">
              Marcas & <span className="text-amber-400">Patrocinios</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              Alianzas estratégicas con líderes de la industria gaming y del entretenimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Red Bull */}
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-red-500/40 backdrop-blur-md flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 flex items-center justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/redbull_logo.svg" alt="Red Bull" className="h-12 w-auto object-contain" />
              </div>
              <h3 className="text-xl font-bold text-white">Red Bull</h3>
              <p className="text-xs text-red-400 font-mono mt-1">Colaboración Oficial & Eventos</p>
            </div>

            {/* Logitech */}
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-cyan-500/40 backdrop-blur-md flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 flex items-center justify-center mb-6 text-cyan-400">
                <svg viewBox="0 0 110 30" className="h-8 w-auto fill-current">
                  <path d="M23.47 19.367c-1.772 0-3.142-1.357-3.142-3.194 0-1.757 1.37-3.114 3.141-3.114 1.772 0 3.141 1.357 3.141 3.114.08 1.837-1.369 3.194-3.14 3.194m5.798-6.388v-2.156h-3.866c-.644-.24-1.288-.32-1.933-.32-3.302 0-5.879 2.476-5.879 5.75s2.577 5.75 5.88 5.75c3.301 0 5.878-2.476 5.878-5.75 0-1.118-.322-2.156-.886-2.955zm-18.523 6.388c-1.772 0-3.141-1.357-3.141-3.194 0-1.757 1.369-3.114 3.14-3.114 1.773 0 3.142 1.357 3.142 3.114 0 1.837-1.37 3.194-3.141 3.194m0-8.864c-3.302 0-5.88 2.476-5.88 5.75s2.578 5.75 5.88 5.75 5.879-2.476 5.879-5.75-2.577-5.75-5.88-5.75M1 21.683h2.738V6.271H1zm29.476 0h2.738v-10.86h-2.738zm-7.007 3.833c-1.771 0-3.14-1.357-3.14-3.114H17.59c0 3.274 2.577 5.75 5.88 5.75 3.301 0 5.878-2.476 5.878-5.75H26.61c0 1.836-1.369 3.114-3.14 3.114m19.812-10.381c.403-1.438 1.45-2.236 2.9-2.236s2.496.798 2.818 2.236zm2.98-4.632c-3.302 0-5.799 2.476-5.799 5.83 0 3.274 2.255 5.67 5.799 5.67 1.933 0 3.704-.72 4.993-2.077l-1.852-1.836c-.886.878-1.853 1.437-3.06 1.437-1.53 0-2.658-.879-2.98-2.236h8.536v-.639c0-3.673-2.335-6.149-5.637-6.149m24.24 0c-1.368 0-2.496.48-3.301 1.358V6.19h-2.738v15.492H67.2v-5.91c0-1.596.966-2.635 2.658-2.635 1.53 0 2.416.959 2.416 2.636v5.91h2.738v-6.39c0-3.034-1.933-4.791-4.51-4.791m-11.838 2.635c1.128 0 2.094.56 2.819 1.438l1.933-1.837c-1.047-1.357-2.738-2.156-4.671-2.156-3.302 0-5.88 2.476-5.88 5.75s2.578 5.75 5.88 5.75c1.933 0 3.624-.88 4.67-2.157l-1.932-1.916c-.725.798-1.691 1.437-2.819 1.437-1.772 0-3.06-1.357-3.06-3.114-.08-1.837 1.288-3.195 3.06-3.195M38.61 7.468h-2.738v3.355h-1.45v2.395h1.45v8.465h2.738v-8.465h1.53v-2.395h-1.53zm-6.765-1.517c-.966 0-1.772.799-1.772 1.837 0 .958.806 1.757 1.772 1.757 1.047 0 1.852-.799 1.852-1.757 0-1.038-.805-1.837-1.852-1.837M95.79 1v5.51c-4.349 0-7.812 3.434-7.812 7.746 0 4.233 3.463 7.747 7.812 7.747v5.51c-7.41 0-13.45-5.91-13.45-13.257S88.38 1 95.79 1m.161 10.86v5.43h6.443v6.39h5.476V11.86z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Logitech G</h3>
              <p className="text-xs text-cyan-400 font-mono mt-1">Periféricos & Hardware Gaming</p>
            </div>

            {/* Kick */}
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-[#53fc18]/40 backdrop-blur-md flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 flex items-center justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/kick_logo.png" alt="Kick" className="h-10 w-auto object-contain" />
              </div>
              <h3 className="text-xl font-bold text-white">Kick Streaming</h3>
              <p className="text-xs text-[#53fc18] font-mono mt-1">Plataforma Principal de Directos</p>
            </div>
          </div>

        </div>
      </section>

      {/* CONTACTO & PROPUESTAS */}
      <section id="contact" className="relative z-10 py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-mono font-bold text-[#ff1744] uppercase tracking-widest">// CONTACTO COMERCIAL</span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-mono">
                Hablemos de <span className="text-[#ff1744]">Negocios</span>
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Para propuestas de patrocinio, activaciones comerciales de marca, presencia en eventos o campañas de contenido.
              </p>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Correo Oficial</div>
                    <a href="mailto:contacto.caoz@gmail.com" className="text-sm font-bold text-white hover:text-rose-400 transition-colors">
                      contacto.caoz@gmail.com
                    </a>
                  </div>
                </div>


              </div>
            </div>

            {/* Formulario */}
            <div className="lg:col-span-7">
              <form onSubmit={handleContactSubmit} className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">Nombre o Marca</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Tu Nombre"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="contacto@empresa.com"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">Tipo de Propuesta</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-rose-500 text-sm"
                  >
                    <option value="patrocinio">Patrocinio de Marca / Campaña</option>
                    <option value="colaboracion">Colaboración entre Creadores</option>
                    <option value="eventos">Eventos Presenciales / Activación</option>
                    <option value="prensa">Entrevista o Prensa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">Detalles del Mensaje</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Cuéntanos detalles de tu propuesta, fechas tentativas o presupuesto..."
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 to-[#ff1744] hover:from-rose-500 hover:to-red-500 shadow-xl shadow-rose-600/25 transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Propuesta</span>
                </button>

                {formSent && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>¡Propuesta enviada con éxito! Caoz revisará tu mensaje en breve.</span>
                  </div>
                )}
              </form>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-12 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="font-mono font-black text-xl text-white tracking-wider">
                CAOZ<span className="text-[#ff1744]"></span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Portal oficial de streamer gaming & creador de contenido.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-400">
              <a href="https://kick.com/caoz" target="_blank" rel="noopener noreferrer" className="hover:text-white">Kick</a>
              <a href="https://www.twitch.tv/caozssj?lang=es" target="_blank" rel="noopener noreferrer" className="hover:text-white">Twitch</a>
              <a href="https://www.youtube.com/@caoz" target="_blank" rel="noopener noreferrer" className="hover:text-white">YouTube</a>
              <a href="https://www.tiktok.com/@caozyt" target="_blank" rel="noopener noreferrer" className="hover:text-white">TikTok</a>
              <a href="https://www.instagram.com/caozyt/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-600">
            <div>© 2026 Caoz. Todos los derechos reservados.</div>

          </div>
        </div>
      </footer>

    </div>
  );
}
