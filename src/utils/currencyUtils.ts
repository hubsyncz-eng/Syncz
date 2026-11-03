/**
 * Currency helpers for Brazilian Real (BRL) numbers and strings.
 */

export const parseFidelizacaoValor = (raw: string | number | undefined | null): number => {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  if (!str) return 0;

  // Case 1: Has comma as decimal separator (standard Brazilian format: "1.500,00", "1500,00", "R$ 1.500,00")
  if (str.includes(',')) {
    const cleaned = str.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // Case 2: Has dots without comma
  if (str.includes('.')) {
    const parts = str.split('.');
    // Multiple dots are always thousands separators (e.g. "1.500.000")
    if (parts.length > 2) {
      const cleaned = str.replace(/[^\d]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    // Single dot with exactly 3 digits after it and no decimal part (e.g. "1.500") is thousands separator
    if (parts[1].length === 3) {
      const cleaned = str.replace(/[^\d]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
  }

  // Case 3: Standard float or integer string (e.g. "1500", "1500.50")
  const cleaned = str.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const formatMoneyBRL = (val: number): string => {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
