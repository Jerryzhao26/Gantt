import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function parseDate(dateStr: string): Date {
  try {
    return startOfDay(parseISO(dateStr));
  } catch {
    return startOfDay(new Date());
  }
}

export function formatDate(date: Date | string, formatStr = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  return format(d, formatStr, { locale: zhCN });
}

export function formatFriendlyDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return format(d, 'M月d日 (EEEE)', { locale: zhCN });
}

export function daysBetween(startDateStr: string, endDateStr: string): number {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const diff = differenceInCalendarDays(end, start);
  return Math.max(1, diff + 1); // Minimum 1 day duration
}

export function addDaysToDate(dateStr: string, days: number): string {
  const start = parseDate(dateStr);
  const result = addDays(start, days);
  return format(result, 'yyyy-MM-dd');
}

export interface DayColumn {
  date: Date;
  dateStr: string;
  dayNumber: string;
  dayOfWeek: string;
  isToday: boolean;
  isWeekend: boolean;
  monthLabel?: string;
  weekLabel?: string;
}

export function generateTimelineColumns(
  startDateStr: string,
  endDateStr: string,
  viewMode: 'day' | 'week' | 'month'
): DayColumn[] {
  let start = parseDate(startDateStr);
  let end = parseDate(endDateStr);

  // Buffer range around tasks
  if (viewMode === 'day') {
    start = addDays(start, -3);
    end = addDays(end, 14);
  } else if (viewMode === 'week') {
    start = startOfWeek(addDays(start, -7), { weekStartsOn: 1 });
    end = endOfWeek(addDays(end, 21), { weekStartsOn: 1 });
  } else {
    start = startOfMonth(addDays(start, -15));
    end = endOfMonth(addDays(end, 45));
  }

  const days = eachDayOfInterval({ start, end });

  return days.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return {
      date: d,
      dateStr,
      dayNumber: format(d, 'd'),
      dayOfWeek: format(d, 'EE', { locale: zhCN }),
      isToday: isToday(d),
      isWeekend: isWeekend(d),
      monthLabel: format(d, 'yyyy年M月', { locale: zhCN }),
      weekLabel: `第 ${getWeek(d, { locale: zhCN })} 周`,
    };
  });
}
