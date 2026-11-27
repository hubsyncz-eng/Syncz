import React, { useState, useRef, useEffect } from 'react';
import { TimeSlot, Booking, BookingOutcome, BookingSegmento } from '../types/index.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { formatPortugueseDate, formatDateToISO } from '../utils/dateUtils.ts';
import {
  Clock,
  CalendarPlus,
  Trash2,
  User,
  CreditCard,
  Building,
  Building2,
  Home,
  FileText,
  Banknote,
  Layers,
  Menu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
  Check,
  X,
} from 'lucide-react';

interface SlotCardProps {
  slot: TimeSlot;
  booking?: Booking;
  onBookSlot?: (slot: TimeSlot, booking?: Booking) => void;
  isPartnerView?: boolean;
  isConstrutoraView?: boolean;
}

const OUTCOME_OPTIONS: {
  value: BookingOutcome;
  label: string;
  icon: React.FC<{ className?: string }>;
  iconBtnClass: string;
  cardClass: string;
  itemActiveClass: string;
}[] = [
  {
    value: 'Aprovado',
    label: 'Aprovado',
    icon: CheckCircle2,
    iconBtnClass:
      'syncz-outcome-icon-aprovado bg-[#00a8ff]/20 text-[#00a8ff] border-[#00a8ff]/50 hover:bg-[#00a8ff]/30',
    cardClass:
      'syncz-slot-outcome-aprovado bg-[#00a8ff]/10 border-[#00a8ff]/45 shadow-sm hover:border-[#00a8ff] cursor-pointer',
    itemActiveClass: 'bg-[#00a8ff]/20 text-[#00a8ff] border-[#00a8ff]/50',
  },
  {
    value: 'Reprovado',
    label: 'Reprovado',
    icon: XCircle,
    iconBtnClass:
      'syncz-outcome-icon-reprovado bg-rose-500/20 text-rose-300 border-rose-500/45 hover:bg-rose-500/30',
    cardClass:
      'syncz-slot-outcome-reprovado bg-rose-950/30 border-rose-400/45 shadow-sm hover:border-rose-400 cursor-pointer',
    itemActiveClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    value: 'Remarcar',
    label: 'Remarcar',
    icon: RefreshCw,
    iconBtnClass:
      'syncz-outcome-icon-remarcar bg-amber-500/20 text-amber-300 border-amber-500/45 hover:bg-amber-500/30',
    cardClass:
      'syncz-slot-outcome-remarcar bg-amber-950/30 border-amber-400/45 shadow-sm hover:border-amber-400 cursor-pointer',
    itemActiveClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    value: 'Não compareceu',
    label: 'Não compareceu',
    icon: UserX,
    iconBtnClass:
      'syncz-outcome-icon-nao-compareceu bg-orange-500/20 text-orange-300 border-orange-500/45 hover:bg-orange-500/30',
    cardClass:
      'syncz-slot-outcome-nao-compareceu bg-orange-950/30 border-orange-400/45 shadow-sm hover:border-orange-400 cursor-pointer',
    itemActiveClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
];

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  booking,
  onBookSlot,
  isPartnerView = false,
  isConstrutoraView = false,
}) => {
  const {
    currentUser,
    currentPartner,
    partners,
    agencies,
    bookings,
    currentAgency,
    adminPerspective,
    deleteSlot,
    updateBookingOutcome,
    updateBookingSegmento,
  } = useRealtime();

  const [isOutcomeMenuOpen, setIsOutcomeMenuOpen] = useState(false);
  const [isSegmentoMenuOpen, setIsSegmentoMenuOpen] = useState(false);
  const [isCpfHistoryOpen, setIsCpfHistoryOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const bookingConstrutora =
    booking?.propertyType === 'Empreendimento'
      ? partners.find(
          (p) =>
            p.segment?.toLowerCase() === 'construtora' &&
            ((booking.construtoraId && p.id === booking.construtoraId) ||
              (booking.construtoraName &&
                p.name?.toLowerCase() === booking.construtoraName.toLowerCase()))
        )
      : undefined;
  const construtoraLogoUrl = bookingConstrutora?.logoUrl?.trim() || '';

  useEffect(() => {
    setLogoLoadError(false);
  }, [construtoraLogoUrl]);

  useEffect(() => {
    if (!isOutcomeMenuOpen && !isSegmentoMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOutcomeMenuOpen(false);
        setIsSegmentoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOutcomeMenuOpen, isSegmentoMenuOpen]);

  const activeRole = isConstrutoraView
    ? 'construtora'
    : isPartnerView
      ? 'partner'
      : currentUser?.role === 'admin'
        ? adminPerspective === 'agency_view'
          ? 'agency'
          : adminPerspective === 'construtora_view'
            ? 'construtora'
            : 'partner'
        : currentUser?.role || 'partner';

  const isReadOnlyConstrutora = activeRole === 'construtora';

  const activePartnerId =
    currentUser?.role === 'partner' || currentUser?.role === 'construtora'
      ? currentUser.partnerId || currentUser.id
      : currentPartner?.id || 'p1';

  const isBooked = slot.status === 'booked';
  const isLocked = slot.status === 'locked';

  const todayIso = formatDateToISO(new Date());
  const bookingDateIso = slot.date || booking?.slotDate || '';
  const isPartnerInclusionBlocked =
    (activeRole === 'partner' || activeRole === 'construtora') &&
    !isBooked &&
    slot.date <= todayIso;
  const isPartnerEditBlocked =
    activeRole === 'partner' && isBooked && bookingDateIso <= todayIso;

  const activeConstrutoraProfile = isReadOnlyConstrutora
    ? partners.find((p) => p.id === activePartnerId) || currentPartner
    : undefined;
  const activeConstrutoraNameLower = (
    activeConstrutoraProfile?.name ||
    (currentUser?.role === 'construtora' ? currentUser.name : '') ||
    ''
  )
    .trim()
    .toLowerCase();

  // Check if booked by currently active partner (or explicitly linked to construtora when in construtora view)
  const isBookedByCurrentPartner =
    isBooked &&
    booking &&
    (isReadOnlyConstrutora
      ? booking.propertyType === 'Empreendimento' &&
        (booking.construtoraId === activePartnerId ||
          (Boolean(booking.construtoraName && activeConstrutoraNameLower) &&
            booking.construtoraName!.trim().toLowerCase() === activeConstrutoraNameLower))
      : booking.partnerId === activePartnerId);

  // In partner / construtora view, hide other bookings, locked slots, and unbookable free slots completely
  if (activeRole === 'partner' || activeRole === 'construtora') {
    if (isBooked && !isBookedByCurrentPartner) return null;
    if (isLocked) return null;
    if (!isBooked && slot.date <= todayIso) return null;
  }

  const activeAgencyId =
    currentUser?.role === 'agency'
      ? currentUser.agencyId || currentUser.id
      : currentAgency?.id;

  if (activeRole === 'agency') {
    const slotAgencyId = slot.agencyId || booking?.agencyId;
    if (activeAgencyId && slotAgencyId !== activeAgencyId) {
      return null;
    }
    if (!isBooked && slot.date < todayIso) {
      return null;
    }
  }

  const handleCardClick = () => {
    if (isReadOnlyConstrutora) return;
    if (isOutcomeMenuOpen || isSegmentoMenuOpen) return;
    if (!isBooked) {
      if (isPartnerInclusionBlocked) return;
      if (onBookSlot) onBookSlot(slot);
    } else if (isBooked && booking && onBookSlot) {
      if (isPartnerEditBlocked) return;
      if (activeRole === 'agency' || isBookedByCurrentPartner) {
        onBookSlot(slot, booking);
      }
    }
  };

  const currentOutcomeConfig = booking?.outcome
    ? OUTCOME_OPTIONS.find((o) => o.value === booking.outcome)
    : undefined;

  const OutcomeBadgeIcon = currentOutcomeConfig?.icon;

  const normalizedClientCpf = (booking?.clientCpf || '').replace(/\D/g, '');
  const matchingCpfBookings =
    normalizedClientCpf.length >= 11
      ? bookings
          .filter(
            (b) =>
              b.status !== 'cancelled' &&
              (b.clientCpf || '').replace(/\D/g, '') === normalizedClientCpf
          )
          .sort((a, b) => {
            const dateCmp = (b.slotDate || '').localeCompare(a.slotDate || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.slotStartTime || '').localeCompare(a.slotStartTime || '');
          })
      : [];
  const cpfBookingCount = matchingCpfBookings.length;

  const slotAgency =
    agencies.find((a) => a.id === (booking?.agencyId || slot.agencyId)) || currentAgency;
  const fullClientName = formatTitleCase(
    booking?.clientName || booking?.partnerRepresentative || 'Cliente'
  );
  const clientFirstName = fullClientName.trim().split(/\s+/)[0] || 'Cliente';
  const cleanAgencyName = (slotAgency?.name || '')
    .trim()
    .replace(/^ag[êe]ncia\s+/i, '');
  const agencyAddress = (slotAgency?.address || '').trim();
  const agencyCity = (slotAgency?.city || '').trim();
  const agencyLocation = [agencyAddress, agencyCity].filter(Boolean).join(' ');
  const dateParts = slot.date.split('-');
  const dayMonth =
    dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : slot.date;

  const whatsappMessage = booking
    ? `Olá ${clientFirstName}, sua entrevista na Agência ${cleanAgencyName} que fica na ${agencyLocation} está confirmada para dia ${dayMonth} às ${slot.startTime}.`
    : '';
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div
      onClick={handleCardClick}
      title={
        isReadOnlyConstrutora
          ? undefined
          : isBooked && booking
            ? isPartnerEditBlocked
              ? 'Agendamentos passados e do dia não podem ser editados ou excluídos por parceiros'
              : 'Clique no card para editar este agendamento'
            : !isBooked
              ? isPartnerInclusionBlocked
                ? 'Agendamentos para parceiros só são permitidos a partir do próximo dia'
                : 'Clique para agendar este horário'
              : undefined
      }
      className={`syncz-slot-card rounded-2xl p-3.5 transition-all duration-200 border relative group ${
        !isBooked
          ? isPartnerInclusionBlocked
            ? 'syncz-slot-disabled bg-slate-900/50 border-slate-800/80 opacity-60 cursor-not-allowed'
            : isReadOnlyConstrutora
              ? 'syncz-slot-available bg-slate-900/90 border-slate-700 cursor-default'
              : 'syncz-slot-available bg-slate-900/90 border-slate-700 hover:border-slate-500 hover:shadow-md cursor-pointer'
          : currentOutcomeConfig
            ? `${currentOutcomeConfig.cardClass} ${
                isReadOnlyConstrutora || isPartnerEditBlocked ? '!cursor-default' : ''
              }`
            : isReadOnlyConstrutora || isPartnerEditBlocked
              ? 'syncz-slot-booked-partner bg-slate-900/90 border-slate-700 cursor-default'
              : 'syncz-slot-booked-partner bg-slate-900/90 border-slate-700 hover:border-slate-500 hover:shadow-md cursor-pointer'
      }`}
    >
      {!isBooked ? (
        /* Available Slot: Single row with Time & Date on the left and Action Icons on the right */
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-base font-semibold text-white min-w-0 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <Clock className="syncz-booking-meta-icon w-[18px] h-[18px] shrink-0 text-slate-400" />
              <span className="syncz-booking-meta-text syncz-booking-time-text text-base font-extrabold text-white shrink-0">
                {slot.startTime}
              </span>
            </div>
            <span className="syncz-booking-date-text text-base font-semibold truncate text-slate-400">
              - {formatPortugueseDate(slot.date)}
            </span>
          </div>

          {!isReadOnlyConstrutora && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isPartnerInclusionBlocked}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPartnerInclusionBlocked) return;
                  if (onBookSlot) onBookSlot(slot);
                }}
                className={
                  isPartnerInclusionBlocked
                    ? 'syncz-slot-disabled-btn p-[7px] rounded-xl bg-slate-800/70 text-slate-500 border border-slate-700/70 flex items-center justify-center shrink-0 cursor-not-allowed opacity-60'
                    : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all flex items-center justify-center shrink-0 cursor-pointer'
                }
                title={
                  isPartnerInclusionBlocked
                    ? 'Inclusão não permitida para o dia atual ou dias passados (somente a partir do próximo dia)'
                    : 'Clique para fazer o cadastro deste horário'
                }
              >
                <CalendarPlus className="w-[18px] h-[18px]" />
              </button>

              {activeRole === 'agency' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlot(slot.id);
                  }}
                  title="Excluir este horário"
                  className="syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : booking ? (
        /* Booked Slot:
           - Desktop: Left side has only Time & Date centered (matching available slots); right side has 2 columns (Col 1: Client Name over CPF; Col 2: Partner over Value) + action icons.
           - Mobile: Top row has Time & Date + action icons; bottom section stacks Client Name, CPF, Partner, Value. */
        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(215px,0.95fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_auto] items-center gap-x-2 gap-y-2 md:gap-x-4 md:gap-y-0">
          {/* Lado esquerdo: Apenas Horário e Data, centralizado */}
          <div className="order-1 md:order-1 flex items-center gap-1.5 text-base font-semibold text-white min-w-0 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <Clock
                className={`syncz-booking-meta-icon w-[18px] h-[18px] shrink-0 ${
                  booking.outcome === 'Reprovado'
                    ? 'text-rose-400'
                    : booking.outcome === 'Aprovado'
                      ? 'text-[#00a8ff]'
                      : booking.outcome === 'Remarcar'
                        ? 'text-amber-400'
                        : booking.outcome === 'Não compareceu'
                          ? 'text-orange-400'
                          : 'text-slate-400'
                }`}
              />
              <span className="syncz-booking-meta-text syncz-booking-time-text text-base font-extrabold text-white shrink-0">
                {slot.startTime}
              </span>
            </div>
            <span
              className={`syncz-booking-date-text text-base font-semibold truncate ${
                booking.outcome === 'Reprovado'
                  ? 'text-rose-400'
                  : booking.outcome === 'Aprovado'
                    ? 'text-[#00a8ff]'
                    : booking.outcome === 'Remarcar'
                      ? 'text-amber-400'
                      : booking.outcome === 'Não compareceu'
                        ? 'text-orange-400'
                        : 'text-slate-400'
              }`}
            >
              - {formatPortugueseDate(slot.date)}
            </span>
          </div>

          {/* Duas colunas à direita no desktop (1ª: Nome e embaixo CPF | 2ª: Parceiro e embaixo Valor) */}
          <div className="order-3 col-span-2 md:order-2 md:col-span-2 border-t border-slate-800/80 pt-2 md:border-t-0 md:pt-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-4 text-sm min-w-0">
            {/* 1ª Coluna: Nome do Cliente e embaixo CPF */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div
                className="syncz-booking-meta-text flex items-center gap-2 text-white font-bold text-sm min-w-0"
                title={formatTitleCase(booking.clientName || booking.partnerRepresentative || 'Cliente Negocial')}
              >
                <User className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                <span className="syncz-booking-meta-text text-sm font-bold text-white truncate">
                  {formatTitleCase(booking.clientName || booking.partnerRepresentative || 'Cliente Negocial')}
                </span>
                {cpfBookingCount > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCpfHistoryOpen(true);
                    }}
                    title={`Este CPF possui ${cpfBookingCount} agendamentos registrados na rede. Clique para ver todos os agendamentos e agências.`}
                    className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 hover:border-amber-400 text-[11px] font-extrabold leading-none tabular-nums shrink-0 transition-colors cursor-pointer"
                  >
                    {cpfBookingCount}x
                  </button>
                )}
              </div>

              <div className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm min-w-0 truncate">
                <CreditCard className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">
                  {booking.clientCpf || 'Não informado'}
                </span>
              </div>
            </div>

            {/* 2ª Coluna: Parceiro e embaixo Valor */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div
                className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm min-w-0 truncate"
                title={formatTitleCase(booking.partnerName)}
              >
                <Building2 className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">
                  {formatTitleCase(booking.partnerName)}
                </span>
              </div>

              <div
                className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm min-w-0 truncate"
                title={`Fidelização: R$ ${booking.fidelizacaoValor || '0,00'}${
                  booking.fidelizacaoResponsavel || (booking.isConstrutora ? 'Construtora' : '')
                    ? ` • ${booking.fidelizacaoResponsavel || 'Construtora'}`
                    : ''
                }`}
              >
                <Banknote className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">
                  R$ {booking.fidelizacaoValor || '0,00'}
                  {booking.fidelizacaoResponsavel || booking.isConstrutora
                    ? ` • ${booking.fidelizacaoResponsavel || 'Construtora'}`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Ícones no canto direito: Tipo de Imóvel / Logo da Construtora, Nota, Segmento e Status */}
          <div className="order-2 md:order-3 flex items-center justify-end gap-1.5 shrink-0 relative" ref={menuRef}>
            {/* Ícone de Imóvel Residencial / Individual ou Empreendimento (ou Logo da Construtora se houver) */}
            <span
              className={
                booking.propertyType === 'Empreendimento' &&
                construtoraLogoUrl &&
                !logoLoadError
                  ? `w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${
                      currentOutcomeConfig
                        ? currentOutcomeConfig.iconBtnClass
                        : 'bg-slate-800/80 border-slate-700'
                    }`
                  : currentOutcomeConfig
                    ? `p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${currentOutcomeConfig.iconBtnClass}`
                    : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0'
              }
              title={
                booking.propertyType === 'Empreendimento'
                  ? [
                      'Empreendimento',
                      booking.construtoraName,
                      booking.empreendimentoName,
                    ]
                      .filter(Boolean)
                      .join(' • ')
                  : 'Imóvel Individual'
              }
            >
              {booking.propertyType === 'Empreendimento' ? (
                construtoraLogoUrl && !logoLoadError ? (
                  <img
                    src={construtoraLogoUrl}
                    alt={booking.construtoraName || 'Construtora'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-[18px] h-[18px] shrink-0" />
                )
              ) : (
                <Home className="w-[18px] h-[18px] shrink-0" />
              )}
            </span>

            {/* Ícone de Nota (quando houver nota digitada) */}
            {Boolean(booking.partnerNotes && booking.partnerNotes.trim()) && (
              <span
                className={
                  currentOutcomeConfig
                    ? `p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${currentOutcomeConfig.iconBtnClass}`
                    : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0'
                }
                title={`Nota: ${booking.partnerNotes!.trim()}`}
              >
                <FileText className="w-[18px] h-[18px] shrink-0" />
              </span>
            )}

            {activeRole !== 'agency' && currentOutcomeConfig && OutcomeBadgeIcon && (
              <span
                className={`p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${currentOutcomeConfig.iconBtnClass}`}
                title={`Status: ${currentOutcomeConfig.label}`}
              >
                <OutcomeBadgeIcon className="w-[18px] h-[18px] shrink-0" />
              </span>
            )}

            {activeRole === 'partner' && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(whatsappMessage).catch(() => {});
                  }
                  setWhatsappCopied(true);
                  setTimeout(() => setWhatsappCopied(false), 2000);
                }}
                title={
                  whatsappCopied
                    ? 'Mensagem copiada! Abrindo WhatsApp...'
                    : `Enviar confirmação no WhatsApp:\n"${whatsappMessage}"`
                }
                className={
                  currentOutcomeConfig
                    ? `p-[7px] rounded-xl border transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${currentOutcomeConfig.iconBtnClass}`
                    : 'syncz-available-icon-btn p-[7px] rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 hover:text-emerald-300 transition-all flex items-center justify-center shrink-0 cursor-pointer'
                }
              >
                {whatsappCopied ? (
                  <Check className="w-[18px] h-[18px] shrink-0" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-[18px] h-[18px] shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                )}
              </a>
            )}

            {activeRole === 'agency' && (
              <>
                {/* Ícone de seleção de Segmento (Varejo / Carteira) visível apenas para a agência */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOutcomeMenuOpen(false);
                    setIsSegmentoMenuOpen((prev) => !prev);
                  }}
                  title={
                    booking.segmento
                      ? `Segmento: ${booking.segmento} (clique para alterar)`
                      : 'Selecionar segmento (Varejo ou Carteira)'
                  }
                  className={
                    currentOutcomeConfig
                      ? `p-[7px] rounded-xl border transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${currentOutcomeConfig.iconBtnClass}`
                      : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all flex items-center justify-center shrink-0 cursor-pointer'
                  }
                >
                  {booking.segmento === 'Varejo' ? (
                    <span className="w-[18px] h-[18px] flex items-center justify-center text-[13px] font-extrabold leading-none shrink-0">
                      V
                    </span>
                  ) : booking.segmento === 'Carteira' ? (
                    <span className="w-[18px] h-[18px] flex items-center justify-center text-[13px] font-extrabold leading-none shrink-0">
                      C
                    </span>
                  ) : (
                    <Layers className="w-[18px] h-[18px] shrink-0" />
                  )}
                </button>

                {isSegmentoMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="syncz-agency-menu absolute right-8 top-full mt-1.5 w-40 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in"
                  >
                    {(['Varejo', 'Carteira'] as BookingSegmento[]).map((seg) => {
                      const isSelected = booking.segmento === seg;
                      const letter = seg === 'Varejo' ? 'V' : 'C';
                      return (
                        <button
                          key={seg}
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsSegmentoMenuOpen(false);
                            await updateBookingSegmento(
                              booking.id,
                              isSelected ? null : seg
                            );
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#00a8ff]/20 text-[#00a8ff] border-[#00a8ff]/50'
                              : 'border-transparent text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-md bg-slate-800/90 border border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-white shrink-0">
                              {letter}
                            </span>
                            <span>{seg}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSegmentoMenuOpen(false);
                    setIsOutcomeMenuOpen((prev) => !prev);
                  }}
                  title={
                    currentOutcomeConfig
                      ? `Status: ${currentOutcomeConfig.label} (clique para alterar)`
                      : 'Definir parecer / status do agendamento'
                  }
                  className={
                    currentOutcomeConfig
                      ? `p-[7px] rounded-xl border transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${currentOutcomeConfig.iconBtnClass}`
                      : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all flex items-center justify-center shrink-0 cursor-pointer'
                  }
                >
                  <Menu className="w-[18px] h-[18px] shrink-0" />
                </button>

                {isOutcomeMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="syncz-agency-menu absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in"
                  >
                    {OUTCOME_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = booking.outcome === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsOutcomeMenuOpen(false);
                            await updateBookingOutcome(
                              booking.id,
                              isSelected ? null : opt.value
                            );
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? opt.itemActiveClass
                              : 'border-transparent text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{opt.label}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      {isCpfHistoryOpen && booking && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsCpfHistoryOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in cursor-default"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700/90 rounded-3xl max-w-4xl w-full p-5 sm:p-7 text-white shadow-2xl relative my-auto max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-extrabold text-sm shrink-0 tabular-nums">
                  {cpfBookingCount}x
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
                    Histórico de Agendamentos do CPF
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-white">{fullClientName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-amber-300">{booking.clientCpf}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">
                      {cpfBookingCount}{' '}
                      {cpfBookingCount === 1
                        ? 'agendamento encontrado na rede'
                        : 'agendamentos encontrados na rede'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCpfHistoryOpen(false);
                }}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cards List */}
            <div className="mt-4 space-y-3.5 overflow-y-auto pr-1 flex-1">
              {matchingCpfBookings.map((item) => {
                const itemAgency = agencies.find((a) => a.id === item.agencyId);
                const itemAgencyName = itemAgency?.name || 'Agência não identificada';
                const itemAgencyCity = itemAgency?.city
                  ? `${itemAgency.city}${itemAgency.state ? `/${itemAgency.state}` : ''}`
                  : '';
                const itemOutcomeConfig = item.outcome
                  ? OUTCOME_OPTIONS.find((o) => o.value === item.outcome)
                  : undefined;
                const ItemOutcomeIcon = itemOutcomeConfig?.icon;

                const itemConstrutora =
                  item.propertyType === 'Empreendimento'
                    ? partners.find(
                        (p) =>
                          p.segment?.toLowerCase() === 'construtora' &&
                          ((item.construtoraId && p.id === item.construtoraId) ||
                            (item.construtoraName &&
                              p.name?.toLowerCase() === item.construtoraName.toLowerCase()))
                      )
                    : undefined;
                const itemConstrutoraLogo = itemConstrutora?.logoUrl?.trim() || '';

                return (
                  <div key={item.id} className="space-y-1.5">
                    {/* Indicação da Agência acima do card mantendo o card idêntico ao da lista */}
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{itemAgencyName}</span>
                        {itemAgencyCity && (
                          <span className="text-slate-400 font-medium">
                            ({itemAgencyCity})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Card idêntico ao da lista de agendamentos */}
                    <div
                      className={`syncz-slot-card rounded-2xl p-3.5 transition-all duration-200 border relative group ${
                        itemOutcomeConfig
                          ? `${itemOutcomeConfig.cardClass} !cursor-default`
                          : 'syncz-slot-booked-partner bg-slate-900/90 border-slate-700 cursor-default'
                      }`}
                    >
                      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(215px,0.95fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_auto] items-center gap-x-2 gap-y-2 md:gap-x-4 md:gap-y-0">
                        {/* Lado esquerdo: Apenas Horário e Data, centralizado */}
                        <div className="order-1 md:order-1 flex items-center gap-1.5 text-base font-semibold text-white min-w-0 flex-wrap">
                          <div className="flex items-center gap-2 shrink-0">
                            <Clock
                              className={`syncz-booking-meta-icon w-[18px] h-[18px] shrink-0 ${
                                item.outcome === 'Reprovado'
                                  ? 'text-rose-400'
                                  : item.outcome === 'Aprovado'
                                    ? 'text-[#00a8ff]'
                                    : item.outcome === 'Remarcar'
                                      ? 'text-amber-400'
                                      : item.outcome === 'Não compareceu'
                                        ? 'text-orange-400'
                                        : 'text-slate-400'
                              }`}
                            />
                            <span className="syncz-booking-meta-text syncz-booking-time-text text-base font-extrabold text-white shrink-0">
                              {item.slotStartTime}
                            </span>
                          </div>
                          <span
                            className={`syncz-booking-date-text text-base font-semibold truncate ${
                              item.outcome === 'Reprovado'
                                ? 'text-rose-400'
                                : item.outcome === 'Aprovado'
                                  ? 'text-[#00a8ff]'
                                  : item.outcome === 'Remarcar'
                                    ? 'text-amber-400'
                                    : item.outcome === 'Não compareceu'
                                      ? 'text-orange-400'
                                      : 'text-slate-400'
                            }`}
                          >
                            - {formatPortugueseDate(item.slotDate)}
                          </span>
                        </div>

                        {/* Duas colunas à direita no desktop (1ª: Nome e embaixo CPF | 2ª: Parceiro e embaixo Valor) */}
                        <div className="order-3 col-span-2 md:order-2 md:col-span-2 border-t border-slate-800/80 pt-2 md:border-t-0 md:pt-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-4 text-sm min-w-0">
                          {/* 1ª Coluna: Nome do Cliente e embaixo CPF */}
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div
                              className="syncz-booking-meta-text flex items-center gap-2 text-white font-bold text-sm min-w-0"
                              title={formatTitleCase(
                                item.clientName || item.partnerRepresentative || 'Cliente Negocial'
                              )}
                            >
                              <User className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                              <span className="syncz-booking-meta-text text-sm font-bold text-white truncate">
                                {formatTitleCase(
                                  item.clientName || item.partnerRepresentative || 'Cliente Negocial'
                                )}
                              </span>
                              {cpfBookingCount > 1 && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold leading-none tabular-nums shrink-0">
                                  {cpfBookingCount}x
                                </span>
                              )}
                            </div>

                            <div className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm min-w-0 truncate">
                              <CreditCard className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                              <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">
                                {item.clientCpf || 'Não informado'}
                              </span>
                            </div>
                          </div>

                          {/* 2ª Coluna: Parceiro e embaixo Valor */}
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div
                              className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm min-w-0 truncate"
                              title={formatTitleCase(item.partnerName)}
                            >
                              <Building2 className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                              <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">
                                {formatTitleCase(item.partnerName)}
                              </span>
                            </div>

                            <div
                              className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm min-w-0 truncate"
                              title={`Fidelização: R$ ${item.fidelizacaoValor || '0,00'}${
                                item.fidelizacaoResponsavel || (item.isConstrutora ? 'Construtora' : '')
                                  ? ` • ${item.fidelizacaoResponsavel || 'Construtora'}`
                                  : ''
                              }`}
                            >
                              <Banknote className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                              <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">
                                R$ {item.fidelizacaoValor || '0,00'}
                                {item.fidelizacaoResponsavel || item.isConstrutora
                                  ? ` • ${item.fidelizacaoResponsavel || 'Construtora'}`
                                  : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ícones no canto direito: Tipo de Imóvel / Logo da Construtora, Nota, Segmento e Status */}
                        <div className="order-2 md:order-3 flex items-center justify-end gap-1.5 shrink-0 relative">
                          {/* Ícone de Imóvel Residencial / Individual ou Empreendimento (ou Logo da Construtora se houver) */}
                          <span
                            className={
                              item.propertyType === 'Empreendimento' && itemConstrutoraLogo
                                ? `w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${
                                    itemOutcomeConfig
                                      ? itemOutcomeConfig.iconBtnClass
                                      : 'bg-slate-800/80 border-slate-700'
                                  }`
                                : itemOutcomeConfig
                                  ? `p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${itemOutcomeConfig.iconBtnClass}`
                                  : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0'
                            }
                            title={
                              item.propertyType === 'Empreendimento'
                                ? [
                                    'Empreendimento',
                                    item.construtoraName,
                                    item.empreendimentoName,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')
                                : 'Imóvel Individual'
                            }
                          >
                            {item.propertyType === 'Empreendimento' ? (
                              itemConstrutoraLogo ? (
                                <img
                                  src={itemConstrutoraLogo}
                                  alt={item.construtoraName || 'Construtora'}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building className="w-[18px] h-[18px] shrink-0" />
                              )
                            ) : (
                              <Home className="w-[18px] h-[18px] shrink-0" />
                            )}
                          </span>

                          {/* Ícone de Nota (quando houver nota digitada) */}
                          {Boolean(item.partnerNotes && item.partnerNotes.trim()) && (
                            <span
                              className={
                                itemOutcomeConfig
                                  ? `p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${itemOutcomeConfig.iconBtnClass}`
                                  : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0'
                              }
                              title={`Nota: ${item.partnerNotes!.trim()}`}
                            >
                              <FileText className="w-[18px] h-[18px] shrink-0" />
                            </span>
                          )}

                          {/* Ícone de Segmento (Varejo / Carteira) */}
                          {item.segmento && (
                            <span
                              className={
                                itemOutcomeConfig
                                  ? `p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${itemOutcomeConfig.iconBtnClass}`
                                  : 'syncz-available-icon-btn p-[7px] rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0'
                              }
                              title={`Segmento: ${item.segmento}`}
                            >
                              <span className="w-[18px] h-[18px] flex items-center justify-center text-[13px] font-extrabold leading-none shrink-0">
                                {item.segmento === 'Varejo' ? 'V' : 'C'}
                              </span>
                            </span>
                          )}

                          {/* Ícone de Status / Parecer */}
                          {itemOutcomeConfig && ItemOutcomeIcon && (
                            <span
                              className={`p-[7px] rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${itemOutcomeConfig.iconBtnClass}`}
                              title={`Status: ${itemOutcomeConfig.label}`}
                            >
                              <ItemOutcomeIcon className="w-[18px] h-[18px] shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCpfHistoryOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTitleCase(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


