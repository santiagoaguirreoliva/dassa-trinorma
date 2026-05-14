export const SEVERITY = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
  info:     '#3b82f6',
} as const;

export type Severity = keyof typeof SEVERITY;
