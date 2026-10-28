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
    adminPerspective,
    deleteSlot,
    updateBookingOutcome,
    updateBookingSegmento,
  } = useRealtime();

  const [isOutcomeMenuOpen, setIsOutcomeMenuOpen] = useState(false);
  const [isSegmentoMenuOpen, setIsSegmentoMenuOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
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
  const isPartnerInclusionBlocked =
    (activeRole === 'partner' || activeRole === 'construtora') &&
    !isBooked &&
    slot.date <= todayIso;

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

  if (activeRole === 'agency' && !isBooked && slot.date < todayIso) {
    return null;
  }

  const handleCardClick = () => {
    if (isReadOnlyConstrutora) return;
    if (isOutcomeMenuOpen || isSegmentoMenuOpen) return;
    if (!isBooked) {
      if (isPartnerInclusionBlocked) return;
      if (onBookSlot) onBookSlot(slot);
    } else if (isBooked && booking && onBookSlot) {
      if (activeRole === 'agency' || isBookedByCurrentPartner) {
        onBookSlot(slot, booking);
      }
    }
  };

  const currentOutcomeConfig = booking?.outcome
    ? OUTCOME_OPTIONS.find((o) => o.value === booking.outcome)
    : undefined;

  const OutcomeBadgeIcon = currentOutcomeConfig?.icon;

  return (
    <div
      onClick={handleCardClick}
      title={
        isReadOnlyConstrutora
          ? undefined
          : isBooked && booking
            ? 'Clique no card para editar este agendamento'
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
            ? `${currentOutcomeConfig.cardClass} ${isReadOnlyConstrutora ? '!cursor-default' : ''}`
            : isReadOnlyConstrutora
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
                className="syncz-booking-meta-text flex items-center gap-2 text-white font-bold text-sm min-w-0 truncate"
                title={formatTitleCase(booking.clientName || booking.partnerRepresentative || 'Cliente Negocial')}
              >
                <User className="syncz-booking-meta-icon w-[18px] h-[18px] text-slate-400 shrink-0" />
                <span className="syncz-booking-meta-text text-sm font-bold text-white truncate">
                  {formatTitleCase(booking.clientName || booking.partnerRepresentative || 'Cliente Negocial')}
                </span>
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


