import React, { useState, useMemo, useEffect } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { TimeSlot, Booking, ConstrutoraEmpreendimento } from '../types/index.ts';
import {
  DAYS_OF_WEEK,
  getMonday,
  addDays,
  formatDateToISO,
  formatNumericDate,
  formatPortugueseDate,
  formatFullPortugueseDate,
  downloadICS,
} from '../utils/dateUtils.ts';
import {
  BRAZILIAN_STATES,
  CITIES_BY_STATE_FALLBACK,
  fetchCitiesByState,
} from '../utils/brazilLocations.ts';
import { SlotCard } from './SlotCard.tsx';
import {
  CalendarDays,
  Clock,
  ShieldCheck,
  Video,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  CheckCircle2,
  CalendarCheck,
  Download,
  AlertCircle,
  User,
  CreditCard,
  Home,
  Building,
  Building2,
  FileText,
  Edit3,
  ArrowLeft,
  Search,
  X,
  PlusCircle,
  Loader2,
  Trash2,
  BarChart3,
  XCircle,
} from 'lucide-react';

interface PartnerViewProps {
  onBookSlot?: (slot: TimeSlot, booking?: Booking) => void;
  isConstrutoraView?: boolean;
}

export const PartnerView: React.FC<PartnerViewProps> = ({
  onBookSlot,
  isConstrutoraView = false,
}) => {
  const {
    agencies,
    slots,
    bookings,
    consultants,
    currentPartner,
    currentUser,
    adminPerspective,
    construtoraActiveView,
    setConstrutoraActiveView,
    togglePartnerConstrutoraAccess,
    partners,
    setCurrentAgency,
    setCurrentPartner,
    cancelBooking,
    openPartnerModal,
    updatePartner,
  } = useRealtime();

  const isConstrutora = Boolean(
    isConstrutoraView ||
      currentUser?.role === 'construtora' ||
      (currentUser?.role === 'admin' && adminPerspective === 'construtora_view')
  );

  const partnerId =
    currentUser?.role === 'partner' || currentUser?.role === 'construtora'
      ? currentUser.partnerId || currentUser.id
      : currentPartner?.id;

  const partnerFromList = partners.find((p) => p.id === partnerId);
  const regularPartnerFromList =
    partnerFromList && partnerFromList.segment?.toLowerCase() !== 'construtora'
      ? partnerFromList
      : partners.find((p) => p.segment?.toLowerCase() !== 'construtora');
  const construtoraFromList =
    partnerFromList && partnerFromList.segment?.toLowerCase() === 'construtora'
      ? partnerFromList
      : partners.find((p) => p.segment?.toLowerCase() === 'construtora');

  const activePartner = isConstrutora
    ? construtoraFromList ||
      (currentUser?.role === 'construtora'
        ? {
            id: currentUser.partnerId || currentUser.id,
            name: currentUser.name || 'Construtora',
            representative: currentUser.representative || currentUser.name || 'Construtora',
            email: currentUser.email || '',
            phone: '',
            cnpj: currentUser.cnpj || '',
            badgeColor: currentUser.badgeColor || 'bg-amber-500',
            segment: 'Construtora',
            password: 'construtora123',
          }
        : {
            id: 'construtora_default',
            name: 'Construtora',
            representative: 'Construtora',
            email: '',
            phone: '',
            cnpj: '',
            badgeColor: 'bg-amber-500',
            segment: 'Construtora',
            password: 'construtora123',
            allowedAgencyIds: [],
          })
    : regularPartnerFromList ||
      (currentUser?.role === 'partner'
        ? {
            id: currentUser.partnerId || currentUser.id,
            name: currentUser.name,
            representative: currentUser.representative || currentUser.name,
            email: currentUser.email,
            phone: '',
            cnpj: currentUser.cnpj || '',
            badgeColor: currentUser.badgeColor || 'bg-emerald-500',
            segment: 'Negócios Corporativos',
            password: 'parceiro123',
          }
        : {
            id: 'p1',
            name: 'Empresa Parceira',
            representative: 'Representante',
            email: '',
            phone: '',
            cnpj: '',
            badgeColor: 'bg-emerald-500',
            segment: 'Parceiro',
            password: 'parceiro123',
          });

  const [activeTab, setActiveTab] = useState<'available_slots' | 'my_bookings'>('available_slots');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0);

  // Only agencies that have selected/authorized this partner or construtora can be accessed
  const allowedAgencies = useMemo(() => {
    const allowedIds = Array.isArray(activePartner.allowedAgencyIds)
      ? activePartner.allowedAgencyIds
      : [];
    return agencies
      .filter((ag) => allowedIds.includes(ag.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }, [agencies, activePartner.allowedAgencyIds]);

  useEffect(() => {
    if (allowedAgencies.length === 1) {
      const singleAgency = allowedAgencies[0];
      if (selectedAgencyId !== singleAgency.id) {
        setSelectedAgencyId(singleAgency.id);
        setCurrentAgency(singleAgency);
      }
      return;
    }
    if (selectedAgencyId && !allowedAgencies.some((a) => a.id === selectedAgencyId)) {
      setSelectedAgencyId('');
    }
  }, [allowedAgencies, selectedAgencyId, setCurrentAgency]);

  const isSelectedAgencyAllowed = useMemo(() => {
    if (!selectedAgencyId) return false;
    return allowedAgencies.some((ag) => ag.id === selectedAgencyId);
  }, [allowedAgencies, selectedAgencyId]);

  // Today / Day mode state ("Hoje", "Ontem", "Amanhã", etc.)
  const [isTodayMode, setIsTodayMode] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  // Filters (none selected by default -> shows all days)
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Search filter by partner, construtora, client name, or client CPF
  const [searchTerm, setSearchTerm] = useState('');

  // Cancel dialog
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const matchesBookingSearch = (b: Booking | undefined, queryStr: string): boolean => {
    const rawTerm = queryStr.trim().toLowerCase();
    if (!rawTerm) return true;
    if (!b) return false;
    const cleanCpfTerm = rawTerm.replace(/\D/g, '');
    const partnerMatch = (b.partnerName || '').toLowerCase().includes(rawTerm);
    const construtoraMatch = (b.construtoraName || '').toLowerCase().includes(rawTerm);
    const clientNameMatch = (b.clientName || '').toLowerCase().includes(rawTerm);
    const clientCpfMatch =
      (b.clientCpf || '').toLowerCase().includes(rawTerm) ||
      (cleanCpfTerm.length > 0 && (b.clientCpf || '').replace(/\D/g, '').includes(cleanCpfTerm));
    return partnerMatch || construtoraMatch || clientNameMatch || clientCpfMatch;
  };

  // Calculate target date when in daily (Hoje) mode
  const targetDayDate = useMemo(() => {
    const d = addDays(new Date(), dayOffset);
    return {
      dateObj: d,
      dateStr: formatDateToISO(d),
    };
  }, [dayOffset]);

  // Calculate current displayed week dates
  const baseMonday = useMemo(() => {
    if (isTodayMode) {
      return getMonday(targetDayDate.dateObj);
    }
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset, isTodayMode, targetDayDate]);

  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = addDays(baseMonday, offset);
      return {
        dateStr: formatDateToISO(d),
        dateObj: d,
        dayOfWeek: d.getDay(),
        label: DAYS_OF_WEEK.find((dw) => dw.id === d.getDay())?.name || '',
        short: DAYS_OF_WEEK.find((dw) => dw.id === d.getDay())?.short || '',
      };
    });
  }, [baseMonday]);

  // Filter slots for this week
  const weekDateSet = useMemo(() => new Set(weekDays.map((w) => w.dateStr)), [weekDays]);

  const todayIso = formatDateToISO(new Date());

  const activeConstrutoraNameLower = (activePartner.name || '').trim().toLowerCase();

  const doesBookingBelongToConstrutora = (b: Booking): boolean => {
    if (b.propertyType !== 'Empreendimento') return false;
    if (b.construtoraId && b.construtoraId === activePartner.id) return true;
    if (
      b.construtoraName &&
      activeConstrutoraNameLower &&
      b.construtoraName.trim().toLowerCase() === activeConstrutoraNameLower
    ) {
      return true;
    }
    return false;
  };

  // All visible slots for this week (before day filter) for the selected agency
  // Do not show available slots from past days, only bookings
  const weekVisibleSlots = useMemo(() => {
    if (!selectedAgencyId || !isSelectedAgencyAllowed) return [];
    return slots.filter((slot) => {
      if (slot.agencyId !== selectedAgencyId) return false;
      if (!weekDateSet.has(slot.date)) return false;
      if (slot.status === 'available') {
        if (slot.date <= todayIso) return false;
        return true;
      }
      if (slot.status === 'booked') {
        const b = bookings.find((bk) => bk.id === slot.bookingId && bk.status !== 'cancelled');
        if (!b) return false;
        if (isConstrutora) {
          return doesBookingBelongToConstrutora(b);
        }
        return b.partnerId === activePartner.id;
      }
      return false;
    });
  }, [
    slots,
    bookings,
    activePartner.id,
    activeConstrutoraNameLower,
    isConstrutora,
    weekDateSet,
    selectedAgencyId,
    isSelectedAgencyAllowed,
    todayIso,
  ]);

  // Effective day filter (either from Hoje/daily mode or day chip click)
  const effectiveDayFilter = isTodayMode ? targetDayDate.dateStr : selectedDayFilter;

  const filteredSlots = useMemo(() => {
    const dayFiltered = !effectiveDayFilter
      ? weekVisibleSlots
      : weekVisibleSlots.filter((slot) => slot.date === effectiveDayFilter);

    if (!searchTerm.trim()) return dayFiltered;

    return dayFiltered.filter((slot) => {
      if (slot.status !== 'booked' || !slot.bookingId) return false;
      const booking = bookings.find((b) => b.id === slot.bookingId && b.status !== 'cancelled');
      return matchesBookingSearch(booking, searchTerm);
    });
  }, [weekVisibleSlots, effectiveDayFilter, searchTerm, bookings]);

  // Available slots count (only starting from the next day for partners and for the selected agency/day/week)
  const availableThisWeekCount = useMemo(() => {
    if (!selectedAgencyId || !isSelectedAgencyAllowed) return 0;
    return filteredSlots.filter((s) => s.status === 'available').length;
  }, [filteredSlots, selectedAgencyId, isSelectedAgencyAllowed]);

  // Partner's / Construtora's bookings filtered by selected agency, week, or specific day and search term, ordered by date and time
  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (b.status !== 'confirmed') return false;
        if (selectedAgencyId) {
          if (b.agencyId !== selectedAgencyId) return false;
        } else {
          if (!allowedAgencies.some((ag) => ag.id === b.agencyId)) return false;
        }

        const slot = slots.find((sl) => sl.id === b.slotId);
        const bookingDate = slot?.date || b.slotDate || '';
        if (effectiveDayFilter) {
          if (bookingDate !== effectiveDayFilter) return false;
        } else {
          if (!weekDateSet.has(bookingDate)) return false;
        }

        if (isConstrutora) {
          if (!doesBookingBelongToConstrutora(b)) return false;
        } else {
          if (b.partnerId !== activePartner.id) return false;
        }

        return matchesBookingSearch(b, searchTerm);
      })
      .sort((a, b) => {
        const slotA = slots.find((sl) => sl.id === a.slotId);
        const slotB = slots.find((sl) => sl.id === b.slotId);
        const dateA = slotA?.date || a.slotDate || '';
        const dateB = slotB?.date || b.slotDate || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = slotA?.startTime || a.slotStartTime || '';
        const timeB = slotB?.startTime || b.slotStartTime || '';
        return timeA.localeCompare(timeB);
      });
  }, [
    bookings,
    slots,
    activePartner.id,
    activeConstrutoraNameLower,
    isConstrutora,
    selectedAgencyId,
    allowedAgencies,
    effectiveDayFilter,
    weekDateSet,
    searchTerm,
  ]);

  // Group all week visible slots by date (to filter out days with no schedule)
  const allWeekSlotsByDate = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    weekDays.forEach((wd) => map.set(wd.dateStr, []));

    weekVisibleSlots.forEach((slot) => {
      const list = map.get(slot.date) || [];
      list.push(slot);
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(slot.date, list);
    });

    return map;
  }, [weekVisibleSlots, weekDays]);

  // Days of the week that actually have at least one schedule
  const activeWeekDays = useMemo(() => {
    return weekDays.filter((wd) => (allWeekSlotsByDate.get(wd.dateStr) || []).length > 0);
  }, [weekDays, allWeekSlotsByDate]);

  // Group filtered slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    weekDays.forEach((wd) => map.set(wd.dateStr, []));

    filteredSlots.forEach((slot) => {
      const list = map.get(slot.date) || [];
      list.push(slot);
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(slot.date, list);
    });

    return map;
  }, [filteredSlots, weekDays]);

  const sortedPartners = useMemo(() => {
    return [...partners]
      .filter((p) => p.segment?.toLowerCase() !== 'construtora')
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
      );
  }, [partners]);

  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, 'Cancelado pelo parceiro negocial');
    setCancellingBookingId(null);
  };

  const handlePartnerBookSlot = (slot: TimeSlot, booking?: Booking) => {
    if (isConstrutora) return;
    // Only allow new booking inclusions starting from the next day (block past days and today)
    if (!booking && slot.date <= todayIso) {
      return;
    }
    if (onBookSlot) onBookSlot(slot, booking);
  };

  // Empreendimentos state for Construtora view
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<ConstrutoraEmpreendimento | null>(null);
  const [empName, setEmpName] = useState('');
  const [empState, setEmpState] = useState('SP');
  const [empCitiesList, setEmpCitiesList] = useState<string[]>(
    CITIES_BY_STATE_FALLBACK['SP'] || ['São Paulo']
  );
  const [empCity, setEmpCity] = useState('São Paulo');
  const [empAddress, setEmpAddress] = useState('');
  const [empDescription, setEmpDescription] = useState('');
  const [empSubmitting, setEmpSubmitting] = useState(false);
  const [empDeleting, setEmpDeleting] = useState(false);
  const [confirmEmpDelete, setConfirmEmpDelete] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  const formatTitleCaseWords = (value: string) => {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (word) =>
          word.charAt(0).toLocaleUpperCase('pt-BR') +
          word.slice(1).toLocaleLowerCase('pt-BR')
      )
      .join(' ');
  };

  useEffect(() => {
    if (!isEmpModalOpen) return;
    let active = true;
    const fallback = CITIES_BY_STATE_FALLBACK[empState] || [];
    setEmpCitiesList(fallback);
    if (fallback.length > 0 && !fallback.includes(empCity)) {
      setEmpCity(fallback[0]);
    }

    fetchCitiesByState(empState).then((list) => {
      if (!active || list.length === 0) return;
      setEmpCitiesList(list);
      setEmpCity((prev) => (list.includes(prev) ? prev : list[0]));
    });

    return () => {
      active = false;
    };
  }, [empState, isEmpModalOpen]);

  const handleEmpStateChange = (newUf: string) => {
    setEmpState(newUf);
    const fallback = CITIES_BY_STATE_FALLBACK[newUf] || [];
    if (fallback.length > 0) {
      setEmpCity(fallback[0]);
    } else {
      setEmpCity('');
    }
  };

  const construtoraEmpreendimentos = useMemo(() => {
    const list = Array.isArray(activePartner.empreendimentos) ? activePartner.empreendimentos : [];
    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [activePartner.empreendimentos]);

  const openNewEmpModal = () => {
    const defaultUf = 'SP';
    const defaultCities = CITIES_BY_STATE_FALLBACK[defaultUf] || ['São Paulo'];
    setEditingEmp(null);
    setEmpName('');
    setEmpState(defaultUf);
    setEmpCitiesList(defaultCities);
    setEmpCity(defaultCities[0] || '');
    setEmpAddress('');
    setEmpDescription('');
    setConfirmEmpDelete(false);
    setEmpError(null);
    setIsEmpModalOpen(true);
  };

  const openEditEmpModal = (emp: ConstrutoraEmpreendimento) => {
    const initialUf = emp.state || 'SP';
    const fallbackCities = CITIES_BY_STATE_FALLBACK[initialUf] || [];
    setEditingEmp(emp);
    setEmpName(emp.name || '');
    setEmpState(initialUf);
    setEmpCitiesList(
      emp.city && !fallbackCities.includes(emp.city)
        ? [emp.city, ...fallbackCities]
        : fallbackCities
    );
    setEmpCity(emp.city || fallbackCities[0] || '');
    setEmpAddress(emp.address || '');
    setEmpDescription(emp.description || '');
    setConfirmEmpDelete(false);
    setEmpError(null);
    setIsEmpModalOpen(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      setEmpError('Por favor informe o nome do empreendimento.');
      return;
    }

    setEmpSubmitting(true);
    setEmpError(null);

    const formattedName = formatTitleCaseWords(empName);
    const formattedAddress = empAddress.trim() ? formatTitleCaseWords(empAddress) : '';
    const formattedDescription = empDescription.trim()
      ? formatTitleCaseWords(empDescription)
      : '';

    try {
      const currentList = Array.isArray(activePartner.empreendimentos)
        ? activePartner.empreendimentos
        : [];
      let nextList: ConstrutoraEmpreendimento[];

      if (editingEmp) {
        nextList = currentList.map((item) =>
          item.id === editingEmp.id
            ? {
                ...item,
                name: formattedName,
                state: empState,
                city: empCity,
                address: formattedAddress,
                description: formattedDescription,
              }
            : item
        );
      } else {
        const newEmp: ConstrutoraEmpreendimento = {
          id: `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: formattedName,
          state: empState,
          city: empCity,
          address: formattedAddress,
          description: formattedDescription,
          createdAt: new Date().toISOString(),
        };
        nextList = [...currentList, newEmp];
      }

      await updatePartner(activePartner.id, {
        ...activePartner,
        empreendimentos: nextList,
      });
      setIsEmpModalOpen(false);
    } catch (err: any) {
      setEmpError(err.message || 'Erro ao salvar empreendimento.');
    } finally {
      setEmpSubmitting(false);
    }
  };

  const handleDeleteEmp = async () => {
    if (!editingEmp) return;
    if (!confirmEmpDelete) {
      setConfirmEmpDelete(true);
      return;
    }

    setEmpDeleting(true);
    setEmpError(null);
    try {
      const currentList = Array.isArray(activePartner.empreendimentos)
        ? activePartner.empreendimentos
        : [];
      const nextList = currentList.filter((item) => item.id !== editingEmp.id);
      await updatePartner(activePartner.id, {
        ...activePartner,
        empreendimentos: nextList,
      });
      setIsEmpModalOpen(false);
    } catch (err: any) {
      setEmpError(err.message || 'Erro ao excluir empreendimento.');
    } finally {
      setEmpDeleting(false);
    }
  };

  // Construtora Dashboard state & metrics
  const [dashboardAgencyFilter, setDashboardAgencyFilter] = useState<string>('all');

  const construtoraDashboardData = useMemo(() => {
    // All confirmed Empreendimento bookings explicitly linked to this construtora
    const allConstrutoraBookings = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      if (dashboardAgencyFilter !== 'all' && b.agencyId !== dashboardAgencyFilter) {
        return false;
      }
      return doesBookingBelongToConstrutora(b);
    });

    const totalEmpreendimentos = construtoraEmpreendimentos.length;
    const totalEntrevistas = allConstrutoraBookings.length;
    const totalAprovados = allConstrutoraBookings.filter(
      (b) => b.outcome === 'Aprovado'
    ).length;
    const totalNegados = allConstrutoraBookings.filter(
      (b) => b.outcome === 'Reprovado'
    ).length;

    const matchedBookingIds = new Set<string>();

    const perEmpreendimento = construtoraEmpreendimentos.map((emp) => {
      const empNameLower = (emp.name || '').trim().toLowerCase();
      const empBookings = allConstrutoraBookings.filter((b) => {
        const matchId = Boolean(b.empreendimentoId && b.empreendimentoId === emp.id);
        const matchName =
          Boolean(b.empreendimentoName && empNameLower) &&
          b.empreendimentoName!.trim().toLowerCase() === empNameLower;
        if (matchId || matchName) {
          matchedBookingIds.add(b.id);
          return true;
        }
        return false;
      });

      const entrevistas = empBookings.length;
      const aprovados = empBookings.filter((b) => b.outcome === 'Aprovado').length;
      const negados = empBookings.filter((b) => b.outcome === 'Reprovado').length;
      const pendentes = Math.max(0, entrevistas - aprovados - negados);

      return {
        emp,
        entrevistas,
        aprovados,
        negados,
        pendentes,
      };
    });

    const unmatchedBookings = allConstrutoraBookings.filter(
      (b) => !matchedBookingIds.has(b.id)
    );
    const unmatchedStats = {
      entrevistas: unmatchedBookings.length,
      aprovados: unmatchedBookings.filter((b) => b.outcome === 'Aprovado').length,
      negados: unmatchedBookings.filter((b) => b.outcome === 'Reprovado').length,
    };

    return {
      totalEmpreendimentos,
      totalEntrevistas,
      totalAprovados,
      totalNegados,
      perEmpreendimento,
      unmatchedStats,
    };
  }, [
    bookings,
    activePartner.id,
    activePartner.name,
    construtoraEmpreendimentos,
    dashboardAgencyFilter,
  ]);

  if (isConstrutora && construtoraActiveView === 'dashboard') {
    const {
      totalEmpreendimentos,
      totalEntrevistas,
      totalAprovados,
      totalNegados,
      perEmpreendimento,
      unmatchedStats,
    } = construtoraDashboardData;

    const approvalRate =
      totalEntrevistas > 0 ? Math.round((totalAprovados / totalEntrevistas) * 100) : 0;
    const denialRate =
      totalEntrevistas > 0 ? Math.round((totalNegados / totalEntrevistas) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-3.5 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Dashboard —{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  {activePartner.name}
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
                Acompanhe a quantidade de empreendimentos, entrevistas por empreendimento, aprovados e negados.
              </p>
            </div>

            {allowedAgencies.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-semibold text-slate-300 shrink-0">
                  Agência:
                </label>
                <select
                  value={dashboardAgencyFilter}
                  onChange={(e) => setDashboardAgencyFilter(e.target.value)}
                  className="syncz-agency-select px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/45 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                >
                  <option value="all">Todas as Agências ({allowedAgencies.length})</option>
                  {allowedAgencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setConstrutoraActiveView('schedule')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Agenda
            </button>

            <button
              type="button"
              onClick={() => setConstrutoraActiveView('empreendimentos')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              Gerenciar Empreendimentos
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
              <span>Empreendimentos</span>
              <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {totalEmpreendimentos}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Cadastrados na construtora
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
              <span>Total de Entrevistas</span>
              <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <CalendarCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mt-2">
              {totalEntrevistas}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Agendamentos vinculados
            </div>
          </div>

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
              {totalEntrevistas > 0
                ? `${approvalRate}% das entrevistas`
                : 'Nenhuma entrevista avaliada'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
              <span>Negados</span>
              <span className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-400">
                <XCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2">
              {totalNegados}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {totalEntrevistas > 0
                ? `${denialRate}% das entrevistas`
                : 'Nenhuma entrevista negada'}
            </div>
          </div>
        </div>

        {/* Breakdown per Empreendimento */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Entrevistas por Empreendimento
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detalhamento de entrevistas realizadas, aprovados e negados em cada empreendimento.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 self-start sm:self-auto">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              {totalEmpreendimentos}{' '}
              {totalEmpreendimentos === 1 ? 'empreendimento' : 'empreendimentos'}
            </span>
          </div>

          {perEmpreendimento.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 text-center">
              <Building2 className="w-9 h-9 text-amber-400 mx-auto mb-2.5 opacity-80" />
              <h4 className="text-sm sm:text-base font-bold text-white">
                Nenhum empreendimento cadastrado
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Cadastre os empreendimentos da construtora para acompanhar o número de entrevistas, aprovados e negados por empreendimento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {perEmpreendimento.map(({ emp, entrevistas, aprovados, negados }) => {
                const locationLabel = emp.city
                  ? `${emp.city}${emp.state ? `/${emp.state}` : ''}`
                  : emp.state || '';
                const aprovadosPct =
                  entrevistas > 0 ? Math.round((aprovados / entrevistas) * 100) : 0;
                const negadosPct =
                  entrevistas > 0 ? Math.round((negados / entrevistas) * 100) : 0;

                return (
                  <div
                    key={emp.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-sm sm:text-base truncate">
                              {emp.name}
                            </h4>
                            {(locationLabel || emp.address) && (
                              <p className="text-xs text-slate-400 truncate">
                                {[locationLabel, emp.address].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Badges for this Empreendimento */}
                      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3 shrink-0">
                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[92px]">
                          <div className="text-[11px] font-semibold text-slate-400">
                            Entrevistas
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                            {entrevistas}
                          </div>
                        </div>

                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-[#00a8ff]/35 text-center min-w-[92px]">
                          <div className="text-[11px] font-semibold text-[#00a8ff]">
                            Aprovados
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-[#00a8ff] mt-0.5">
                            {aprovados}
                          </div>
                        </div>

                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-rose-500/35 text-center min-w-[92px]">
                          <div className="text-[11px] font-semibold text-rose-400">
                            Negados
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-rose-400 mt-0.5">
                            {negados}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar when there is at least 1 interview */}
                    {entrevistas > 0 && (
                      <div className="space-y-1">
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                          {aprovados > 0 && (
                            <div
                              style={{ width: `${(aprovados / entrevistas) * 100}%` }}
                              className="h-full bg-[#00a8ff] transition-all"
                              title={`Aprovados: ${aprovados} (${aprovadosPct}%)`}
                            />
                          )}
                          {negados > 0 && (
                            <div
                              style={{ width: `${(negados / entrevistas) * 100}%` }}
                              className="h-full bg-rose-500 transition-all"
                              title={`Negados: ${negados} (${negadosPct}%)`}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Aprovação: {aprovadosPct}%</span>
                          <span>Negados: {negadosPct}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {unmatchedStats.entrevistas > 0 && (
                <div className="bg-slate-950/50 border border-slate-800/80 border-dashed rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-300 text-sm">
                      Sem empreendimento especificado
                    </h4>
                    <p className="text-xs text-slate-400">
                      Agendamentos vinculados à construtora sem empreendimento selecionado
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3 shrink-0">
                    <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[92px]">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Entrevistas
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                        {unmatchedStats.entrevistas}
                      </div>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-slate-900 border border-[#00a8ff]/35 text-center min-w-[92px]">
                      <div className="text-[11px] font-semibold text-[#00a8ff]">
                        Aprovados
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-[#00a8ff] mt-0.5">
                        {unmatchedStats.aprovados}
                      </div>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-slate-900 border border-rose-500/35 text-center min-w-[92px]">
                      <div className="text-[11px] font-semibold text-rose-400">
                        Negados
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-rose-400 mt-0.5">
                        {unmatchedStats.negados}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isConstrutora && construtoraActiveView === 'empreendimentos') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3.5 pt-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Empreendimentos
            </h2>
            <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
              Gerencie os empreendimentos cadastrados na construtora.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setConstrutoraActiveView('schedule')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Agenda
            </button>

            <button
              type="button"
              onClick={openNewEmpModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Empreendimento
            </button>
          </div>
        </div>

        {construtoraEmpreendimentos.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
            <Building2 className="w-9 h-9 text-amber-400 mx-auto mb-2.5 opacity-80" />
            <h4 className="text-sm sm:text-base font-bold text-white">
              Nenhum empreendimento cadastrado
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Clique em &ldquo;Novo Empreendimento&rdquo; para cadastrar os empreendimentos da construtora.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {construtoraEmpreendimentos.map((emp) => {
              const locationLabel = emp.city
                ? `${emp.city}${emp.state ? `/${emp.state}` : ''}`
                : emp.state || '';
              return (
                <div
                  key={emp.id}
                  onClick={() => openEditEmpModal(emp)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-amber-300 transition-colors">
                      {emp.name}
                    </h4>
                    {(locationLabel || emp.address) && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {[locationLabel, emp.address].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isEmpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 text-white shadow-2xl relative my-auto">
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(false)}
                disabled={empSubmitting || empDeleting}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pr-8 pb-4 border-b border-slate-800">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {editingEmp ? 'Editar Empreendimento' : 'Novo Empreendimento'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingEmp
                      ? 'Altere os dados do empreendimento ou exclua o cadastro'
                      : 'Cadastre um novo empreendimento na construtora'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveEmp} className="mt-4 space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Empreendimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="Ex: Residencial Parque Das Águas"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estado (UF)
                    </label>
                    <select
                      value={empState}
                      onChange={(e) => handleEmpStateChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                    >
                      {BRAZILIAN_STATES.map((st) => (
                        <option key={st.uf} value={st.uf}>
                          {st.uf} - {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cidade
                    </label>
                    <select
                      value={empCity}
                      onChange={(e) => setEmpCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                    >
                      {empCitiesList.map((cityName) => (
                        <option key={cityName} value={cityName}>
                          {cityName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Endereço / Localização
                  </label>
                  <input
                    type="text"
                    value={empAddress}
                    onChange={(e) => setEmpAddress(e.target.value)}
                    placeholder="Ex: Setor Noroeste, Quadra 10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Observações / Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={empDescription}
                    onChange={(e) => setEmpDescription(e.target.value)}
                    placeholder="Informações adicionais sobre o empreendimento..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm resize-none"
                  />
                </div>

                {empError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {empError}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  {editingEmp ? (
                    <button
                      type="button"
                      disabled={empSubmitting || empDeleting}
                      onClick={handleDeleteEmp}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        confirmEmpDelete
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                          : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {empDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          {confirmEmpDelete ? 'Confirmar Exclusão' : 'Excluir Cadastro'}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={empSubmitting || empDeleting}
                      onClick={() => setIsEmpModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={empSubmitting || empDeleting}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {empSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {editingEmp ? 'Salvar Alterações' : 'Cadastrar Empreendimento'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isConstrutora && construtoraActiveView === 'partners') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3.5 pt-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Parceiros Negociais
            </h2>
            <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
              Gerencie os parceiros cadastrados no ecossistema da construtora.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setConstrutoraActiveView('schedule')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Agenda
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {sortedPartners.map((partner) => {
            const isAllowed =
              Array.isArray(partner.allowedConstrutoraIds) &&
              partner.allowedConstrutoraIds.includes(activePartner.id);

            return (
              <div
                key={partner.id}
                onClick={() => togglePartnerConstrutoraAccess(partner.id, activePartner.id)}
                className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isAllowed}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => togglePartnerConstrutoraAccess(partner.id, activePartner.id)}
                    title={
                      isAllowed
                        ? 'Parceiro habilitado para esta construtora'
                        : 'Marque para permitir que este parceiro selecione esta construtora nos agendamentos'
                    }
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer accent-cyan-500 shrink-0"
                  />
                  <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-emerald-300 transition-colors">
                    {partner.name}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Partner / Construtora Header - Directly on background */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">{activePartner.name}</span>
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 w-full leading-relaxed">
            {isConstrutora
              ? 'Visualize as agendas e os horários da semana.'
              : 'Gerencie os horários disponíveis para negociações da semana.'}
          </p>
        </div>

        {isConstrutora && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConstrutoraActiveView('dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Week Tag + Day Filter Chips + View Buttons Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 text-xs">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar agendamento por parceiro, construtora, nome ou CPF do cliente..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-cyan-500/45 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              title="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Agency Selector above Semana Atual (without divider line) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="partner-agency-selector"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0"
          >
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Agência:</span>
          </label>
          <select
            id="partner-agency-selector"
            value={selectedAgencyId}
            onChange={(e) => {
              const newAgencyId = e.target.value;
              setSelectedAgencyId(newAgencyId);
              const found = agencies.find((ag) => ag.id === newAgencyId);
              if (found) {
                setCurrentAgency(found);
              }
            }}
            className="syncz-agency-select w-full sm:max-w-md px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/45 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
          >
            {allowedAgencies.length !== 1 && (
              <option value="">Selecione uma agência...</option>
            )}
            {allowedAgencies.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
                {ag.city ? ` — ${ag.city}${ag.state ? `/${ag.state}` : ''}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Week Tag + Day Filter Chips (Side by side on desktop) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Week Tag */}
          <div className="syncz-week-tag inline-flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-cyan-500/45 w-full sm:w-auto justify-between sm:justify-start shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isTodayMode) {
                  setDayOffset((p) => p - 1);
                } else {
                  setWeekOffset((p) => p - 1);
                  setSelectedDayFilter(null);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isTodayMode) {
                  setIsTodayMode(false);
                  setDayOffset(0);
                  setWeekOffset(0);
                  setSelectedDayFilter(null);
                } else {
                  setIsTodayMode(true);
                  setDayOffset(0);
                  setWeekOffset(0);
                  setSelectedDayFilter(null);
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Alternar entre Hoje e Semanas"
            >
              {isTodayMode
                ? dayOffset === 0
                  ? 'Hoje'
                  : dayOffset === -1
                    ? 'Ontem'
                    : dayOffset === 1
                      ? 'Amanhã'
                      : `Dia (${dayOffset > 0 ? `+${dayOffset}` : dayOffset}) · ${formatNumericDate(targetDayDate.dateStr)}`
                : weekOffset === 0
                  ? 'Semana Atual'
                  : weekOffset === 1
                    ? 'Próxima Semana'
                    : weekOffset === -1
                      ? 'Semana Passada'
                      : `Semana (${weekOffset > 0 ? `+${weekOffset}` : weekOffset})`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isTodayMode) {
                  setDayOffset((p) => p + 1);
                } else {
                  setWeekOffset((p) => p + 1);
                  setSelectedDayFilter(null);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Avançar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Filter Chips (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {weekDays.map((wd) => (
              <button
                key={wd.dateStr}
                type="button"
                onClick={() => {
                  if (isTodayMode) {
                    setIsTodayMode(false);
                    setDayOffset(0);
                    setSelectedDayFilter(wd.dateStr);
                  } else {
                    setSelectedDayFilter((prev) => (prev === wd.dateStr ? null : wd.dateStr));
                  }
                }}
                className={`px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-center transition-all cursor-pointer border ${
                  effectiveDayFilter === wd.dateStr
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-sm'
                    : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
                }`}
              >
                {wd.short}
              </button>
            ))}
          </div>
        </div>

        {/* Two Buttons below the days: Horários da Semana & Meus Agendamentos */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('available_slots')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'available_slots'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-md shadow-cyan-500/25'
                : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              Horários da Semana ({availableThisWeekCount}<span className="hidden sm:inline"> disponíveis</span>)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_bookings')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'my_bookings'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-md shadow-indigo-500/25'
                : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Meus Agendamentos ({myBookings.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AVAILABLE SLOTS EXPLORER */}
      {activeTab === 'available_slots' && (
        <div className="space-y-4">
          {!selectedAgencyId ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              Selecione uma agência acima para visualizar os horários desta agência.
            </div>
          ) : activeWeekDays.length === 0 || filteredSlots.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              {isTodayMode
                ? 'Nenhum horário aberto para este dia nesta agência.'
                : 'Nenhum horário aberto para esta semana nesta agência.'}
            </div>
          ) : (
            /* Weekly Slots List Directly on Background */
            <div className="space-y-4 w-full">
              {activeWeekDays.map((wd) => {
                if (effectiveDayFilter && effectiveDayFilter !== wd.dateStr) {
                  return null;
                }

                const daySlots = slotsByDate.get(wd.dateStr) || [];
                if (daySlots.length === 0) return null;

                return (
                  <div key={wd.dateStr} className="space-y-2 w-full">
                    {/* Day Header Directly on Background */}
                    <div className="font-bold text-base text-white px-0.5">
                      {wd.label}, {formatNumericDate(wd.dateStr)}
                    </div>

                    {/* Day Slots Directly on Background */}
                    <div className="grid grid-cols-1 gap-2.5 w-full">
                      {daySlots.map((slot) => {
                        const booking = slot.bookingId
                          ? bookings.find((b) => b.id === slot.bookingId)
                          : undefined;

                        return (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            booking={booking}
                            onBookSlot={isConstrutora ? undefined : handlePartnerBookSlot}
                            isPartnerView={!isConstrutora}
                            isConstrutoraView={isConstrutora}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKINGS */}
      {activeTab === 'my_bookings' && (
        <div className="space-y-3">
          {myBookings.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">
                Nenhum agendamento ativo para {activePartner.name}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                {isConstrutora
                  ? 'Consulte a aba de horários da semana para visualizar a agenda.'
                  : 'Explore a aba de horários da semana e clique em um horário aberto para preencher os dados do agendamento com confirmação automática imediata.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('available_slots')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/25"
              >
                Ver Horários Disponíveis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 w-full">
              {myBookings.map((b) => {
                const slot = slots.find((sl) => sl.id === b.slotId) || {
                  id: b.slotId,
                  agencyId: b.agencyId,
                  date: b.slotDate,
                  startTime: b.slotStartTime,
                  endTime: b.slotEndTime,
                  durationMinutes: 60,
                  consultantId: 'c1',
                  consultantName: b.consultantName,
                  consultantRole: 'Consultor',
                  serviceCategory: b.serviceCategory,
                  modality: b.modality,
                  locationOrLink: b.locationOrLink,
                  status: 'booked' as const,
                  bookingId: b.id,
                  createdAt: new Date().toISOString(),
                };

                return (
                  <SlotCard
                    key={b.id}
                    slot={slot}
                    booking={b}
                    onBookSlot={isConstrutora ? undefined : handlePartnerBookSlot}
                    isPartnerView={!isConstrutora}
                    isConstrutoraView={isConstrutora}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cancel dialog */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" /> Cancelar este Agendamento?
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Você tem certeza de que deseja cancelar este agendamento? O horário voltará a ficar disponível imediatamente na grade para outros parceiros negociais.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingBookingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Sim, Cancelar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
