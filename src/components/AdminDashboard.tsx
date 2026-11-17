import React, { useState, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Agency, PartnerProfile, Booking, TimeSlot } from '../types/index.ts';
import { formatAuditDateTime } from '../utils/dateUtils.ts';
import { parseFidelizacaoValor, formatMoneyBRL } from '../utils/currencyUtils.ts';
import { AgencyDashboard } from './AgencyDashboard.tsx';
import { PartnerView } from './PartnerView.tsx';
import { PartnerRegisterModal } from './PartnerRegisterModal.tsx';
import { AgencyRegisterModal } from './AgencyRegisterModal.tsx';
import {
  Building2,
  Users,
  PlusCircle,
  Building,
  CalendarDays,
  FileCheck2,
  Activity,
  Eye,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  BarChart3,
  MapPin,
} from 'lucide-react';

type ExpandedMasterCard =
  | 'agencies'
  | 'partners'
  | 'construtoras'
  | 'empreendimentos'
  | 'slots'
  | 'bookings'
  | null;

interface InterviewStats {
  total: number;
  aprovados: number;
  reprovados: number;
  remarcar: number;
  naoCompareceu: number;
  pendentes: number;
  aprovadosPct: number;
  reprovadosPct: number;
  remarcarPct: number;
  naoCompareceuPct: number;
  pendentesPct: number;
  totalAvaliados: number;
  taxaAprovacaoAvaliados: number;
  taxaReprovacaoAvaliados: number;
  fidelizacaoCliente: number;
  fidelizacaoParceiro: number;
  fidelizacaoConstrutora: number;
  fidelizacaoTotal: number;
}

const computeInterviewStats = (list: Booking[]): InterviewStats => {
  const total = list.length;
  let aprovados = 0;
  let reprovados = 0;
  let remarcar = 0;
  let naoCompareceu = 0;
  let pendentes = 0;
  let fidelizacaoCliente = 0;
  let fidelizacaoParceiro = 0;
  let fidelizacaoConstrutora = 0;

  list.forEach((b) => {
    if (b.outcome === 'Aprovado') {
      aprovados += 1;
      const val = parseFidelizacaoValor(b.fidelizacaoValor);
      if (val > 0) {
        if (b.fidelizacaoResponsavel === 'Parceiro') {
          fidelizacaoParceiro += val;
        } else if (b.fidelizacaoResponsavel === 'Construtora') {
          fidelizacaoConstrutora += val;
        } else {
          fidelizacaoCliente += val;
        }
      }
    } else if (b.outcome === 'Reprovado') {
      reprovados += 1;
    } else if (b.outcome === 'Remarcar') {
      remarcar += 1;
    } else if (b.outcome === 'Não compareceu') {
      naoCompareceu += 1;
    } else {
      pendentes += 1;
    }
  });

  const pct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);
  const totalAvaliados = aprovados + reprovados;
  const taxaAprovacaoAvaliados =
    totalAvaliados > 0 ? Math.round((aprovados / totalAvaliados) * 100) : 0;
  const taxaReprovacaoAvaliados =
    totalAvaliados > 0 ? Math.round((reprovados / totalAvaliados) * 100) : 0;

  return {
    total,
    aprovados,
    reprovados,
    remarcar,
    naoCompareceu,
    pendentes,
    aprovadosPct: pct(aprovados),
    reprovadosPct: pct(reprovados),
    remarcarPct: pct(remarcar),
    naoCompareceuPct: pct(naoCompareceu),
    pendentesPct: pct(pendentes),
    totalAvaliados,
    taxaAprovacaoAvaliados,
    taxaReprovacaoAvaliados,
    fidelizacaoCliente,
    fidelizacaoParceiro,
    fidelizacaoConstrutora,
    fidelizacaoTotal: fidelizacaoCliente + fidelizacaoParceiro + fidelizacaoConstrutora,
  };
};

interface AdminDashboardProps {
  onOpenAgencyRegisterModal: () => void;
  onOpenPartnerRegisterModal: () => void;
  onOpenConstrutoraRegisterModal: () => void;
  onOpenBatchModal: () => void;
  onOpenSingleSlotModal: () => void;
  onBookSlot: (slot: TimeSlot, booking?: Booking) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenAgencyRegisterModal,
  onOpenPartnerRegisterModal,
  onOpenConstrutoraRegisterModal,
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

  const [activeTab, setActiveTab] = useState<'agencies' | 'partners' | 'construtoras' | 'audit'>('agencies');
  const [expandedCard, setExpandedCard] = useState<ExpandedMasterCard>(null);
  const [empreendimentoSearch, setEmpreendimentoSearch] = useState('');
  const [editingPartner, setEditingPartner] = useState<PartnerProfile | null>(null);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  const regularPartners = useMemo(
    () => partners.filter((p) => p.segment?.toLowerCase() !== 'construtora'),
    [partners]
  );
  const construtoras = useMemo(
    () => partners.filter((p) => p.segment?.toLowerCase() === 'construtora'),
    [partners]
  );
  const confirmedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed'),
    [bookings]
  );
  const totalEmpreendimentos = useMemo(
    () =>
      construtoras.reduce(
        (acc, c) => acc + (Array.isArray(c.empreendimentos) ? c.empreendimentos.length : 0),
        0
      ),
    [construtoras]
  );

  const handleToggleCard = (card: ExpandedMasterCard) => {
    setExpandedCard((prev) => (prev === card ? null : card));
  };

  // Switch to agency perspective
  const handleInspectAgency = (agency: Agency) => {
    setCurrentAgency(agency);
    setViewPerspective('agency_view');
  };

  // Switch to partner / construtora perspective
  const handleInspectPartner = (partner: PartnerProfile) => {
    setCurrentPartner(partner);
    if (partner.segment?.toLowerCase() === 'construtora') {
      setViewPerspective('construtora_view');
    } else {
      setViewPerspective('partner_view');
    }
  };

  // Pre-compute Empreendimentos grouped by Construtora for the Empreendimentos performance board
  const construtorasEmpreendimentosBoard = useMemo(() => {
    const sortedConstrutoras = [...construtoras].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );

    const searchNormalized = empreendimentoSearch.trim().toLowerCase();

    return sortedConstrutoras
      .map((construtora) => {
        const construtoraBookings = confirmedBookings.filter(
          (b) =>
            b.propertyType === 'Empreendimento' &&
            (b.construtoraId === construtora.id ||
              (b.construtoraName &&
                b.construtoraName.trim().toLowerCase() === construtora.name.trim().toLowerCase()))
        );

        const rawEmpreendimentos = Array.isArray(construtora.empreendimentos)
          ? [...construtora.empreendimentos].sort((a, b) =>
              (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
            )
          : [];

        const matchedBookingIds = new Set<string>();

        const empRows = rawEmpreendimentos.map((emp) => {
          const empBookings = construtoraBookings.filter((b) => {
            const matchById = b.empreendimentoId && b.empreendimentoId === emp.id;
            const matchByName =
              b.empreendimentoName &&
              b.empreendimentoName.trim().toLowerCase() === emp.name.trim().toLowerCase();
            if (matchById || matchByName) {
              matchedBookingIds.add(b.id);
              return true;
            }
            return false;
          });

          return {
            id: emp.id,
            name: emp.name,
            city: emp.city || 'Não informada',
            uf: emp.state || '',
            stats: computeInterviewStats(empBookings),
          };
        });

        // Bookings for this construtora that didn't match a registered empreendimento
        const unmatchedBookings = construtoraBookings.filter((b) => !matchedBookingIds.has(b.id));
        if (unmatchedBookings.length > 0) {
          empRows.push({
            id: `${construtora.id}-unassigned`,
            name: 'Empreendimento não especificado / outros',
            city: '-',
            uf: '',
            stats: computeInterviewStats(unmatchedBookings),
          });
        }

        const filteredEmpRows = searchNormalized
          ? empRows.filter(
              (row) =>
                row.name.toLowerCase().includes(searchNormalized) ||
                row.city.toLowerCase().includes(searchNormalized) ||
                construtora.name.toLowerCase().includes(searchNormalized)
            )
          : empRows;

        return {
          construtora,
          totalRegisteredEmpreendimentos: rawEmpreendimentos.length,
          construtoraStats: computeInterviewStats(construtoraBookings),
          empreendimentoRows: filteredEmpRows,
          matchesSearch:
            !searchNormalized ||
            construtora.name.toLowerCase().includes(searchNormalized) ||
            filteredEmpRows.length > 0,
        };
      })
      .filter((group) => group.matchesSearch);
  }, [construtoras, confirmedBookings, empreendimentoSearch]);

  const globalConfirmedStats = useMemo(
    () => computeInterviewStats(confirmedBookings),
    [confirmedBookings]
  );

  return (
    <div className="space-y-6">
      {/* VIEW PERSPECTIVE 1: AGENCY VIEW PREVIEW */}
      {viewPerspective === 'agency_view' && (
        <div className="space-y-4">
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
          <PartnerView
            onBookSlot={onBookSlot}
          />
        </div>
      )}

      {/* VIEW PERSPECTIVE 2.5: CONSTRUTORA VIEW PREVIEW */}
      {viewPerspective === 'construtora_view' && (
        <div className="space-y-4">
          <PartnerView isConstrutoraView />
        </div>
      )}

      {/* VIEW PERSPECTIVE 3: MASTER ADMIN DASHBOARD */}
      {viewPerspective === 'admin_master' && (
        <>
          {/* Admin Header - Directly on background */}
          <div className="pt-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gestão de Agências, Parceiros & Construtoras
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 w-full leading-relaxed">
              Cadastre as agências centralizadoras, cadastre as empresas parceiras e construtoras homologadas e clique sobre qualquer card de indicador para expandir o painel analítico.
            </p>
          </div>

          {/* Global Ecosystem Metrics Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>Indicadores Globais do Ecossistema — Clique em um card para expandir informações detalhadas</span>
              </div>
              {expandedCard && (
                <button
                  type="button"
                  onClick={() => setExpandedCard(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Recolher Painel
                </button>
              )}
            </div>

            {/* Global Ecosystem Metrics Interactive Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Agências */}
              <button
                type="button"
                onClick={() => handleToggleCard('agencies')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expandedCard === 'agencies'
                    ? 'bg-blue-950/50 border-blue-500 ring-1 ring-blue-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-blue-500/50 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400 flex items-center justify-between gap-1">
                    <span className="truncate">Agências Cadastradas</span>
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white mt-1 tabular-nums">
                    {agencies.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Centralizadoras ativas</span>
                  {expandedCard === 'agencies' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </button>

              {/* Card 2: Parceiros */}
              <button
                type="button"
                onClick={() => handleToggleCard('partners')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expandedCard === 'partners'
                    ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400 flex items-center justify-between gap-1">
                    <span className="truncate">Parceiros Homologados</span>
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
                    {regularPartners.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Empresas com acesso</span>
                  {expandedCard === 'partners' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </button>

              {/* Card 3: Construtoras */}
              <button
                type="button"
                onClick={() => handleToggleCard('construtoras')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expandedCard === 'construtoras'
                    ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/50 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400 flex items-center justify-between gap-1">
                    <span className="truncate">Construtoras</span>
                    <Building className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1 tabular-nums">
                    {construtoras.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Acesso visualização</span>
                  {expandedCard === 'construtoras' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </button>

              {/* Card 4: Empreendimentos */}
              <button
                type="button"
                onClick={() => handleToggleCard('empreendimentos')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expandedCard === 'empreendimentos'
                    ? 'bg-orange-950/50 border-orange-500 ring-1 ring-orange-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-orange-500/50 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400 flex items-center justify-between gap-1">
                    <span className="truncate">Empreendimentos</span>
                    <Layers className="w-4 h-4 text-orange-400 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-400 mt-1 tabular-nums">
                    {totalEmpreendimentos}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Quadro de desempenho</span>
                  {expandedCard === 'empreendimentos' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </button>

              {/* Card 5: Horários na Rede */}
              <button
                type="button"
                onClick={() => handleToggleCard('slots')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expandedCard === 'slots'
                    ? 'bg-cyan-950/50 border-cyan-500 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400 flex items-center justify-between gap-1">
                    <span className="truncate">Horários na Rede</span>
                    <CalendarDays className="w-4 h-4 text-cyan-400 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1 tabular-nums">
                    {slots.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Disponíveis + Confirmados</span>
                  {expandedCard === 'slots' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </button>

              {/* Card 6: Agendamentos Totais */}
              <button
                type="button"
                onClick={() => handleToggleCard('bookings')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expandedCard === 'bookings'
                    ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/50 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400 flex items-center justify-between gap-1">
                    <span className="truncate">Agendamentos Totais</span>
                    <FileCheck2 className="w-4 h-4 text-purple-400 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-300 mt-1 tabular-nums">
                    {confirmedBookings.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>Confirmados no sistema</span>
                  {expandedCard === 'bookings' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
              </button>
            </div>

            {/* EXPANDED DASHBOARD PANELS */}
            {expandedCard === 'empreendimentos' && (
              <div className="pt-4 border-t border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-orange-400" />
                      Quadro de Desempenho por Empreendimento
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Empreendimentos separados por construtora com total de entrevistas e distribuição por status (quantidade e %).
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={empreendimentoSearch}
                      onChange={(e) => setEmpreendimentoSearch(e.target.value)}
                      placeholder="Filtrar construtora ou empreendimento..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {construtorasEmpreendimentosBoard.length === 0 ? (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                    Nenhuma construtora ou empreendimento encontrado para o filtro informado.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {construtorasEmpreendimentosBoard.map(
                      ({ construtora, totalRegisteredEmpreendimentos, construtoraStats, empreendimentoRows }) => (
                        <div
                          key={construtora.id}
                          className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden"
                        >
                          {/* Construtora Group Header */}
                          <div className="px-4 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                                {construtora.logoUrl?.trim() ? (
                                  <img
                                    src={construtora.logoUrl.trim()}
                                    alt={construtora.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Building className="w-4 h-4 text-amber-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                    {construtora.name}
                                  </h4>
                                  <span className="text-xs text-slate-400">
                                    · {totalRegisteredEmpreendimentos}{' '}
                                    {totalRegisteredEmpreendimentos === 1
                                      ? 'empreendimento cadastrado'
                                      : 'empreendimentos cadastrados'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                                  Total da Construtora:{' '}
                                  <span className="font-semibold text-white">
                                    {construtoraStats.total} entrevistas
                                  </span>{' '}
                                  · Aprovados:{' '}
                                  <span className="text-emerald-400 font-semibold">
                                    {construtoraStats.aprovados} ({construtoraStats.aprovadosPct}%)
                                  </span>{' '}
                                  · Reprovados:{' '}
                                  <span className="text-rose-400 font-semibold">
                                    {construtoraStats.reprovados} ({construtoraStats.reprovadosPct}%)
                                  </span>{' '}
                                  · Remarcar:{' '}
                                  <span className="text-amber-300 font-semibold">
                                    {construtoraStats.remarcar} ({construtoraStats.remarcarPct}%)
                                  </span>{' '}
                                  · Não compareceu:{' '}
                                  <span className="text-orange-300 font-semibold">
                                    {construtoraStats.naoCompareceu} ({construtoraStats.naoCompareceuPct}%)
                                  </span>{' '}
                                  · Pendentes:{' '}
                                  <span className="text-slate-300 font-semibold">
                                    {construtoraStats.pendentes} ({construtoraStats.pendentesPct}%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleInspectPartner(construtora)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Visão Construtora
                              </button>
                            </div>
                          </div>

                          {/* Empreendimentos Table */}
                          {empreendimentoRows.length === 0 ? (
                            <div className="px-4 py-5 text-xs text-slate-500 text-center">
                              Nenhum empreendimento cadastrado nesta construtora.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
                                    <th className="py-2.5 px-4">Empreendimento</th>
                                    <th className="py-2.5 px-3">Cidade / UF</th>
                                    <th className="py-2.5 px-3 text-right">Total Entrevistas</th>
                                    <th className="py-2.5 px-3 text-right text-emerald-400">Aprovado (Qtd / %)</th>
                                    <th className="py-2.5 px-3 text-right text-rose-400">Reprovado (Qtd / %)</th>
                                    <th className="py-2.5 px-3 text-right text-amber-300">Remarcar (Qtd / %)</th>
                                    <th className="py-2.5 px-3 text-right text-orange-300">Não Compareceu (Qtd / %)</th>
                                    <th className="py-2.5 px-3 text-right text-slate-300">Pendente (Qtd / %)</th>
                                    <th className="py-2.5 px-4 text-right">Taxa Aprovação (Avaliados)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-xs tabular-nums">
                                  {empreendimentoRows.map((row) => (
                                    <tr
                                      key={row.id}
                                      className="hover:bg-slate-900/40 transition-colors"
                                    >
                                      <td className="py-3 px-4 font-semibold text-white">
                                        {row.name}
                                      </td>
                                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                          {row.city}
                                          {row.uf ? `/${row.uf}` : ''}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right font-bold text-white">
                                        {row.stats.total}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <span className="font-semibold text-emerald-400">
                                          {row.stats.aprovados}
                                        </span>{' '}
                                        <span className="text-slate-400">
                                          ({row.stats.aprovadosPct}%)
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <span className="font-semibold text-rose-400">
                                          {row.stats.reprovados}
                                        </span>{' '}
                                        <span className="text-slate-400">
                                          ({row.stats.reprovadosPct}%)
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <span className="font-semibold text-amber-300">
                                          {row.stats.remarcar}
                                        </span>{' '}
                                        <span className="text-slate-400">
                                          ({row.stats.remarcarPct}%)
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <span className="font-semibold text-orange-300">
                                          {row.stats.naoCompareceu}
                                        </span>{' '}
                                        <span className="text-slate-400">
                                          ({row.stats.naoCompareceuPct}%)
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <span className="font-semibold text-slate-300">
                                          {row.stats.pendentes}
                                        </span>{' '}
                                        <span className="text-slate-500">
                                          ({row.stats.pendentesPct}%)
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        {row.stats.totalAvaliados > 0 ? (
                                          <div className="inline-flex items-center justify-end gap-2">
                                            <span className="font-bold text-emerald-400">
                                              {row.stats.taxaAprovacaoAvaliados}% aprov.
                                            </span>
                                            <span className="text-slate-500">·</span>
                                            <span className="text-rose-400">
                                              {row.stats.taxaReprovacaoAvaliados}% reprov.
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-500">Sem avaliados</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {expandedCard === 'agencies' && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      Desempenho por Agência Centralizadora
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Capacidade de horários, ocupação e resultados das entrevistas vinculados a cada agência.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
                        <th className="py-2.5 px-4">Agência</th>
                        <th className="py-2.5 px-3 text-right">Horários</th>
                        <th className="py-2.5 px-3 text-right">Ocupação</th>
                        <th className="py-2.5 px-3 text-right">Entrevistas</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Aprovado (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-rose-400">Reprovado (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-amber-300">Remarcar (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-orange-300">Não Compareceu</th>
                        <th className="py-2.5 px-3 text-right text-slate-300">Pendente</th>
                        <th className="py-2.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs tabular-nums">
                      {[...agencies]
                        .sort((a, b) =>
                          (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                        )
                        .map((agency) => {
                          const agencySlots = slots.filter((s) => s.agencyId === agency.id);
                          const bookedSlots = agencySlots.filter((s) => s.status === 'booked').length;
                          const occupancyPct =
                            agencySlots.length > 0
                              ? Math.round((bookedSlots / agencySlots.length) * 100)
                              : 0;
                          const agencyBookings = confirmedBookings.filter(
                            (b) => b.agencyId === agency.id
                          );
                          const st = computeInterviewStats(agencyBookings);

                          return (
                            <tr key={agency.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-4 font-semibold text-white">
                                <div>{agency.name}</div>
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {agency.city || 'Sem cidade'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right text-slate-300">
                                {agencySlots.length}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-cyan-400">
                                  {bookedSlots}/{agencySlots.length}
                                </span>{' '}
                                <span className="text-slate-400">({occupancyPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-white">
                                {st.total}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-emerald-400">{st.aprovados}</span>{' '}
                                <span className="text-slate-400">({st.aprovadosPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-rose-400">{st.reprovados}</span>{' '}
                                <span className="text-slate-400">({st.reprovadosPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-amber-300">{st.remarcar}</span>{' '}
                                <span className="text-slate-400">({st.remarcarPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-orange-300">
                                  {st.naoCompareceu}
                                </span>{' '}
                                <span className="text-slate-400">({st.naoCompareceuPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-slate-300">{st.pendentes}</span>{' '}
                                <span className="text-slate-500">({st.pendentesPct}%)</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleInspectAgency(agency)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Acessar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {expandedCard === 'partners' && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Desempenho por Parceiro Homologado
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total de entrevistas agendadas por cada empresa parceira, resultados por status com % e valores de fidelização.
                  </p>
                </div>

                <div className="overflow-x-auto bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
                        <th className="py-2.5 px-4">Parceiro</th>
                        <th className="py-2.5 px-3 text-right">Total Entrevistas</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Aprovado (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-rose-400">Reprovado (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-amber-300">Remarcar (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-orange-300">Não Compareceu</th>
                        <th className="py-2.5 px-3 text-right text-slate-300">Pendente</th>
                        <th className="py-2.5 px-3 text-right">Índice Aprovação</th>
                        <th className="py-2.5 px-3 text-right">Fidelização Total</th>
                        <th className="py-2.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs tabular-nums">
                      {[...regularPartners]
                        .sort((a, b) =>
                          (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                        )
                        .map((partner) => {
                          const partnerBookings = confirmedBookings.filter(
                            (b) =>
                              b.partnerId === partner.id ||
                              (b.partnerName &&
                                b.partnerName.trim().toLowerCase() ===
                                  partner.name.trim().toLowerCase())
                          );
                          const st = computeInterviewStats(partnerBookings);

                          return (
                            <tr key={partner.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-4 font-semibold text-white">
                                <div>{partner.name}</div>
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {partner.representative || 'Responsável não informado'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-white">
                                {st.total}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-emerald-400">{st.aprovados}</span>{' '}
                                <span className="text-slate-400">({st.aprovadosPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-rose-400">{st.reprovados}</span>{' '}
                                <span className="text-slate-400">({st.reprovadosPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-amber-300">{st.remarcar}</span>{' '}
                                <span className="text-slate-400">({st.remarcarPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-orange-300">
                                  {st.naoCompareceu}
                                </span>{' '}
                                <span className="text-slate-400">({st.naoCompareceuPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-slate-300">{st.pendentes}</span>{' '}
                                <span className="text-slate-500">({st.pendentesPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {st.totalAvaliados > 0 ? (
                                  <span className="font-bold text-emerald-400">
                                    {st.taxaAprovacaoAvaliados}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-emerald-300">
                                {formatMoneyBRL(st.fidelizacaoTotal)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleInspectPartner(partner)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Acessar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {expandedCard === 'construtoras' && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building className="w-5 h-5 text-amber-400" />
                      Desempenho Consolidado por Construtora
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Quantidade de empreendimentos, parceiros vinculados e entrevistas por status de cada construtora.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedCard('empreendimentos')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Abrir Quadro por Empreendimento
                  </button>
                </div>

                <div className="overflow-x-auto bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
                        <th className="py-2.5 px-4">Construtora</th>
                        <th className="py-2.5 px-3 text-right">Empreendimentos</th>
                        <th className="py-2.5 px-3 text-right">Parceiros Vinc.</th>
                        <th className="py-2.5 px-3 text-right">Entrevistas</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Aprovado (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-rose-400">Reprovado (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-amber-300">Remarcar (Qtd / %)</th>
                        <th className="py-2.5 px-3 text-right text-orange-300">Não Compareceu</th>
                        <th className="py-2.5 px-3 text-right text-slate-300">Pendente</th>
                        <th className="py-2.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs tabular-nums">
                      {[...construtoras]
                        .sort((a, b) =>
                          (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                        )
                        .map((construtora) => {
                          const cBookings = confirmedBookings.filter(
                            (b) =>
                              b.propertyType === 'Empreendimento' &&
                              (b.construtoraId === construtora.id ||
                                (b.construtoraName &&
                                  b.construtoraName.trim().toLowerCase() ===
                                    construtora.name.trim().toLowerCase()))
                          );
                          const st = computeInterviewStats(cBookings);
                          const empCount = Array.isArray(construtora.empreendimentos)
                            ? construtora.empreendimentos.length
                            : 0;
                          const linkedCount = regularPartners.filter((p) =>
                            (p.allowedConstrutoraIds || []).includes(construtora.id)
                          ).length;

                          return (
                            <tr key={construtora.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-4 font-semibold text-white">
                                {construtora.name}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-orange-400">
                                {empCount}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-300">
                                {linkedCount}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-white">
                                {st.total}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-emerald-400">{st.aprovados}</span>{' '}
                                <span className="text-slate-400">({st.aprovadosPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-rose-400">{st.reprovados}</span>{' '}
                                <span className="text-slate-400">({st.reprovadosPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-amber-300">{st.remarcar}</span>{' '}
                                <span className="text-slate-400">({st.remarcarPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-orange-300">
                                  {st.naoCompareceu}
                                </span>{' '}
                                <span className="text-slate-400">({st.naoCompareceuPct}%)</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-semibold text-slate-300">{st.pendentes}</span>{' '}
                                <span className="text-slate-500">({st.pendentesPct}%)</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleInspectPartner(construtora)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Acessar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {expandedCard === 'slots' && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-cyan-400" />
                    Distribuição de Capacidade e Horários na Rede
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Visão detalhada dos horários cadastrados, disponíveis, reservados e bloqueados em cada agência.
                  </p>
                </div>

                {(() => {
                  const totalSlotsCount = slots.length;
                  const availableCount = slots.filter((s) => s.status === 'available').length;
                  const bookedCount = slots.filter((s) => s.status === 'booked').length;
                  const blockedCount = slots.filter((s) => s.status === 'locked').length;
                  const pctSlot = (n: number) =>
                    totalSlotsCount > 0 ? Math.round((n / totalSlotsCount) * 100) : 0;

                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                          <div className="text-xs text-slate-400">Total de Horários</div>
                          <div className="text-xl font-bold text-white mt-1">{totalSlotsCount}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">100% da capacidade</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                          <div className="text-xs text-slate-400">Horários Disponíveis</div>
                          <div className="text-xl font-bold text-emerald-400 mt-1">
                            {availableCount} ({pctSlot(availableCount)}%)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Livres para reserva</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                          <div className="text-xs text-slate-400">Horários Ocupados</div>
                          <div className="text-xl font-bold text-cyan-400 mt-1">
                            {bookedCount} ({pctSlot(bookedCount)}%)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Com entrevista agendada</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                          <div className="text-xs text-slate-400">Horários Bloqueados</div>
                          <div className="text-xl font-bold text-amber-400 mt-1">
                            {blockedCount} ({pctSlot(blockedCount)}%)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Reservados internamente</div>
                        </div>
                      </div>

                      <div className="overflow-x-auto bg-slate-950/80 border border-slate-800 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
                              <th className="py-2.5 px-4">Agência</th>
                              <th className="py-2.5 px-3 text-right">Total Horários</th>
                              <th className="py-2.5 px-3 text-right text-emerald-400">Disponíveis (Qtd / %)</th>
                              <th className="py-2.5 px-3 text-right text-cyan-400">Ocupados (Qtd / %)</th>
                              <th className="py-2.5 px-3 text-right text-amber-400">Bloqueados (Qtd / %)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-xs tabular-nums">
                            {[...agencies]
                              .sort((a, b) =>
                                (a.name || '').localeCompare(b.name || '', 'pt-BR', {
                                  sensitivity: 'base',
                                })
                              )
                              .map((agency) => {
                                const aSlots = slots.filter((s) => s.agencyId === agency.id);
                                const aTotal = aSlots.length;
                                const aAvail = aSlots.filter((s) => s.status === 'available').length;
                                const aBooked = aSlots.filter((s) => s.status === 'booked').length;
                                const aBlocked = aSlots.filter((s) => s.status === 'locked').length;
                                const p = (n: number) =>
                                  aTotal > 0 ? Math.round((n / aTotal) * 100) : 0;

                                return (
                                  <tr key={agency.id} className="hover:bg-slate-900/40 transition-colors">
                                    <td className="py-3 px-4 font-semibold text-white">
                                      {agency.name}
                                    </td>
                                    <td className="py-3 px-3 text-right font-bold text-white">
                                      {aTotal}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <span className="font-semibold text-emerald-400">{aAvail}</span>{' '}
                                      <span className="text-slate-400">({p(aAvail)}%)</span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <span className="font-semibold text-cyan-400">{aBooked}</span>{' '}
                                      <span className="text-slate-400">({p(aBooked)}%)</span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <span className="font-semibold text-amber-400">{aBlocked}</span>{' '}
                                      <span className="text-slate-400">({p(aBlocked)}%)</span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {expandedCard === 'bookings' && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-purple-400" />
                    Resumo Global de Agendamentos e Resultados de Entrevistas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Distribuição completa dos agendamentos confirmados por status de entrevista, modalidade e valores de fidelização.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Total Entrevistas</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {globalConfirmedStats.total}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">100% confirmadas</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-emerald-400">Aprovados</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      {globalConfirmedStats.aprovados} ({globalConfirmedStats.aprovadosPct}%)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Índice avaliados: {globalConfirmedStats.taxaAprovacaoAvaliados}%
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-rose-400">Reprovados</div>
                    <div className="text-xl font-bold text-rose-400 mt-1">
                      {globalConfirmedStats.reprovados} ({globalConfirmedStats.reprovadosPct}%)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Índice avaliados: {globalConfirmedStats.taxaReprovacaoAvaliados}%
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-amber-300">Remarcar</div>
                    <div className="text-xl font-bold text-amber-300 mt-1">
                      {globalConfirmedStats.remarcar} ({globalConfirmedStats.remarcarPct}%)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Sobre o total</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-orange-300">Não Compareceu</div>
                    <div className="text-xl font-bold text-orange-300 mt-1">
                      {globalConfirmedStats.naoCompareceu} ({globalConfirmedStats.naoCompareceuPct}%)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Sobre o total</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-slate-300">Pendentes / A Realizar</div>
                    <div className="text-xl font-bold text-slate-200 mt-1">
                      {globalConfirmedStats.pendentes} ({globalConfirmedStats.pendentesPct}%)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Aguardando parecer</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 tabular-nums">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Fidelização Cliente</div>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      {formatMoneyBRL(globalConfirmedStats.fidelizacaoCliente)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Fidelização Parceiro</div>
                    <div className="text-base font-bold text-cyan-400 mt-1">
                      {formatMoneyBRL(globalConfirmedStats.fidelizacaoParceiro)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Fidelização Construtora</div>
                    <div className="text-base font-bold text-amber-400 mt-1">
                      {formatMoneyBRL(globalConfirmedStats.fidelizacaoConstrutora)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Fidelização Total Acumulada</div>
                    <div className="text-base font-bold text-white mt-1">
                      {formatMoneyBRL(globalConfirmedStats.fidelizacaoTotal)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2">
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
                Parceiros Negociais ({regularPartners.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('construtoras')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'construtoras'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building className="w-4 h-4 text-purple-300" />
                Construtoras ({construtoras.length})
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

              <div className="flex flex-col gap-2.5">
                {[...agencies]
                  .sort((a, b) =>
                    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                  )
                  .map((agency) => {
                    return (
                      <div
                        key={agency.id}
                        onClick={() => setEditingAgency(agency)}
                        className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-3 h-3 rounded-full shrink-0 ${agency.badgeColor || 'bg-blue-500'}`} />
                          <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-blue-300 transition-colors">
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

              <div className="flex flex-col gap-2.5">
                {[...regularPartners]
                  .sort((a, b) =>
                    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                  )
                  .map((partner) => {
                    return (
                      <div
                        key={partner.id}
                        onClick={() => setEditingPartner(partner)}
                        className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-3 h-3 rounded-full shrink-0 ${partner.badgeColor || 'bg-emerald-500'}`} />
                          <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-emerald-300 transition-colors">
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
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 2.5: CONSTRUTORAS LIST */}
          {activeTab === 'construtoras' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-slate-400">
                  Construtoras cadastradas no ecossistema (mesma estrutura de dados do parceiro)
                </span>
                <button
                  type="button"
                  onClick={onOpenConstrutoraRegisterModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastrar Construtora
                </button>
              </div>

              {construtoras.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
                    <Building className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-white">Nenhuma construtora cadastrada</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Cadastre construtoras com a mesma estrutura de dados dos parceiros para acesso de visualização às agendas.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenConstrutoraRegisterModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/20 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Cadastrar Construtora
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {[...construtoras]
                    .sort((a, b) =>
                      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                    )
                    .map((construtora) => {
                      return (
                        <div
                          key={construtora.id}
                          onClick={() => setEditingPartner(construtora)}
                          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                              {construtora.logoUrl?.trim() ? (
                                <img
                                  src={construtora.logoUrl.trim()}
                                  alt={construtora.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Building className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-amber-300 transition-colors">
                              {construtora.name}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectPartner(construtora);
                            }}
                            title="Ver como Construtora"
                            className="p-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer shrink-0"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
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
