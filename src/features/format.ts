import type { Timestamp } from '@/domain/types';

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Bishkek',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatTime = (time: Timestamp) => timeFormat.format(time);

export function formatValue(value: number, unit: string) {
  const digits = Math.abs(value) >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${unit}`;
}
