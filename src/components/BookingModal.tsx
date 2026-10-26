import React, { useState } from 'react';
import { TimeSlot, Booking, PropertyType, FidelizacaoResponsavel } from '../types/index.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { formatFullPortugueseDate, formatDateToISO } from '../utils/dateUtils.ts';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  Building,
  Building2,
  ChevronDown,
  Home,
  User,
  CreditCard,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

interface BookingModalProps {
  slot: TimeSlot;
  existingBooking?: Booking;
  onClose: () => void;
  onBookingSuccess: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  existingBooking,
  onClose,
  onBookingSuccess,
}) => {
  const {
    partners,
    currentPartner,
    currentUser,
    adminPerspective,
    bookSlot,
    updateBooking,
    cancelBooking,
    slots,
  } = useRealtime();

  // Check if the inclusion/edit is being done by the agency or an agency user
  const isAgencyActor =
    currentUser?.role === 'agency' ||
    (currentUser?.role === 'admin' && adminPerspective === 'agency_view');

  const initialPartnerId = existingBooking
    ? partners.find(
        (p) => p.id === existingBooking.partnerId || p.name === existingBooking.partnerName
      )?.id || existingBooking.partnerId || ''
    : '';

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(initialPartnerId);

  const selectedPartnerFromList = partners.find((p) => p.id === selectedPartnerId);

  const activeRegularPartner =
    currentPartner && currentPartner.segment?.toLowerCase() !== 'construtora'
      ? currentPartner
      : partners.find((p) => p.segment?.toLowerCase() !== 'construtora') || currentPartner;

  const partnerProfile =
    currentUser?.role === 'partner'
      ? {
          id: currentUser.partnerId || currentUser.id,
          name: currentUser.name,
          representative: currentUser.representative || currentUser.name,
          email: currentUser.email,
          phone: '',
          cnpj: currentUser.cnpj || '',
        }
      : selectedPartnerFromList
        ? {
            id: selectedPartnerFromList.id,
            name: selectedPartnerFromList.name,
            representative: selectedPartnerFromList.representative || selectedPartnerFromList.name,
            email: selectedPartnerFromList.email,
            phone: selectedPartnerFromList.phone || '',
            cnpj: selectedPartnerFromList.cnpj || '',
          }
        : activeRegularPartner || {
            id: 'p_temp',
            name: 'Parceiro Negocial',
            representative: 'Representante',
            email: 'parceiro@empresa.com',
            phone: '',
            cnpj: '',
          };

  // Verify real-time slot state in case another partner booked it
  const currentSlotInState = slots.find((s) => s.id === slot.id) || slot;
  const isSlotStillAvailable = existingBooking || currentSlotInState.status === 'available';

  // Specific Booking Fields: Cliente, CPF, Seletor Imóvel/Empreendimento, Construtora (quando Empreendimento), Fidelização + Responsável, Parceiro (Agência), Notas
  const [clientName, setClientName] = useState(existingBooking?.clientName || '');
  const [clientCpf, setClientCpf] = useState(existingBooking?.clientCpf || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    existingBooking?.propertyType || 'Imóvel Individual'
  );

  const targetPartnerForConstrutora = isAgencyActor
    ? selectedPartnerFromList
    : partners.find((p) => p.id === partnerProfile.id) ||
      partners.find(
        (p) =>
          p.segment?.toLowerCase() !== 'construtora' &&
          ((partnerProfile.email &&
            p.email?.toLowerCase() === partnerProfile.email.toLowerCase()) ||
            (partnerProfile.name &&
              p.name?.toLowerCase() === partnerProfile.name.toLowerCase()))
      );

  const construtorasList = [...partners]
    .filter((p) => {
      if (p.segment?.toLowerCase() !== 'construtora') return false;
      if (!targetPartnerForConstrutora) return false;
      const allowed = Array.isArray(targetPartnerForConstrutora.allowedConstrutoraIds)
        ? targetPartnerForConstrutora.allowedConstrutoraIds
        : [];
      return allowed.includes(p.id);
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));

  const initialConstrutoraId = existingBooking
    ? construtorasList.find(
        (c) =>
          c.id === existingBooking.construtoraId || c.name === existingBooking.construtoraName
      )?.id || (construtorasList.length === 1 ? construtorasList[0].id : '')
    : construtorasList.length === 1
      ? construtorasList[0].id
      : '';

  const [selectedConstrutoraId, setSelectedConstrutoraId] = useState<string>(initialConstrutoraId);
  const selectedConstrutoraFromList = construtorasList.find((c) => c.id === selectedConstrutoraId);

  const empreendimentosList = React.useMemo(() => {
    const raw = selectedConstrutoraFromList?.empreendimentos;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [selectedConstrutoraFromList]);

  const initialEmpreendimentoId = existingBooking
    ? empreendimentosList.find(
        (emp) =>
          emp.id === existingBooking.empreendimentoId ||
          emp.name === existingBooking.empreendimentoName
      )?.id || (empreendimentosList.length === 1 ? empreendimentosList[0].id : '')
    : empreendimentosList.length === 1
      ? empreendimentosList[0].id
      : '';

  const [selectedEmpreendimentoId, setSelectedEmpreendimentoId] =
    useState<string>(initialEmpreendimentoId);
  const selectedEmpreendimentoFromList = empreendimentosList.find(
    (emp) => emp.id === selectedEmpreendimentoId
  );

  React.useEffect(() => {
    if (
      selectedConstrutoraId &&
      !construtorasList.some((c) => c.id === selectedConstrutoraId)
    ) {
      setSelectedConstrutoraId(construtorasList.length === 1 ? construtorasList[0].id : '');
    } else if (!selectedConstrutoraId && construtorasList.length === 1) {
      setSelectedConstrutoraId(construtorasList[0].id);
    }
  }, [construtorasList, selectedConstrutoraId]);

  React.useEffect(() => {
    if (
      selectedEmpreendimentoId &&
      !empreendimentosList.some((emp) => emp.id === selectedEmpreendimentoId)
    ) {
      setSelectedEmpreendimentoId(
        empreendimentosList.length === 1 ? empreendimentosList[0].id : ''
      );
    } else if (!selectedEmpreendimentoId && empreendimentosList.length === 1) {
      setSelectedEmpreendimentoId(empreendimentosList[0].id);
    }
  }, [empreendimentosList, selectedEmpreendimentoId]);

  const [fidelizacaoValor, setFidelizacaoValor] = useState(
    existingBooking?.fidelizacaoValor || ''
  );
  const [fidelizacaoResponsavel, setFidelizacaoResponsavel] = useState<
    FidelizacaoResponsavel | ''
  >(
    existingBooking?.fidelizacaoResponsavel ||
      (existingBooking?.isConstrutora ? 'Construtora' : '')
  );
  const [partnerNotes, setPartnerNotes] = useState(existingBooking?.partnerNotes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCancelBooking = async () => {
    if (!existingBooking) {
      onClose();
      return;
    }

    setIsCancelling(true);
    setErrorMsg(null);
    const ok = await cancelBooking(
      existingBooking.id,
      currentUser?.role === 'agency'
        ? 'Cancelado pela Agência Centralizadora'
        : 'Cancelado pelo parceiro negocial'
    );
    setIsCancelling(false);
    if (ok) {
      onClose();
    }
  };

  // Helper for CPF masking (000.000.000-00)
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Helper for BRL Currency masking (0.000,00)
  const formatCurrencyBRL = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    if (isNaN(cents) || cents === 0) return '';
    const numeric = cents / 100;
    return numeric.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const todayIso = formatDateToISO(new Date());
    if (!existingBooking && !isAgencyActor && slot.date <= todayIso) {
      setErrorMsg('Agendamentos para parceiros só são permitidos a partir do próximo dia.');
      return;
    }
    if (!existingBooking && !isSlotStillAvailable) {
      setErrorMsg('Este horário acabou de ser reservado por outro parceiro ou bloqueado pela agência.');
      return;
    }

    if (!clientName.trim()) {
      setErrorMsg('Por favor informe o nome do Cliente.');
      return;
    }

    if (!clientCpf.trim() || clientCpf.replace(/\D/g, '').length < 11) {
      setErrorMsg('Por favor informe um CPF válido (11 dígitos).');
      return;
    }

    if (propertyType === 'Empreendimento' && construtorasList.length > 0 && !selectedConstrutoraFromList) {
      setErrorMsg('Por favor selecione a construtora do empreendimento.');
      return;
    }

    if (isAgencyActor && !selectedPartnerFromList) {
      setErrorMsg('Por favor selecione um dos parceiros cadastrados.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const finalConstrutoraId =
      propertyType === 'Empreendimento' ? selectedConstrutoraFromList?.id || '' : '';
    const finalConstrutoraName =
      propertyType === 'Empreendimento' ? selectedConstrutoraFromList?.name || '' : '';
    const finalEmpreendimentoId =
      propertyType === 'Empreendimento' ? selectedEmpreendimentoFromList?.id || '' : '';
    const finalEmpreendimentoName =
      propertyType === 'Empreendimento' ? selectedEmpreendimentoFromList?.name || '' : '';

    try {
      if (existingBooking) {
        const updated = await updateBooking(existingBooking.id, {
          clientName: clientName.trim(),
          clientCpf: clientCpf.trim(),
          propertyType,
          construtoraId: finalConstrutoraId,
          construtoraName: finalConstrutoraName,
          empreendimentoId: finalEmpreendimentoId,
          empreendimentoName: finalEmpreendimentoName,
          fidelizacaoValor: fidelizacaoValor.trim(),
          fidelizacaoResponsavel,
          isConstrutora:
            fidelizacaoResponsavel === 'Construtora' || Boolean(finalConstrutoraId),
          partnerNotes: partnerNotes.trim(),
          ...(isAgencyActor && selectedPartnerFromList
            ? {
                partnerId: selectedPartnerFromList.id,
                partnerName: selectedPartnerFromList.name,
                partnerRepresentative:
                  selectedPartnerFromList.representative || selectedPartnerFromList.name,
                partnerEmail: selectedPartnerFromList.email,
                partnerPhone: selectedPartnerFromList.phone || '',
                partnerCnpj: selectedPartnerFromList.cnpj || '',
              }
            : {}),
        });
        onBookingSuccess(updated);
        return;
      }

      const result = await bookSlot({
        slotId: slot.id,
        partnerId: partnerProfile.id,
        partnerName: partnerProfile.name,
        partnerRepresentative: partnerProfile.representative,
        partnerEmail: partnerProfile.email,
        partnerPhone: partnerProfile.phone,
        partnerCnpj: partnerProfile.cnpj,
        clientName: clientName.trim(),
        clientCpf: clientCpf.trim(),
        propertyType,
        construtoraId: finalConstrutoraId || undefined,
        construtoraName: finalConstrutoraName || undefined,
        empreendimentoId: finalEmpreendimentoId || undefined,
        empreendimentoName: finalEmpreendimentoName || undefined,
        fidelizacaoValor: fidelizacaoValor.trim(),
        fidelizacaoResponsavel,
        isConstrutora:
          fidelizacaoResponsavel === 'Construtora' || Boolean(finalConstrutoraId),
        agendaTopic: `${propertyType}: ${clientName.trim()}`,
        partnerNotes: partnerNotes.trim(),
      });

      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onBookingSuccess(result.booking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar agendamento.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Horário, ao lado Dia da Semana e Data */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 pr-10">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base font-bold text-white">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
              <span>{slot.startTime}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-blue-400">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
              <span className="capitalize">{formatFullPortugueseDate(slot.date)}</span>
            </div>
          </div>
        </div>

        {/* Slot Warning if occupied during open modal */}
        {!isSlotStillAvailable && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Horário Indisponível!</strong>
              Este horário acabou de ser confirmado por outro parceiro negocial na rede. Por favor, feche esta janela e escolha outro horário aberto.
            </div>
          </div>
        )}

        {/* Booking Form with Specific Requested Fields */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          
          {/* Cliente & CPF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cliente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm placeholder:text-slate-600"
                  placeholder="Nome completo do cliente"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CPF *
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={clientCpf}
                  maxLength={14}
                  onChange={(e) => setClientCpf(formatCPF(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs sm:text-sm placeholder:text-slate-600"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          {/* Seletor: Imóvel Individual ou Empreendimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Imóvel / Negócio *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPropertyType('Imóvel Individual')}
                className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  propertyType === 'Imóvel Individual'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Imóvel Individual</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPropertyType('Empreendimento');
                  if (construtorasList.length === 1) {
                    setSelectedConstrutoraId(construtorasList[0].id);
                  }
                }}
                className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  propertyType === 'Empreendimento'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Empreendimento</span>
              </button>
            </div>

            {/* Caixa de seleção de Construtora quando Empreendimento estiver marcado */}
            {propertyType === 'Empreendimento' && (
              <div className="mt-3 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Construtora {construtorasList.length > 0 ? '*' : ''}
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-amber-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      required={construtorasList.length > 0}
                      disabled={construtorasList.length === 0}
                      value={selectedConstrutoraId}
                      onChange={(e) => {
                        setSelectedConstrutoraId(e.target.value);
                        setSelectedEmpreendimentoId('');
                      }}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {construtorasList.length > 0 ? 'Selecione uma construtora...' : ''}
                      </option>
                      {construtorasList.map((construtora) => (
                        <option key={construtora.id} value={construtora.id}>
                          {construtora.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Lista de Empreendimentos cadastrados pela Construtora selecionada */}
                {selectedConstrutoraFromList && (
                  <div className="animate-in fade-in duration-150">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Empreendimento
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-amber-400 absolute left-3 top-3 pointer-events-none" />
                      <select
                        disabled={empreendimentosList.length === 0}
                        value={selectedEmpreendimentoId}
                        onChange={(e) => setSelectedEmpreendimentoId(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 text-xs sm:text-sm appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {empreendimentosList.length > 0
                            ? 'Selecione um empreendimento...'
                            : 'Nenhum empreendimento cadastrado nesta construtora'}
                        </option>
                        {empreendimentosList.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                            {emp.city ? ` — ${emp.city}${emp.state ? `/${emp.state}` : ''}` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fidelização (Valor em R$ 0.000,00) + 3 botões embaixo: Cliente, Parceiro, Construtora */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fidelização
            </label>
            <div className="relative">
              <span className="text-xs sm:text-sm font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 select-none pointer-events-none">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={fidelizacaoValor}
                onChange={(e) => setFidelizacaoValor(formatCurrencyBRL(e.target.value))}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs sm:text-sm placeholder:text-slate-600"
                placeholder="0.000,00"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-2.5">
              {(['Cliente', 'Parceiro', 'Construtora'] as FidelizacaoResponsavel[]).map(
                (opcao) => {
                  const isSelected = fidelizacaoResponsavel === opcao;
                  return (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() =>
                        setFidelizacaoResponsavel((prev) => (prev === opcao ? '' : opcao))
                      }
                      className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <span>{opcao}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Caixa seletora de Parceiro Cadastrado (acima de Notas para Agência e Usuários da Agência) */}
          {isAgencyActor && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Parceiro Cadastrado *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <select
                  required
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Selecione um parceiro cadastrado...
                  </option>
                  {[...partners]
                    .filter((partner) => {
                      if (partner.segment?.toLowerCase() === 'construtora') return false;
                      if (existingBooking && partner.id === existingBooking.partnerId) return true;
                      const allowed = Array.isArray(partner.allowedAgencyIds)
                        ? partner.allowedAgencyIds
                        : [];
                      return allowed.includes(slot.agencyId);
                    })
                    .sort((a, b) =>
                      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
                    )
                    .map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Espaço para Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas / Observações
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <textarea
                rows={3}
                value={partnerNotes}
                onChange={(e) => setPartnerNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm resize-none placeholder:text-slate-600"
                placeholder="Insira anotações sobre a negociação, detalhes ou observações..."
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Bottom Actions: Salvar Agendamento & Cancelar Agendamento */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isCancelling || !isSlotStillAvailable}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Agendamento</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting || isCancelling}
              onClick={handleCancelBooking}
              className="syncz-card-danger-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/35 font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cancelando...</span>
                </>
              ) : (
                <span>Cancelar Agendamento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
