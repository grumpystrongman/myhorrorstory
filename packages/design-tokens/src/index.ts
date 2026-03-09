export const tokens = {
  brand: {
    name: 'MyHorrorStory',
    style: 'horror-luxe-cinematic'
  },
  color: {
    background: '#0d1017',
    panel: '#1a1f2c',
    panelElevated: '#232a3a',
    panelSoft: '#1f2535',
    textPrimary: '#f5f1e8',
    textMuted: '#b6ada0',
    accent: '#bf8b30',
    accentSoft: '#deb577',
    line: '#31394f',
    lineSoft: '#262d40',
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
  },
  motion: {
    fast: 120,
    medium: 220,
    slow: 340
  },
  shadow: {
    panel: '0 32px 64px rgb(5 8 14 / 45%)'
  }
} as const;

export type Tokens = typeof tokens;
