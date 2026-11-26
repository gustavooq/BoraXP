export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(key: string, delta: number): string {
  const dt = parseDateKey(key);
  dt.setDate(dt.getDate() + delta);
  return formatDateKey(dt);
}

export function getStartOfWeek(key: string): string {
  const dt = parseDateKey(key);
  const day = dt.getDay(); // 0=Dom, 1=Seg...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMonday);
  return formatDateKey(dt);
}

export function getLastNDays(n: number, endKey: string = todayKey()): string[] {
  const list: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    list.push(addDays(endKey, -i));
  }
  return list;
}

export function getLastNWeeks(n: number, endKey: string = todayKey()): string[][] {
  const currentMonday = getStartOfWeek(endKey);
  const weeks: string[][] = [];
  for (let w = n - 1; w >= 0; w--) {
    const monday = addDays(currentMonday, -w * 7);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(monday, i));
    }
    weeks.push(days);
  }
  return weeks;
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatShortDatePT(key: string): string {
  const dt = parseDateKey(key);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`;
}

export function formatLongDatePT(key: string): string {
  const dt = parseDateKey(key);
  return dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function getWeekdayShort(key: string): string {
  return WEEKDAYS_SHORT[parseDateKey(key).getDay()];
}

export function isPastDate(key: string, ref: string = todayKey()): boolean {
  return key < ref;
}

export function isToday(key: string, ref: string = todayKey()): boolean {
  return key === ref;
}

export function getMonthMatrix(year: number, monthIndex: number): { dateKey: string; inMonth: boolean }[] {
  const firstDay = new Date(year, monthIndex, 1, 12, 0, 0);
  const startDow = firstDay.getDay(); // 0=Dom..6=Sab
  const offsetToMonday = startDow === 0 ? -6 : 1 - startDow;
  const start = new Date(year, monthIndex, 1 + offsetToMonday, 12, 0, 0);

  const cells: { dateKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      dateKey: formatDateKey(d),
      inMonth: d.getMonth() === monthIndex,
    });
  }
  return cells;
}

export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
