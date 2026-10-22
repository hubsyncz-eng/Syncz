import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Agency, PartnerProfile, Booking, TimeSlot } from '../types/index.ts';
import { formatAuditDateTime } from '../utils/dateUtils.ts';
import { AgencyDashboard } from './AgencyDashboard.tsx';
import { PartnerView } from './PartnerView.tsx';
import { PartnerRegisterModal } from './PartnerRegisterModal.tsx';
import { AgencyRegisterModal } from './AgencyRegisterModal.tsx';
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
  onBookSlot: (slot: TimeSlot, booking?: Booking) => void;
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
  const [editingPartner, setEditingPartner] = useState<PartnerProfile | null>(null);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

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
            onBookSlot={onBookSlot}
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
          <div className="flex flex-col gap-3.5 pt-1">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Gestão de Agências, Parceiros & Ecossistema
              </h2>
              <p className="text-sm text-slate-400 mt-1.5 w-full leading-relaxed">
                Cadastre as agências centralizadoras, cadastre as empresas parceiras homologadas e audite todas as visões de agendamento em tempo real.
              </p>
            </div>

            {/* Action Buttons: Register Agency & Register Partner - Positioned below title and description */}
            <div className="flex flex-wrap items-center gap-3">
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
          </div>

          {/* TAB 1: AGENCIES LIST */}
          {activeTab === 'agencies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-slate-400">
                  Agências centralizadoras ativas no ecossistema
                </span>
                <button
                  type="button"
                  onClick={onOpenAgencyRegisterModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastrar Agência
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agencies.map((agency) => {
                  return (
                    <div
                      key={agency.id}
                      onClick={() => setEditingAgency(agency)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-5 flex flex-col justify-between shadow-lg transition-all cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${agency.badgeColor || 'bg-blue-500'}`} />
                            <h4 className="font-bold text-white text-base sm:text-lg leading-snug truncate group-hover:text-blue-300 transition-colors">
                              {agency.name}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectAgency(agency);
                            }}
                            title="Ver como esta Agência"
                            className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer shrink-0"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="pt-3.5 space-y-2 text-xs text-slate-400">
                          <div className="flex justify-between items-center gap-2">
                            <span>Responsável:</span>
                            <span className="text-slate-200 font-medium truncate">{agency.managerName || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span>E-mail:</span>
                            <span className="text-slate-300 truncate">{agency.email || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span>Telefone:</span>
                            <span className="text-slate-300">{agency.phone || '-'}</span>
                          </div>
                        </div>
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
                {[...partners]
                  .sort((a, b) =>
                    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                  )
                  .map((partner) => {
                  return (
                    <div
                      key={partner.id}
                      onClick={() => setEditingPartner(partner)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between shadow-lg transition-all cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${partner.badgeColor}`} />
                            <h4 className="font-bold text-white text-base sm:text-lg leading-snug truncate group-hover:text-emerald-300 transition-colors">
                              {partner.name}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectPartner(partner);
                            }}
                            title="Ver como Parceiro"
                            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer shrink-0"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="pt-3.5 space-y-2 text-xs text-slate-400">
                          <div className="flex justify-between items-center gap-2">
                            <span>CNPJ:</span>
                            <span className="font-mono text-slate-200 font-semibold">{partner.cnpj || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span>E-mail:</span>
                            <span className="text-slate-300 truncate">{partner.email || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span>Telefone:</span>
                            <span className="text-slate-300">{partner.phone || '-'}</span>
                          </div>
                        </div>
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
              {activities.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Nenhuma alteração registrada até o momento.
                </div>
              ) : (
                <div className="space-y-2.5 w-full">
                  {activities.map((act) => {
                    const actor =
                      act.actorName ||
                      (act.type === 'agency_registered' || act.type === 'partner_registered'
                        ? 'Master'
                        : act.partnerName || act.agencyName || 'Agência');
                    const action = act.actionText || act.description || act.title;
                    const dateTimeStr = formatAuditDateTime(act.timestamp);

                    return (
                      <div
                        key={act.id}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm"
                      >
                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-slate-200 leading-relaxed">
                          <span className="font-bold text-white">{actor}</span>
                          <span className="text-slate-400"> - </span>
                          <span>{action}</span>
                          <span className="text-slate-400"> em </span>
                          <span className="font-semibold text-cyan-400">{dateTimeStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editingAgency && (
        <AgencyRegisterModal
          agencyToEdit={editingAgency}
          onClose={() => setEditingAgency(null)}
        />
      )}

      {editingPartner && (
        <PartnerRegisterModal
          partnerToEdit={editingPartner}
          onClose={() => setEditingPartner(null)}
        />
      )}
    </div>
  );
};
