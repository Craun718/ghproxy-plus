import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GHPROXY_PATH = '/api/ghproxy/';

export function formatBytes(size: number | null): string {
  if (size === null) return 'Unknown size';
  if (size === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );
  const value = size / 1024 ** unitIndex;
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function titleCase(value: string | null): string {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
