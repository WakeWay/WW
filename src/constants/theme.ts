// ─── Base Palette ────────────────────────────────────────────────────────────

export const COLORS = {
  primary: '#00A8D2',
  primaryDark: '#0083B0',
  primaryLight: '#33C3E8',
  accent: '#FA8E21',
  accentLight: '#FBB054',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerLight: '#FCA5A5',
  success: '#10B981',
  successDark: '#059669',
  successLight: '#6EE7B7',
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FCD34D',
  background: '#F0F7FF',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FBFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
};

export const DARK_COLORS = {
  ...COLORS,
  background: '#0A0F1E',
  surface: '#111827',
  surfaceElevated: '#1F2937',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E293B',
  borderLight: '#334155',
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.35)',
};

// ─── Gradient Tokens ─────────────────────────────────────────────────────────

export const GRADIENTS = {
  primary: ['#00A8D2', '#0083B0'] as const,
  primaryVibrant: ['#00C6F8', '#0072B5'] as const,
  accent: ['#FA8E21', '#F97316'] as const,
  success: ['#10B981', '#059669'] as const,
  danger: ['#FF6B6B', '#EF4444', '#DC2626'] as const,
  warning: ['#FCD34D', '#F59E0B'] as const,
  hero: ['#0A2A3F', '#0083B0', '#00C6F8'] as const,
  heroDark: ['#050C18', '#0A2A3F', '#0072B5'] as const,
  card: ['rgba(0,168,210,0.08)', 'rgba(0,131,176,0.04)'] as const,
  glass: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'] as const,
  glassDark: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as const,
  alarmBg: ['#7F1D1D', '#EF4444', '#FF6B6B'] as const,
  proximityGreen: ['#10B981', '#34D399'] as const,
  proximityAmber: ['#F59E0B', '#FCD34D'] as const,
  proximityRed: ['#EF4444', '#FF6B6B'] as const,
};

// ─── Shadow Presets ───────────────────────────────────────────────────────────

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#0A2A3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0A2A3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  elevated: {
    shadowColor: '#0A2A3F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  primary: {
    shadowColor: '#00A8D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  danger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  success: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

// ─── Border Radius Tokens ─────────────────────────────────────────────────────

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  pill: 999,
};

// ─── Spacing Tokens ───────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

// ─── Typography Scale ─────────────────────────────────────────────────────────

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

export const FONT_WEIGHT = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

