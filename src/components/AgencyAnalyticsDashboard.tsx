import React, { useState, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { BookingOutcome, PropertyType } from '../types/index.ts';
import { formatDateToISO } from '../utils/dateUtils.ts';
import { parseFidelizacaoValor } from '../utils/currencyUtils.ts';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
  Clock,
  ArrowLeft,
  Building2,
  Users,
  Banknote,
  Layers,
  Home,
  BarChart3,
  PieChart,
  Filter,
  Search,
  X,
  TrendingUp,
  Award,
  ChevronDown,
} from 'lucide-react';

interface AgencyAnalyticsDashboardProps {
  onBackToSchedule: () => void;
}

export const AgencyAnalyticsDashboard: React.FC<AgencyAnalyticsDashboardProps> = ({
  onBackToSchedule,
}) => {
  const {
    slots,
    bookings,
    partners,
    agencies,
    currentAgency,
    currentUser,
    setCurrentAgency,
  } = useRealtime();

  const activeAgency = useMemo(() => {
    if (currentUser?.role === 'agency') {
      const targetId = currentUser.agencyId || currentUser.id;
      return agencies.find((a) => a.id === targetId) || currentAgency;
    }
    return (
      currentAgency ||
      agencies.find((a) => a.id === currentUser?.agencyId) ||
      agencies[0]
    );
  }, [currentAgency, currentUser, agencies]);

  // Filters
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [construtoraFilter, setConstrutoraFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Partners & Construtoras available for filtering
  const regularPartners = useMemo(() => {
    return partners
      .filter((p) => p.segment?.toLowerCase() !== 'construtora')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [partners]);

  const construtoras = useMemo(() => {
    return partners
      .filter((p) => p.segment?.toLowerCase() === 'construtora')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [partners]);

  // Capacity calculation based on agency slots
  const agencySlots = useMemo(() => {
    if (!activeAgency) return [];
    return slots.filter((s) => s.agencyId === activeAgency.id);
  }, [slots, activeAgency]);

  const totalSlotsCount = agencySlots.length;
  const bookedSlotsCount = agencySlots.filter((s) => s.status === 'booked').length;
  const availableSlotsCount = agencySlots.filter((s) => s.status === 'available').length;
  const occupancyRate =
    totalSlotsCount > 0 ? Math.round((bookedSlotsCount / totalSlotsCount) * 100) : 0;

  // Filtered Bookings for this Agency
  const agencyBookings = useMemo(() => {
    if (!activeAgency) return [];
    const today = new Date();
    const todayIso = formatDateToISO(today);

    // Current month start
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthIso = formatDateToISO(startOfMonth);

    // Current week Monday
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const mondayIso = formatDateToISO(monday);

    return bookings.filter((b) => {
      // Must belong to this agency
      const slot = slots.find((s) => s.id === b.slotId);
      const bAgencyId = b.agencyId || slot?.agencyId;
      if (bAgencyId !== activeAgency.id) return false;
      if (slot?.agencyId && slot.agencyId !== activeAgency.id) return false;
      if (b.status === 'cancelled') return false;

      // Period filter
      const bDate = slot?.date || b.slotDate || '';
      if (periodFilter === 'today' && bDate !== todayIso) return false;
      if (periodFilter === 'week' && bDate < mondayIso) return false;
      if (periodFilter === 'month' && bDate < startOfMonthIso) return false;

      // Partner filter
      if (partnerFilter !== 'all' && b.partnerId !== partnerFilter) return false;

      // Construtora filter
      if (construtoraFilter !== 'all') {
        if (construtoraFilter === '__individual__') {
          if (b.propertyType === 'Empreendimento') return false;
        } else {
          if (b.propertyType !== 'Empreendimento') return false;
          const matchId = b.construtoraId === construtoraFilter;
          const targetConst = construtoras.find((c) => c.id === construtoraFilter);
          const matchName =
            targetConst &&
            b.construtoraName?.toLowerCase() === targetConst.name.toLowerCase();
          if (!matchId && !matchName) return false;
        }
      }

      // Outcome filter
      if (outcomeFilter !== 'all') {
        if (outcomeFilter === 'Pendente') {
          if (b.outcome) return false;
        } else {
          if (b.outcome !== outcomeFilter) return false;
        }
      }

      // Search filter (client name, CPF, partner, or construtora)
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchesClient = (b.clientName || '').toLowerCase().includes(q);
        const matchesCpf = (b.clientCpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesPartner = (b.partnerName || '').toLowerCase().includes(q);
        const matchesConstrutora = (b.construtoraName || '').toLowerCase().includes(q);
        const matchesEmp = (b.empreendimentoName || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesCpf && !matchesPartner && !matchesConstrutora && !matchesEmp) {
          return false;
        }
      }

      return true;
    });
  }, [
    bookings,
    slots,
    activeAgency,
    periodFilter,
    partnerFilter,
    construtoraFilter,
    outcomeFilter,
    searchFilter,
    construtoras,
  ]);

  // Overall metric counters
  const totalEntrevistas = agencyBookings.length;
  const totalAprovados = agencyBookings.filter((b) => b.outcome === 'Aprovado').length;
  const totalNegados = agencyBookings.filter((b) => b.outcome === 'Reprovado').length;
  const totalRemarcar = agencyBookings.filter((b) => b.outcome === 'Remarcar').length;
  const totalNaoCompareceu = agencyBookings.filter((b) => b.outcome === 'Não compareceu').length;
  const totalPendentes = agencyBookings.filter((b) => !b.outcome).length;

  const totalAvaliados = totalAprovados + totalNegados;
  const approvalRate =
    totalAvaliados > 0 ? Math.round((totalAprovados / totalAvaliados) * 100) : 0;
  const denialRate =
    totalAvaliados > 0 ? Math.round((totalNegados / totalAvaliados) * 100) : 0;

  // Fidelização calculations: correctly sum all values (Cliente, Parceiro, Construtora)
  const fidelizacaoStats = useMemo(() => {
    let clienteTotal = 0;
    let parceiroTotal = 0;
    let construtoraTotal = 0;

    let clienteCount = 0;
    let parceiroCount = 0;
    let construtoraCount = 0;

    agencyBookings.forEach((b) => {
      const val = parseFidelizacaoValor(b.fidelizacaoValor);
      if (val <= 0) return;

      const rawResp = (b.fidelizacaoResponsavel || '').trim();

      if (/cliente/i.test(rawResp)) {
        clienteTotal += val;
        clienteCount++;
      } else if (/construtora/i.test(rawResp) || b.isConstrutora) {
        construtoraTotal += val;
        construtoraCount++;
      } else {
        // Any other booking with fidelizacao (e.g. 'Parceiro' or older records)
        parceiroTotal += val;
        parceiroCount++;
      }
    });

    const total = clienteTotal + parceiroTotal + construtoraTotal;
    const totalCount = clienteCount + parceiroCount + construtoraCount;

    return {
      total,
      totalCount,
      clienteTotal,
      parceiroTotal,
      construtoraTotal,
      clienteCount,
      parceiroCount,
      construtoraCount,
    };
  }, [agencyBookings]);

  // Partner Performance Breakdown
  const partnersBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        representative: string;
        email?: string;
        phone?: string;
        entrevistas: number;
        aprovados: number;
        negados: number;
        remarcar: number;
        naoCompareceu: number;
        pendentes: number;
        fidelizacaoTotal: number;
      }
    >();

    agencyBookings.forEach((b) => {
      const pId = b.partnerId || 'p_unknown';
      const partnerProfile = partners.find((p) => p.id === pId);
      const name = b.partnerName || partnerProfile?.name || 'Parceiro';
      const representative =
        b.partnerRepresentative || partnerProfile?.representative || 'Representante';

      const cleanVal = parseFidelizacaoValor(b.fidelizacaoValor);

      const current = map.get(pId) || {
        id: pId,
        name,
        representative,
        email: partnerProfile?.email,
        phone: partnerProfile?.phone,
        entrevistas: 0,
        aprovados: 0,
        negados: 0,
        remarcar: 0,
        naoCompareceu: 0,
        pendentes: 0,
        fidelizacaoTotal: 0,
      };

      current.entrevistas++;
      if (b.outcome === 'Aprovado') current.aprovados++;
      else if (b.outcome === 'Reprovado') current.negados++;
      else if (b.outcome === 'Remarcar') current.remarcar++;
      else if (b.outcome === 'Não compareceu') current.naoCompareceu++;
      else current.pendentes++;

      current.fidelizacaoTotal += cleanVal;
      map.set(pId, current);
    });

    return Array.from(map.values()).sort((a, b) => b.entrevistas - a.entrevistas);
  }, [agencyBookings, partners]);

  // Construtoras & Empreendimentos Breakdown
  const construtorasBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        logoUrl?: string;
        isIndividual: boolean;
        entrevistas: number;
        aprovados: number;
        negados: number;
        remarcar: number;
        naoCompareceu: number;
        pendentes: number;
        empreendimentos: Map<string, number>;
        parceiros: Map<string, { name: string; representative?: string; count: number }>;
      }
    >();

    agencyBookings.forEach((b) => {
      const isIndividual = b.propertyType !== 'Empreendimento';
      const rawName = isIndividual
        ? 'Imóvel Individual'
        : b.construtoraName?.trim() || 'Outras Construtoras';
      const key = isIndividual ? '__individual__' : rawName.toLowerCase();

      const construtoraProfile = !isIndividual
        ? construtoras.find(
            (c) =>
              (b.construtoraId && c.id === b.construtoraId) ||
              c.name.toLowerCase() === rawName.toLowerCase()
          )
        : undefined;

      const current = map.get(key) || {
        name: rawName,
        logoUrl: construtoraProfile?.logoUrl?.trim(),
        isIndividual,
        entrevistas: 0,
        aprovados: 0,
        negados: 0,
        remarcar: 0,
        naoCompareceu: 0,
        pendentes: 0,
        empreendimentos: new Map<string, number>(),
        parceiros: new Map<string, { name: string; representative?: string; count: number }>(),
      };

      current.entrevistas++;
      if (b.outcome === 'Aprovado') current.aprovados++;
      else if (b.outcome === 'Reprovado') current.negados++;
      else if (b.outcome === 'Remarcar') current.remarcar++;
      else if (b.outcome === 'Não compareceu') current.naoCompareceu++;
      else current.pendentes++;

      if (!isIndividual) {
        const empName = b.empreendimentoName?.trim() || 'Sem Empreendimento';
        const empCount = current.empreendimentos.get(empName) || 0;
        current.empreendimentos.set(empName, empCount + 1);
      } else {
        const pId = b.partnerId || 'p_unknown';
        const partnerProfile = partners.find((p) => p.id === pId);
        const pName = b.partnerName || partnerProfile?.name || 'Parceiro';
        const pRep = b.partnerRepresentative || partnerProfile?.representative;
        const existingP = current.parceiros.get(pId) || {
          name: pName,
          representative: pRep,
          count: 0,
        };
        existingP.count++;
        current.parceiros.set(pId, existingP);
      }

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isIndividual) return 1;
      if (b.isIndividual) return -1;
      return b.entrevistas - a.entrevistas;
    });
  }, [agencyBookings, construtoras, partners]);

  // Helpers
  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const hasActiveFilters =
    partnerFilter !== 'all' ||
    construtoraFilter !== 'all' ||
    outcomeFilter !== 'all' ||
    periodFilter !== 'all' ||
    searchFilter.trim() !== '';

  const clearFilters = () => {
    setPartnerFilter('all');
    setConstrutoraFilter('all');
    setOutcomeFilter('all');
    setPeriodFilter('all');
    setSearchFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3.5 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Dashboard —{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  {activeAgency ? activeAgency.name : 'Agência'}
                </span>
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Consolidado de capacidade de horários, fluxo de entrevistas, pareceres e desempenho dos parceiros e construtoras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentUser?.role === 'admin' && agencies.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-300 shrink-0">
                  Agência:
                </label>
                <select
                  value={activeAgency?.id || ''}
                  onChange={(e) => {
                    const sel = agencies.find((a) => a.id === e.target.value);
                    if (sel) setCurrentAgency(sel);
                  }}
                  className="syncz-agency-select px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/45 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                >
                  {agencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onBackToSchedule}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Agenda
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrar por cliente, CPF, parceiro ou construtora..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              {/* Period */}
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Todo o Período</option>
                <option value="today">Hoje</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mês</option>
              </select>

              {/* Partner */}
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Todos os Parceiros</option>
                {regularPartners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Construtora */}
              <select
                value={construtoraFilter}
                onChange={(e) => setConstrutoraFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Todas Construtoras</option>
                <option value="__individual__">Imóvel Individual</option>
                {construtoras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Outcome */}
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Todos os Pareceres</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Reprovado">Reprovado</option>
                <option value="Remarcar">Remarcar</option>
                <option value="Não compareceu">Não compareceu</option>
                <option value="Pendente">Aguardando Avaliação</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main KPI Row (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Entrevistas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
            <span>Total de Entrevistas</span>
            <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {totalEntrevistas}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Agendadas nesta agência
          </div>
        </div>

        {/* Aprovados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
            <span>Aprovados</span>
            <span className="p-2 rounded-xl bg-[#00a8ff]/15 border border-[#00a8ff]/35 text-[#00a8ff]">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#00a8ff] mt-2">
            {totalAprovados}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalAvaliados > 0 ? `${approvalRate}% dos avaliados` : 'Sem dados avaliados'}
          </div>
        </div>

        {/* Reprovados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
            <span>Reprovados</span>
            <span className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2">
            {totalNegados}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalAvaliados > 0 ? `${denialRate}% dos avaliados` : 'Nenhuma reprovação'}
          </div>
        </div>

        {/* Taxa de Ocupação da Agência */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
            <span>Ocupação de Horários</span>
            <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
            {occupancyRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {bookedSlotsCount} de {totalSlotsCount} horários preenchidos
          </div>
        </div>
      </div>

      {/* Secondary Row: Outcomes Overview & Fidelização Financial Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outcome Breakdown Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Distribuição dos Pareceres
            </h3>
            <span className="text-xs text-slate-400">{totalEntrevistas} no total</span>
          </div>

          {/* Visual Bar */}
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex">
            {totalEntrevistas > 0 ? (
              <>
                <div
                  style={{ width: `${(totalAprovados / totalEntrevistas) * 100}%` }}
                  className="bg-[#00a8ff] h-full transition-all"
                  title={`Aprovados: ${totalAprovados}`}
                />
                <div
                  style={{ width: `${(totalNegados / totalEntrevistas) * 100}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`Reprovados: ${totalNegados}`}
                />
                <div
                  style={{ width: `${(totalRemarcar / totalEntrevistas) * 100}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Remarcar: ${totalRemarcar}`}
                />
                <div
                  style={{ width: `${(totalNaoCompareceu / totalEntrevistas) * 100}%` }}
                  className="bg-orange-500 h-full transition-all"
                  title={`Não compareceu: ${totalNaoCompareceu}`}
                />
                <div
                  style={{ width: `${(totalPendentes / totalEntrevistas) * 100}%` }}
                  className="bg-slate-600 h-full transition-all"
                  title={`Aguardando: ${totalPendentes}`}
                />
              </>
            ) : (
              <div className="w-full bg-slate-800 h-full" />
            )}
          </div>

          {/* 5 Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-[#00a8ff]/30 text-center">
              <span className="block text-[11px] text-slate-400 font-medium">Aprovados</span>
              <strong className="text-base text-[#00a8ff] font-extrabold">{totalAprovados}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/30 text-center">
              <span className="block text-[11px] text-slate-400 font-medium">Reprovados</span>
              <strong className="text-base text-rose-400 font-extrabold">{totalNegados}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 text-center">
              <span className="block text-[11px] text-slate-400 font-medium">Remarcar</span>
              <strong className="text-base text-amber-400 font-extrabold">{totalRemarcar}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-orange-500/30 text-center">
              <span className="block text-[11px] text-slate-400 font-medium">Não Compareceu</span>
              <strong className="text-base text-orange-400 font-extrabold">{totalNaoCompareceu}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-center col-span-2 sm:col-span-1">
              <span className="block text-[11px] text-slate-400 font-medium">Aguardando</span>
              <strong className="text-base text-slate-300 font-extrabold">{totalPendentes}</strong>
            </div>
          </div>
        </div>

        {/* Fidelização Financial Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              Volume de Fidelização
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-extrabold">
              {formatMoney(fidelizacaoStats.total)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Total Geral em Fidelização
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
                {formatMoney(fidelizacaoStats.total)}
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <span className="block font-semibold text-white">
                {fidelizacaoStats.totalCount}{' '}
                {fidelizacaoStats.totalCount === 1 ? 'contrato' : 'contratos'}
              </span>
              com fidelização
            </div>
          </div>

          {/* Breakdown by Responsible: Cliente, Parceiro, Construtora */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">Cliente</span>
              <strong className="text-sm font-extrabold text-cyan-400 font-mono block mt-1">
                {formatMoney(fidelizacaoStats.clienteTotal)}
              </strong>
              <span className="text-[10px] text-slate-500">
                {fidelizacaoStats.clienteCount} registros
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">Parceiro</span>
              <strong className="text-sm font-extrabold text-blue-400 font-mono block mt-1">
                {formatMoney(fidelizacaoStats.parceiroTotal)}
              </strong>
              <span className="text-[10px] text-slate-500">
                {fidelizacaoStats.parceiroCount} registros
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">Construtora</span>
              <strong className="text-sm font-extrabold text-amber-400 font-mono block mt-1">
                {formatMoney(fidelizacaoStats.construtoraTotal)}
              </strong>
              <span className="text-[10px] text-slate-500">
                {fidelizacaoStats.construtoraCount} registros
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Performance Table / Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Desempenho por Parceiro Negocial
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhe a quantidade de agendamentos, aprovações e fidelização de cada parceiro na agência.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 self-start sm:self-auto">
            {partnersBreakdown.length} parceiros com entrevistas
          </span>
        </div>

        {partnersBreakdown.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 border border-slate-800/80 rounded-2xl text-slate-400 text-xs">
            Nenhum agendamento encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {partnersBreakdown.map((item, idx) => {
              const pAvaliados = item.aprovados + item.negados;
              const pApproval =
                pAvaliados > 0
                  ? Math.round((item.aprovados / pAvaliados) * 100)
                  : 0;

              return (
                <div
                  key={item.id}
                  className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}º
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{item.name}</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Representante: {item.representative}
                          {item.phone && ` • ${item.phone}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Fidelização:</span>
                        <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                          {formatMoney(item.fidelizacaoTotal)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs pt-1 border-t border-slate-800/70">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400">Entrevistas</span>
                      <span className="font-extrabold text-white text-sm">{item.entrevistas}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400">Aprovados</span>
                      <span className="font-extrabold text-[#00a8ff] text-sm">
                        {item.aprovados}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400">Reprovados</span>
                      <span className="font-extrabold text-rose-400 text-sm">{item.negados}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400">Remarcar</span>
                      <span className="font-semibold text-amber-400 text-sm">
                        {item.remarcar}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400">Não Compareceu</span>
                      <span className="font-semibold text-orange-400 text-sm">
                        {item.naoCompareceu}
                      </span>
                    </div>

                    <div className="flex flex-col col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-slate-400">Taxa de Aprovação</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-16 h-2 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            style={{ width: `${pApproval}%` }}
                            className="bg-[#00a8ff] h-full"
                          />
                        </div>
                        <span className="font-extrabold text-cyan-300 text-xs">{pApproval}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Construtoras & Empreendimentos Performance */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Desempenho por Construtora e Empreendimento
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Entrevistas vinculadas a cada construtora, seus empreendimentos específicos e imóveis individuais.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 self-start sm:self-auto">
            {construtorasBreakdown.length} grupos identificados
          </span>
        </div>

        {construtorasBreakdown.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 border border-slate-800/80 rounded-2xl text-slate-400 text-xs">
            Nenhuma construtora com agendamentos nos filtros atuais.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {construtorasBreakdown.map((group) => {
              const empEntries = Array.from(group.empreendimentos.entries());
              const parceirosEntries = Array.from(group.parceiros.values()).sort(
                (a, b) => b.count - a.count
              );
              const gAvaliados = group.aprovados + group.negados;
              const gApproval =
                gAvaliados > 0
                  ? Math.round((group.aprovados / gAvaliados) * 100)
                  : 0;

              return (
                <div
                  key={group.name}
                  className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {group.logoUrl ? (
                        <img
                          src={group.logoUrl}
                          alt={group.name}
                          className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-800 p-0.5 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : group.isIndividual ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-white truncate">
                        {group.name}
                      </h4>
                    </div>

                    <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white shrink-0">
                      {group.entrevistas} entrevistas
                    </span>
                  </div>

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-[#00a8ff]/30 text-center">
                      <span className="text-[10px] text-slate-400 block">Aprovados</span>
                      <strong className="text-sm font-extrabold text-[#00a8ff]">
                        {group.aprovados}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-rose-500/30 text-center">
                      <span className="text-[10px] text-slate-400 block">Reprovados</span>
                      <strong className="text-sm font-extrabold text-rose-400">
                        {group.negados}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">Aprovação</span>
                      <strong className="text-sm font-extrabold text-cyan-300">
                        {gApproval}%
                      </strong>
                    </div>
                  </div>

                  {/* List of Empreendimentos */}
                  {!group.isIndividual && empEntries.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Empreendimentos Atendidos ({empEntries.length}):
                      </span>
                      <div className="space-y-1">
                        {empEntries.map(([empName, count]) => (
                          <div
                            key={empName}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/40 text-slate-300"
                          >
                            <span className="truncate">{empName}</span>
                            <span className="font-semibold text-white ml-2 shrink-0">
                              {count} {count === 1 ? 'entrevista' : 'entrevistas'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* List of Parceiros for Imóvel Individual */}
                  {group.isIndividual && parceirosEntries.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center justify-between">
                        <span>Parceiros ({parceirosEntries.length}):</span>
                        <span className="text-[10px] text-emerald-400 font-medium">Entrevistas</span>
                      </span>
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                        {parceirosEntries.map((p) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/40 text-slate-300"
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="font-semibold text-white ml-2 shrink-0">
                              {p.count} {p.count === 1 ? 'entrevista' : 'entrevistas'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
