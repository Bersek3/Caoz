'use client';

import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Lock, 
  Mail, 
  User, 
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login'
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Clean empty inputs (no pre-filled credentials!)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [riotId, setRiotId] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [swornDeclaration, setSwornDeclaration] = useState(false);

  const calculateAge = (dateStr: string) => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  };

  const calculatedAge = calculateAge(birthDate);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setSwornDeclaration(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Credenciales inválidas. Verifica tu correo y contraseña.');
          setLoading(false);
          return;
        }
        setSuccessMsg('¡Bienvenido! Sesión iniciada.');
      } else {
        if (!username.trim()) {
          setErrorMsg('Por favor ingresa un nombre de usuario');
          setLoading(false);
          return;
        }
        if (!birthDate) {
          setErrorMsg('Por favor ingresa tu fecha de nacimiento para verificar tu aptitud de participación.');
          setLoading(false);
          return;
        }
        if (calculatedAge !== null && calculatedAge < 14) {
          setErrorMsg('Debes tener al menos 14 años para registrarte y competir en la plataforma.');
          setLoading(false);
          return;
        }

        if (!swornDeclaration) {
          setErrorMsg('Debes aceptar la Declaración Jurada sobre la veracidad de tus datos.');
          setLoading(false);
          return;
        }

        const res = await register({
          email,
          password,
          username,
          fullName,
          riotId,
          discordTag,
          birthDate,
          swornDeclaration: true
        });
        if (!res.success) {
          setErrorMsg(res.error || 'Error al registrarte');
          setLoading(false);
          return;
        }
        setSuccessMsg(
          calculatedAge !== null && calculatedAge < 18
            ? '¡Cuenta creada! Como tienes entre 14 y 17 años, tu cuenta requerirá Autorización Parental.'
            : '¡Cuenta creada con éxito!'
        );
      }

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-[#0c121d] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f1726] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h3>
              <p className="text-[11px] text-slate-400">
                CAOZ ARENA Esports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 border-b border-slate-800 bg-[#090d16] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`py-3 transition-colors border-b-2 ${
              mode === 'login'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`py-3 transition-colors border-b-2 ${
              mode === 'register'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Nombre de Usuario (Gamertag) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: BersekGamer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Tu nombre y apellido"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Fecha de Nacimiento *
                  </label>
                  {calculatedAge !== null && (
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      calculatedAge >= 18 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : calculatedAge >= 14 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {calculatedAge >= 18 
                        ? `Mayor de Edad (${calculatedAge} años)` 
                        : calculatedAge >= 14 
                        ? `Menor (${calculatedAge} años - Requiere Apoderado)` 
                        : `No permitido (${calculatedAge} años)`}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                {calculatedAge !== null && calculatedAge < 14 && (
                  <p className="text-[10px] text-red-400 mt-1">
                    ⚠️ La edad mínima para participar en torneos en Chile es de 14 años.
                  </p>
                )}
                {calculatedAge !== null && calculatedAge >= 14 && calculatedAge < 18 && (
                  <p className="text-[10px] text-amber-300 mt-1">
                    ℹ️ Menor de edad: Tu apoderado legal deberá firmar la Declaración Jurada para participar en torneos.
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Riot ID / Tag</label>
                <input
                  type="text"
                  placeholder="Jugador#LAS"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Discord</label>
                <input
                  type="text"
                  placeholder="usuario#1234"
                  value={discordTag}
                  onChange={(e) => setDiscordTag(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-2 mt-1">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={swornDeclaration}
                  onChange={(e) => setSwornDeclaration(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-amber-500/50 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-amber-200/90 leading-relaxed">
                  Declaro bajo juramento que los datos ingresados son reales. Entiendo que la suplantación de identidad o falsificación de edad para evadir los controles parentales resultará en la expulsión inmediata de todo mi equipo y la pérdida total de premios.
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (mode === 'register' &&
                (!swornDeclaration || !birthDate || (calculatedAge !== null && calculatedAge < 14)))
            }
            className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-400/20 transition-all font-mono disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'CARGANDO...' : mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
          </button>

        </form>

      </div>
    </div>
  );
};
