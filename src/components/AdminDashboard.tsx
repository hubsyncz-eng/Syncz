import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Agency, PartnerProfile, Booking, TimeSlot } from '../types/index.ts';
import { formatRelativeTime } from '../utils/dateUtils.ts';
import { AgencyDashboard } from './AgencyDashboard.tsx';
import { PartnerView } from './PartnerView.tsx';
import {
  Building2,
  Users,
  Shield,
  PlusCircle,
  Building,
  CheckCircle2,
  CalendarDays,
  FileCheck2,
  Activity,
  ArrowRight,
  Eye,
  Search,
  ChevronRight,
  Layers,
  Sparkles,
  KeyRound,
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenAgencyRegisterModal: () => void;
  onOpenPartnerRegisterModal: () => void;
  onOpenBatchModal: () => void;
  onOpenSingleSlotModal: () => void;
  onBookSlot: (slot: TimeSlot) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenAgencyRegisterModal,
  onOpenPartnerRegisterModal,
  onOpenBatchModal,
  onOpenSingleSlotModal,
  onBookSlot,
}) => {
  const {
    agencies,
    partners,
    slots,
    bookings,
    activities,
    setCurrentAgency,
    setCurrentPartner,
    adminPerspective: viewPerspective,
    setAdminPerspective: setViewPerspective,
  } = useRealtime();

  const [activeTab, setActiveTab] = useState<'agencies' | 'partners' | 'audit'>('agencies');
  const [searchTerm, setSearchTerm] = useState('');

  // Switch to agency perspective
  const handleInspectAgency = (agency: Agency) => {
    setCurrentAgency(agency);
    setViewPerspective('agency_view');
  };

  // Switch to partner perspective
  const handleInspectPartner = (partner: PartnerProfile) => {
    setCurrentPartner(partner);
    setViewPerspective('partner_view');
  };

  const filteredAgencies = agencies.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cnpj.includes(searchTerm)
  );

  const filteredPartners = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.representative.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* Top Perspective Switcher for Administrator */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Navegador de Visões do Sistema</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Acesso Master Total
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              O Administrador pode alternar e auditar todas as visões (Painel Master, Visão da Agência e Visão do Parceiro)
            </div>
          </div>
        </div>

        {/* View Perspective Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewPerspective('admin_master')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewPerspective === 'admin_master'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-300" />
            <span>Painel Master</span>
          </button>

          <button
            type="button"
            onClick={() => setViewPerspective('agency_view')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewPerspective === 'agency_view'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Visão da Agência</span>
          </button>

          <button
            type="button"
            onClick={() => setViewPerspective('partner_view')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewPerspective === 'partner_view'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-300" />
            <span>Visão do Parceiro</span>
          </button>
        </div>
      </div>

      {/* VIEW PERSPECTIVE 1: AGENCY VIEW PREVIEW */}
      {viewPerspective === 'agency_view' && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Você está visualizando a tela operacional da <strong>Agência Central</strong> como Administrador.
            </span>
            <button
              type="button"
              onClick={() => setViewPerspective('admin_master')}
              className="text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              Voltar ao Painel Master &rarr;
            </button>
          </div>

          <AgencyDashboard
            onOpenBatchModal={onOpenBatchModal}
            onOpenSingleSlotModal={onOpenSingleSlotModal}
          />
        </div>
      )}

      {/* VIEW PERSPECTIVE 2: PARTNER VIEW PREVIEW */}
      {viewPerspective === 'partner_view' && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Você está visualizando a tela do <strong>Parceiro Negocial</strong> como Administrador.
            </span>
            <button
              type="button"
              onClick={() => setViewPerspective('admin_master')}
              className="text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Voltar ao Painel Master &rarr;
            </button>
          </div>

          <PartnerView
            onBookSlot={onBookSlot}
          />
        </div>
      )}

      {/* VIEW PERSPECTIVE 3: MASTER ADMIN DASHBOARD */}
      {viewPerspective === 'admin_master' && (
        <>
          {/* Admin Header - Directly on background */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Gestão de Agências, Parceiros & Ecossistema
              </h2>
              <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Cadastre as agências centralizadoras, cadastre as empresas parceiras homologadas e audite todas as visões de agendamento em tempo real.
              </p>
            </div>

            {/* Action Buttons: Register Agency & Register Partner */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenAgencyRegisterModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Cadastrar Agência
              </button>

              <button
                type="button"
                onClick={onOpenPartnerRegisterModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Cadastrar Parceiro
              </button>
            </div>
          </div>

          {/* Global Ecosystem Metrics Card */}
          <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Global Ecosystem Metrics */}
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Agências Cadastradas</span>
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">{agencies.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Centralizadoras ativas</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Parceiros Homologados</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{partners.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Empresas com acesso</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Horários na Rede</span>
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1">{slots.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Disponíveis + Confirmados</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Agendamentos Totais</span>
                  <FileCheck2 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-300 mt-1">
                  {bookings.filter((b) => b.status === 'confirmed').length}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Confirmados no sistema</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('agencies')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'agencies'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-purple-300" />
                Agências Centralizadoras ({agencies.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('partners')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'partners'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-purple-300" />
                Parceiros Negociais ({partners.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Activity className="w-4 h-4 text-purple-300" />
                Auditoria Global
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar agência ou parceiro..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* TAB 1: AGENCIES LIST */}
          {activeTab === 'agencies' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAgencies.map((agency) => {
                  const agencySlots = slots.filter((s) => s.agencyId === agency.id);
                  const agencyBookings = bookings.filter((b) => b.agencyId === agency.id && b.status === 'confirmed');

                  return (
                    <div
                      key={agency.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                              <Building className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-base">{agency.name}</h3>
                              <div className="text-xs text-slate-400">{agency.legalName}</div>
                            </div>
                          </div>

                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Ativa
                          </span>
                        </div>

                        <div className="py-4 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>CNPJ:</span>
                            <strong className="text-slate-200 font-mono">{agency.cnpj}</strong>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Gestor Responsável:</span>
                            <strong className="text-slate-200">{agency.managerName}</strong>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>E-mail Corporativo:</span>
                            <span className="text-slate-300">{agency.email}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Localização:</span>
                            <span className="text-slate-300">{agency.city} - {agency.state}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-purple-950/30 border border-purple-500/20 p-2 rounded-xl mt-1">
                            <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                              Senha de Acesso:
                            </span>
                            <span className="text-purple-200 font-mono font-bold">{agency.password || 'agencia123'}</span>
                          </div>
                          {agency.description && (
                            <p className="text-slate-400 mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 leading-relaxed text-[11px]">
                              {agency.description}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                            <div className="text-slate-400 text-[11px]">Horários Ofertados</div>
                            <div className="text-base font-bold text-white mt-0.5">{agencySlots.length}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                            <div className="text-slate-400 text-[11px]">Agendados</div>
                            <div className="text-base font-bold text-emerald-400 mt-0.5">{agencyBookings.length}</div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500">
                          Cadastrada em {new Date(agency.createdAt).toLocaleDateString('pt-BR')}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleInspectAgency(agency)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver como esta Agência</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PARTNERS LIST */}
          {activeTab === 'partners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-slate-400">
                  Empresas parceiras homologadas no ecossistema
                </span>
                <button
                  type="button"
                  onClick={onOpenPartnerRegisterModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastrar Parceiro
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPartners.map((partner) => {
                  const partnerBookings = bookings.filter((b) => b.partnerId === partner.id && b.status === 'confirmed');

                  return (
                    <div
                      key={partner.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${partner.badgeColor}`} />
                            <h4 className="font-bold text-white text-sm">{partner.name}</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {partner.segment}
                          </span>
                        </div>

                        <div className="py-3 space-y-1.5 text-xs text-slate-400">
                          <div>
                            Representante: <strong className="text-slate-200">{partner.representative}</strong>
                          </div>
                          <div>
                            CNPJ: <span className="font-mono text-slate-300">{partner.cnpj}</span>
                          </div>
                          <div>
                            E-mail: <span className="text-slate-300">{partner.email}</span>
                          </div>
                          {partner.phone && (
                            <div>
                              Telefone: <span className="text-slate-300">{partner.phone}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[11px] bg-purple-950/30 border border-purple-500/20 p-2 rounded-xl mt-1">
                            <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                              Senha:
                            </span>
                            <span className="text-purple-200 font-mono font-bold">{partner.password || 'parceiro123'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs text-emerald-400 font-semibold">
                          {partnerBookings.length} agendamento(s)
                        </span>

                        <button
                          type="button"
                          onClick={() => handleInspectPartner(partner)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver como Parceiro</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT FEED */}
          {activeTab === 'audit' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 pb-3 border-b border-slate-800">
                Registro Global de Auditoria de Acontecimentos
              </h3>
              <div className="space-y-3 max-w-3xl">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs"
                  >
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-white">{act.title}</h4>
                        <span className="text-slate-500 text-[11px]">{formatRelativeTime(act.timestamp)}</span>
                      </div>
                      <p className="text-slate-300 mt-1 leading-relaxed">{act.description}</p>
                      {act.protocol && (
                        <div className="mt-1 font-mono text-cyan-400">Protocolo: {act.protocol}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
