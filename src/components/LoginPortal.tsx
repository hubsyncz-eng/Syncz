import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPortal: React.FC = () => {
  const { loginWithCredentials } = useRealtime();

  const [username, setUsername] = useState('Syncz');
  const [password, setPassword] = useState('@dmin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe o usuário e a senha.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await loginWithCredentials(username.trim(), password.trim());
      // Upon successful login, RealtimeContext sets currentUser
      // App.tsx automatically directs to the user's specific profile!
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Falha ao autenticar. Verifique o usuário e a senha digitados.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        
        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          
          {/* Subtle gradient glow behind card */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header: Syncz and Seja bem vindo */}
          <div className="text-center mb-8 relative">
            {/* Calendar Icon matching gradient */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/30 mb-4 shadow-lg shadow-cyan-500/10">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="url(#loginPortalCalendarGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient id="loginPortalCalendarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
                <path d="M8 14h.01" />
                <path d="M12 14h.01" />
                <path d="M16 14h.01" />
                <path d="M8 18h.01" />
                <path d="M12 18h.01" />
                <path d="M16 18h.01" />
              </svg>
            </div>

            {/* Syncz Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Syncz
            </h1>

            {/* Seja bem vindo */}
            <p className="text-slate-300 text-base font-medium mt-1.5">
              Seja bem vindo
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form: usuário & Senha */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Usuário */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                usuário:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário ou e-mail"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Acesso */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isLoading ? 'Acessando...' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Access Badges for Easy Testing */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Acessos rápidos para teste:</span>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
              {/* Administrador */}
              <button
                type="button"
                onClick={() => handleQuickFill('Syncz', '@dmin')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 hover:border-purple-500/40 text-slate-300 hover:text-white transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="font-semibold text-purple-300">Administrador:</span>
                  <span className="text-slate-400">Syncz</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Senha: @dmin</span>
              </button>

              {/* Agência */}
              <button
                type="button"
                onClick={() => handleQuickFill('contato@agenciacentralalfa.com.br', 'agencia123')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 hover:border-blue-500/40 text-slate-300 hover:text-white transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-semibold text-blue-300">Agência:</span>
                  <span className="text-slate-400 truncate max-w-[150px]">contato@agencia...</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Senha: agencia123</span>
              </button>

              {/* Parceiro */}
              <button
                type="button"
                onClick={() => handleQuickFill('eduardo@logiprime.com.br', 'parceiro123')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-emerald-300">Parceiro:</span>
                  <span className="text-slate-400 truncate max-w-[150px]">eduardo@logiprime...</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Senha: parceiro123</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
