import React from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import {
  Building2,
  Users,
  Shield,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onOpenAgencyRegisterModal?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const {
    currentUser,
    logout,
    adminPerspective,
  } = useRealtime();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            
            {/* Brand Calendar Icon (with exact same gradient as Syncz) */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="url(#synczHeaderCalendarGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient id="synczHeaderCalendarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
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

            {/* Syncz Brand Title */}
            <div>
              <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Syncz
              </h1>
            </div>
          </div>

          {/* Right Side: Logged User Badge & Logout Button */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                {currentUser.role === 'admin' && (
                  <>
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-purple-300">
                      Administrador Syncz
                      {adminPerspective === 'agency_view' && ' (Visão Agência)'}
                      {adminPerspective === 'partner_view' && ' (Visão Parceiro)'}
                    </span>
                  </>
                )}
                {currentUser.role === 'agency' && (
                  <>
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-blue-300 truncate max-w-[150px]">
                      {currentUser.name}
                    </span>
                  </>
                )}
                {currentUser.role === 'partner' && (
                  <>
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-300 truncate max-w-[150px]">
                      {currentUser.name}
                    </span>
                  </>
                )}
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-rose-300 border border-slate-700/80 text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Sair e voltar ao portal de login"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair / Trocar Acesso</span>
                <span className="sm:hidden">Sair</span>
              </button>
            </div>
          ) : null}

        </div>
      </div>
    </header>
  );
};
