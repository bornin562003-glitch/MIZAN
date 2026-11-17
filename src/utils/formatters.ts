export function formatCurrency(
  amount: number,
  currency: string = 'PKR',
  compact = false,
  discreet = false,
): string {
  if (discreet) {
    return `${currency} ••••`;
  }

  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(safeAmount);
  const sign = safeAmount < 0 ? '-' : '';

  if (compact && abs >= 1000) {
    const suffix = abs >= 1_000_000 ? 'M' : 'k';
    const divisor = abs >= 1_000_000 ? 1_000_000 : 1_000;
    const shortVal = (abs / divisor).toFixed(abs % divisor === 0 ? 0 : 1);
    return `${sign}${currency} ${shortVal}${suffix}`;
  }

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currency === 'PKR' ? 0 : 2,
      maximumFractionDigits: currency === 'PKR' ? 0 : 2,
    }).format(abs);
    return `${sign}${currency} ${formatted}`;
  } catch {
    return `${sign}${currency} ${abs.toFixed(0)}`;
  }
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekdayShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
}
