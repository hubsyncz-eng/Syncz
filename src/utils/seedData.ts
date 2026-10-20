import {
  Agency,
  Consultant,
  PartnerProfile,
  TimeSlot,
  Booking,
  ActivityEvent,
} from '../types/index.ts';

export function formatSeedDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSeedMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addSeedDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export const DEFAULT_AGENCY_INFO = {
  name: 'Central Agência de Negócios & Parcerias',
  description: 'Unidade Centralizadora de Agendas Institucionais e Negociações Corporativas',
  autoConfirmEnabled: true,
  maxBookingsPerPartnerPerWeek: 5,
};

export function buildInitialSeedData(): {
  agencies: Agency[];
  consultants: Consultant[];
  partners: PartnerProfile[];
  slots: TimeSlot[];
  bookings: Booking[];
  activities: ActivityEvent[];
} {
  const today = new Date();
  const monday = getSeedMonday(today);

  const agencies: Agency[] = [
    {
      id: 'ag_1',
      name: 'Agência Central Alfa',
      legalName: 'Alfa Negócios Corporativos e Intermediações Ltda',
      cnpj: '11.222.333/0001-44',
      email: 'contato@agenciacentralalfa.com.br',
      phone: '(11) 3200-4000',
      city: 'São Paulo',
      state: 'SP',
      managerName: 'Dra. Camila Fonseca',
      description: 'Centralizadora de Agendas Institucionais, Contratos e Parcerias B2B',
      badgeColor: 'bg-blue-600',
      status: 'active',
      password: 'agencia123',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    {
      id: 'ag_2',
      name: 'Agência Prime Hub Brasil',
      legalName: 'Prime Hub Intermediações e Soluções Comerciais S/A',
      cnpj: '22.333.444/0001-55',
      email: 'operacoes@primehub.com.br',
      phone: '(21) 2500-8800',
      city: 'Rio de Janeiro',
      state: 'RJ',
      managerName: 'Carlos Eduardo Nery',
      description: 'Hub de Negócios Estratégicos, Expansão e M&A',
      badgeColor: 'bg-indigo-600',
      status: 'active',
      password: 'agencia123',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  const consultants: Consultant[] = [
    {
      id: 'c1',
      agencyId: 'ag_1',
      name: 'Dra. Camila Fonseca',
      role: 'Diretora de Parcerias Estratégicas',
      department: 'Diretoria Comercial & Expansão',
      email: 'camila.fonseca@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-emerald-600',
      specialties: ['Alinhamento Estratégico', 'Fechamento de Contrato', 'Joint Ventures'],
    },
    {
      id: 'c2',
      agencyId: 'ag_1',
      name: 'Rodrigo Vasconcelos',
      role: 'Head de Novos Negócios',
      department: 'Relacionamento B2B',
      email: 'rodrigo.vasconcelos@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-blue-600',
      specialties: ['Propostas Comerciais', 'Kickoff de Parceria', 'Expansão de Mercado'],
    },
    {
      id: 'c3',
      agencyId: 'ag_1',
      name: 'Juliana Martins',
      role: 'Especialista em M&A e Compliance',
      department: 'Jurídico & Risco',
      email: 'juliana.martins@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-indigo-600',
      specialties: ['Auditoria de Contrato', 'Compliance Regulatório', 'NDA & Termos'],
    },
    {
      id: 'c4',
      agencyId: 'ag_1',
      name: 'Marcelo Braga',
      role: 'Gerente de Integração & Operações',
      department: 'Operações e Logística B2B',
      email: 'marcelo.braga@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-amber-600',
      specialties: ['Integração Técnica', 'Acordo de Nível de Serviço (SLA)', 'Operações'],
    },
  ];

  const partners: PartnerProfile[] = [
    {
      id: 'p1',
      name: 'LogiPrime Logística Nacional',
      segment: 'Transporte e Supply Chain',
      representative: 'Eduardo Silveira',
      email: 'eduardo@logiprime.com.br',
      phone: '(11) 98765-4321',
      cnpj: '12.345.678/0001-90',
      badgeColor: 'bg-orange-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
    {
      id: 'p2',
      name: 'Nexus Fintech Solutions',
      segment: 'Tecnologia Financeira & Pagamentos',
      representative: 'Mariana Duarte',
      email: 'mduarte@nexusfintech.io',
      phone: '(11) 97654-3210',
      cnpj: '98.765.432/0001-11',
      badgeColor: 'bg-purple-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'p3',
      name: 'Alfa Varejo & Redes',
      segment: 'Grandes Varejistas & Distribuição',
      representative: 'Fernando Guimarães',
      email: 'fernando@alfavarejo.com.br',
      phone: '(21) 99876-5432',
      cnpj: '45.678.901/0001-22',
      badgeColor: 'bg-blue-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
    },
    {
      id: 'p4',
      name: 'SolarTech Energia Renovável',
      segment: 'Energia Limpa e Sustentabilidade',
      representative: 'Beatriz Nogueira',
      email: 'beatriz@solartech.com.br',
      phone: '(31) 98888-7766',
      cnpj: '78.901.234/0001-55',
      badgeColor: 'bg-emerald-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: 'p5',
      name: 'Biocare Saúde Corporativa',
      segment: 'Benefícios Corporativos & Saúde',
      representative: 'Gustavo Paiva',
      email: 'gpaiva@biocare.med.br',
      phone: '(41) 99123-4567',
      cnpj: '23.456.789/0001-88',
      badgeColor: 'bg-rose-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ];

  const slots: TimeSlot[] = [];
  const bookings: Booking[] = [];

  const daysOffsets = [0, 1, 2, 3, 4]; // Seg a Sex
  const times = [
    { start: '09:00', end: '10:00' },
    { start: '10:30', end: '11:30' },
    { start: '14:00', end: '15:00' },
    { start: '15:30', end: '16:30' },
    { start: '17:00', end: '18:00' },
  ];

  let idCounter = 1;

  daysOffsets.forEach((dayOffset) => {
    const dayDate = addSeedDays(monday, dayOffset);
    const dateStr = formatSeedDate(dayDate);

    times.forEach((t, timeIdx) => {
      const consultant = consultants[(dayOffset + timeIdx) % consultants.length];
      const slotId = `slot_${idCounter++}`;
      const modalities: Array<'online' | 'presencial' | 'hibrido'> = ['online', 'presencial', 'hibrido'];
      const modality = modalities[(dayOffset + timeIdx) % modalities.length];
      const categories = [
        'Alinhamento Estratégico',
        'Fechamento de Contrato',
        'Propostas Comerciais',
        'Auditoria e Compliance',
        'Acordo de Nível de Serviço (SLA)',
      ];
      const category = categories[(dayOffset + timeIdx) % categories.length];
      const location =
        modality === 'online'
          ? `Google Meet: meet.google.com/hub-${slotId.toLowerCase()}`
          : modality === 'presencial'
            ? 'Sala Nobre de Reuniões Alpha - Sede Central, 8º andar'
            : 'Sala Híbrida Beta + Transmissão Meet';

      let status: 'available' | 'locked' | 'booked' = 'available';
      let bookingId: string | undefined = undefined;

      if (dayOffset === 0 && timeIdx === 0) {
        status = 'booked';
        bookingId = 'bk_seed_1';
        const b: Booking = {
          id: bookingId,
          protocol: 'AGB-2026-8812',
          agencyId: 'ag_1',
          slotId,
          slotDate: dateStr,
          slotStartTime: t.start,
          slotEndTime: t.end,
          consultantName: consultant.name,
          serviceCategory: category,
          modality,
          locationOrLink: location,
          partnerId: 'p1',
          partnerName: 'LogiPrime Logística Nacional',
          partnerRepresentative: 'Eduardo Silveira',
          partnerEmail: 'eduardo@logiprime.com.br',
          partnerPhone: '(11) 98765-4321',
          partnerCnpj: '12.345.678/0001-90',
          clientName: 'Roberto Alencar',
          clientCpf: '321.654.987-10',
          propertyType: 'Imóvel Individual',
          agendaTopic: 'Negociação de Imóvel Individual - Cliente Roberto Alencar',
          dealEstimate: 'R$ 780.000',
          additionalAttendees: 'roberto@alencar.adv.br',
          partnerNotes:
            'Cliente com perfil de crédito pré-aprovado e interesse em unidade residencial de 3 dormitórios.',
          status: 'confirmed',
          autoConfirmedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          securityCode: 'SEC-8812-7741',
        };
        bookings.push(b);
      } else if (dayOffset === 1 && timeIdx === 1) {
        status = 'booked';
        bookingId = 'bk_seed_2';
        const b: Booking = {
          id: bookingId,
          protocol: 'AGB-2026-4529',
          agencyId: 'ag_1',
          slotId,
          slotDate: dateStr,
          slotStartTime: t.start,
          slotEndTime: t.end,
          consultantName: consultant.name,
          serviceCategory: category,
          modality,
          locationOrLink: location,
          partnerId: 'p2',
          partnerName: 'Nexus Fintech Solutions',
          partnerRepresentative: 'Mariana Duarte',
          partnerEmail: 'mduarte@nexusfintech.io',
          partnerPhone: '(11) 97654-3210',
          partnerCnpj: '98.765.432/0001-11',
          clientName: 'Construtora & Incorporadora Horizonte',
          clientCpf: '456.789.012-34',
          propertyType: 'Empreendimento',
          agendaTopic: 'Negociação de Empreendimento - Horizonte Towers',
          dealEstimate: 'R$ 14.500.000',
          additionalAttendees: 'diretoria@horizonteinc.com.br',
          partnerNotes:
            'Alinhamento de condições para lançamento de torre corporativa com 120 salas.',
          status: 'confirmed',
          autoConfirmedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          securityCode: 'SEC-4529-1983',
        };
        bookings.push(b);
      }

      const slot: TimeSlot = {
        id: slotId,
        agencyId: 'ag_1',
        date: dateStr,
        startTime: t.start,
        endTime: t.end,
        durationMinutes: 60,
        consultantId: consultant.id,
        consultantName: consultant.name,
        consultantRole: consultant.role,
        serviceCategory: category,
        modality,
        locationOrLink: location,
        status,
        bookingId,
        createdAt: new Date().toISOString(),
      };

      slots.push(slot);
    });
  });

  const activities: ActivityEvent[] = [
    {
      id: 'act_0',
      type: 'agency_registered',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      title: 'Agência Cadastrada pelo Administrador',
      description: 'O Administrador do Sistema cadastrou a Agência Central Alfa no ecossistema.',
      agencyName: 'Agência Central Alfa',
    },
    {
      id: 'act_1',
      type: 'slots_batch_opened',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      title: 'Abertura de Grade Semanal',
      description: 'A Agência Central Alfa abriu horários na agenda para a semana vigente.',
    },
    {
      id: 'act_2',
      type: 'booking_confirmed',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      title: 'Agendamento Confirmado Automaticamente',
      description:
        'LogiPrime Logística confirmou horário para Segunda-feira com Dra. Camila Fonseca.',
      partnerName: 'LogiPrime Logística Nacional',
      protocol: 'AGB-2026-8812',
    },
    {
      id: 'act_3',
      type: 'booking_confirmed',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      title: 'Agendamento Confirmado Automaticamente',
      description:
        'Nexus Fintech Solutions confirmou horário para Terça-feira com Rodrigo Vasconcelos.',
      partnerName: 'Nexus Fintech Solutions',
      protocol: 'AGB-2026-4529',
    },
  ];

  return {
    agencies,
    consultants,
    partners,
    slots,
    bookings,
    activities,
  };
}
