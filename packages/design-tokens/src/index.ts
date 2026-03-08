export const tokens = {
  color: {
    background: '#0d1017',
    panel: '#1a1f2c',
    panelElevated: '#232a3a',
    textPrimary: '#f5f1e8',
    textMuted: '#b6ada0',
    accent: '#bf8b30',
    danger: '#b34747',
    success: '#3e8c6d'
  },
  font: {
    heading: 'Cinzel, serif',
    body: 'Source Sans 3, sans-serif',
    mono: 'JetBrains Mono, monospace'
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 22
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32
  }
} as const;

export type Tokens = typeof tokens;
