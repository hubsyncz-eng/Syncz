export const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda-Feira', short: 'Seg' },
  { id: 2, name: 'Terça-Feira', short: 'Ter' },
  { id: 3, name: 'Quarta-Feira', short: 'Qua' },
  { id: 4, name: 'Quinta-Feira', short: 'Qui' },
  { id: 5, name: 'Sexta-Feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
  { id: 0, name: 'Domingo', short: 'Dom' },
];

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatNumericDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatPortugueseDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayShort = DAYS_OF_WEEK.find((dw) => dw.id === date.getDay())?.short || '';
  const monthPart = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  return `${dayShort}, ${monthPart}`;
}

export function formatFullPortugueseDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayShort = DAYS_OF_WEEK.find((dw) => dw.id === date.getDay())?.short || '';
  const restPart = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return `${dayShort}, ${restPart}`;
}

export function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return '';
  const then = new Date(isoStr).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'agora há pouco';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} dias`;
}

// Download .ics calendar event
export function downloadICS(booking: {
  protocol: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  consultantName: string;
  agendaTopic: string;
  locationOrLink: string;
  partnerName: string;
}) {
  const [year, month, day] = booking.slotDate.split('-').map(Number);
  const [startH, startM] = booking.slotStartTime.split(':').map(Number);
  const [endH, endM] = booking.slotEndTime.split(':').map(Number);

  const pad = (n: number) => String(n).padStart(2, '0');

  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Syncz//Central de Agendamentos B2B//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.protocol}@syncz.com.br`,
    `DTSTAMP:${dtStart}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Reunião de Negócios: ${booking.agendaTopic} (${booking.protocol})`,
    `DESCRIPTION:Agendamento Confirmado com ${booking.consultantName}\\nParceiro: ${booking.partnerName}\\nPauta: ${booking.agendaTopic}\\nProtocolo: ${booking.protocol}`,
    `LOCATION:${booking.locationOrLink}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Agendamento_${booking.protocol}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
