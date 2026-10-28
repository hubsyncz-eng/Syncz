import React, { useState, useRef, useEffect } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import {
  Building,
  Building2,
  Users,
  UserCheck,
  Shield,
  LogOut,
  Sun,
  Moon,
  Eye,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

interface HeaderProps {
  onOpenAgencyRegisterModal?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const {
    currentUser,
    logout,
    adminPerspective,
    setAdminPerspective,
    agencyActiveView,
    setAgencyActiveView,
    construtoraActiveView,
    setConstrutoraActiveView,
    theme,
    toggleTheme,
    agencies,
    partners,
    currentAgency,
    currentPartner,
    setCurrentPartner,
    openAgencyModal,
    openPartnerModal,
  } = useRealtime();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAgencyView =
    currentUser?.role === 'agency' ||
    (currentUser?.role === 'admin' && adminPerspective === 'agency_view');

  const isPartnerView =
    currentUser?.role === 'partner' ||
    (currentUser?.role === 'admin' && adminPerspective === 'partner_view');

  const isConstrutoraView =
    currentUser?.role === 'construtora' ||
    (currentUser?.role === 'admin' && adminPerspective === 'construtora_view');

  const isMasterView =
    currentUser?.role === 'admin' && adminPerspective === 'admin_master';

  const hasSideMenu = Boolean(currentUser);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [currentUser, adminPerspective]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md text-white shadow-lg transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo and Brand (with Agency/Partner/Master Options Menu on Left Icon click) */}
          <div className="relative flex items-center gap-3" ref={menuRef}>
            
            {/* Brand Calendar Icon (clickable in all authenticated views to open options menu) */}
            <button
              type="button"
              onClick={() => {
                if (hasSideMenu) {
                  setIsMenuOpen((prev) => !prev);
                }
              }}
              title={
                isMasterView
                  ? 'Abrir menu de opções'
                  : isAgencyView
                    ? 'Abrir menu de opções da agência'
                    : isPartnerView
                      ? 'Abrir menu de opções do parceiro'
                      : isConstrutoraView
                        ? 'Abrir menu de opções da construtora'
                        : 'Syncz'
              }
              className={`syncz-header-logo-box w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 transition-all ${
                hasSideMenu
                  ? 'cursor-pointer hover:border-cyan-400 hover:scale-105 active:scale-95'
                  : 'cursor-default'
              }`}
            >
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
            </button>

            {/* Syncz Brand Title */}
            <div
              onClick={() => {
                if (isAgencyView) {
                  setAgencyActiveView('schedule');
                  setIsMenuOpen(false);
                } else if (isConstrutoraView) {
                  setConstrutoraActiveView('schedule');
                  setIsMenuOpen(false);
                }
              }}
              className={isAgencyView || isConstrutoraView ? 'cursor-pointer' : ''}
            >
              <h1 className="syncz-brand-title font-extrabold text-xl sm:text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Syncz
              </h1>
            </div>

            {/* Agency / Partner View Left Options Bar */}
            {hasSideMenu && isMenuOpen && (
              <div className="syncz-agency-menu absolute left-0 top-full mt-2.5 w-56 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in">
                {isAgencyView && !currentUser?.isAgencyUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const targetAgency = currentAgency || agencies.find((a) => a.id === currentUser?.agencyId) || agencies[0];
                        openAgencyModal(targetAgency);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Dados da Agência</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAgencyActiveView(agencyActiveView === 'partners' ? 'schedule' : 'partners');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        agencyActiveView === 'partners'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Parceiros</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAgencyActiveView(
                          agencyActiveView === 'construtoras' ? 'schedule' : 'construtoras'
                        );
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        agencyActiveView === 'construtoras'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Construtoras</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAgencyActiveView(agencyActiveView === 'users' ? 'schedule' : 'users');
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        agencyActiveView === 'users'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Usuários</span>
                    </button>
                  </>
                )}

                {isPartnerView && (
                  <button
                    type="button"
                    onClick={() => {
                      const activePartnerId = currentUser?.role === 'partner' ? (currentUser.partnerId || currentUser.id) : currentPartner?.id;
                      const targetPartner = partners.find((p) => p.id === activePartnerId) || currentPartner || partners[0];
                      openPartnerModal(targetPartner);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Dados Cadastrais</span>
                  </button>
                )}

                {isConstrutoraView && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setConstrutoraActiveView(
                          construtoraActiveView === 'dashboard' ? 'schedule' : 'dashboard'
                        );
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        construtoraActiveView === 'dashboard'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const activeConstrutoraId =
                          currentUser?.role === 'construtora'
                            ? currentUser.partnerId || currentUser.id
                            : currentPartner?.id;
                        const construtoraList = partners.filter(
                          (p) => p.segment?.toLowerCase() === 'construtora'
                        );
                        const targetConstrutora =
                          partners.find((p) => p.id === activeConstrutoraId) ||
                          (currentPartner?.segment?.toLowerCase() === 'construtora'
                            ? currentPartner
                            : construtoraList[0]);
                        openPartnerModal(targetConstrutora, 'construtora');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Building className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Dados Cadastrais</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConstrutoraActiveView(
                          construtoraActiveView === 'partners' ? 'schedule' : 'partners'
                        );
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        construtoraActiveView === 'partners'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Parceiros</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConstrutoraActiveView(
                          construtoraActiveView === 'empreendimentos'
                            ? 'schedule'
                            : 'empreendimentos'
                        );
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        construtoraActiveView === 'empreendimentos'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Empreendimentos</span>
                    </button>
                  </>
                )}

                {isMasterView && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminPerspective('agency_view');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Visão Agência</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const regularPartners = partners.filter(
                          (p) => p.segment?.toLowerCase() !== 'construtora'
                        );
                        if (regularPartners.length > 0) {
                          setCurrentPartner(regularPartners[0]);
                        }
                        setAdminPerspective('partner_view');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Visão Parceiro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const construtoras = partners.filter(
                          (p) => p.segment?.toLowerCase() === 'construtora'
                        );
                        if (construtoras.length > 0) {
                          setCurrentPartner(construtoras[0]);
                        }
                        setAdminPerspective('construtora_view');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Building className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Visão Construtora</span>
                    </button>
                  </>
                )}

                {/* If viewing as Admin, allow quick return to Master Dashboard */}
                {currentUser?.role === 'admin' &&
                  (adminPerspective === 'agency_view' ||
                    adminPerspective === 'partner_view' ||
                    adminPerspective === 'construtora_view') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminPerspective('admin_master');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-purple-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Voltar ao Painel Master</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Modo escuro</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Modo claro</span>
                    </>
                  )}
                </button>

                <div className="my-1 border-t border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-rose-300 hover:bg-slate-800 hover:text-rose-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Master Perspective Indicator + Back Arrow, or Theme Switcher for Login Screen */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {currentUser?.role === 'admin' &&
              (adminPerspective === 'agency_view' ||
                adminPerspective === 'partner_view' ||
                adminPerspective === 'construtora_view') && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-200 text-xs sm:text-sm font-semibold shadow-sm">
                    <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      {adminPerspective === 'agency_view'
                        ? 'Agência'
                        : adminPerspective === 'partner_view'
                          ? 'Parceiro'
                          : 'Construtora'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminPerspective('admin_master')}
                    title="Voltar ao Perfil Master"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

            {!currentUser && (
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Modo Escuro</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Modo Claro</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

