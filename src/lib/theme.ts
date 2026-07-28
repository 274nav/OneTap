export const colors = {
  background: '#F6F5F2',
  surface: '#FFFFFF',
  primary: '#2E3A46',
  accent: '#E66A5C',
  secondaryAccent: '#8C9A8B',
  text: '#1F2933',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  danger: '#C0392B',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.secondaryText },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.secondaryText, letterSpacing: 0.4 },
};

export const shadow = {
  card: {
    shadowColor: '#1F2933',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
