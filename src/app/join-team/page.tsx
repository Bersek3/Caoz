'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Gamepad2, 
  ChevronLeft,
  LogIn
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../../components/AuthModal';

function JoinTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const { user, token, refreshUser, openAuthModal, isLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState(initialCode.toUpperCase());
  const [inGameId, setInGameId] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialCode) {
      setInviteCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  useEffect(() => {
    if (user) {
      setInGameId(user.riotId || user.steamId || user.eaId || '');
      setDiscordTag(user.discordTag || '');
    }
  }, [user]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!inviteCode.trim()) {
      setErrorMsg('Por favor ingresa un código de invitación válido.');
      return;
    }

    if (!inGameId.trim()) {
      setErrorMsg('Por favor ingresa tu In-Game ID para el roster.');
      return;
    }

    try {
      setIsSubmitting(true);
      const savedToken = token || localStorage.getItem('caoz_auth_token');
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          inGameId: inGameId.trim(),
          discordTag: discordTag.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al unirse al equipo.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(data.message || '¡Te has unido exitosamente al equipo!');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      await refreshUser();

      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#191213] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto shadow-lg shadow-purple-500/10">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Invitación a Equipo
          </h1>
          <p className="text-xs text-slate-400">
            Únete al roster oficial de tu escuadra para competir en torneos.
          </p>
        </div>

        {/* Success State */}
        {successMsg ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-bold text-white">¡Bienvenido al Equipo!</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              {successMsg} Redirigiendo a tu perfil...
            </p>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Invite Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Código de Invitación *
              </label>
              <input
                type="text"
                placeholder="CZ-XXXX-XXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm tracking-widest uppercase focus:border-purple-400 focus:outline-none"
              />
            </div>

            {/* If user logged in: Player info */}
            {user ? (
              <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tu Ficha de Jugador (@{user.username})</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Tu ID en el Juego (Riot ID / Steam ID / EA ID) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Jugador#LAS o STEAM_0:..."
                    value={inGameId}
                    onChange={(e) => setInGameId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Tu Discord de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="usuario#0000"
                    value={discordTag}
                    onChange={(e) => setDiscordTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-400 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-center space-y-3">
                <p className="text-xs text-slate-300">
                  Debes iniciar sesión con tu cuenta para asociarte al roster del equipo.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors border border-slate-700 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-red-400" />
                  <span>Iniciar Sesión / Registrarme</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !user}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all font-mono flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'UNIÉNDOSE AL EQUIPO...' : 'ACEPTAR E INCORPORARME AL ROSTER'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="pt-2 text-center">
          <Link
            href="/arena"
            className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Volver a Torneos</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinTeamContent />
    </Suspense>
  );
}
