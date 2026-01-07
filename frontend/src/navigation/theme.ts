import { DefaultTheme } from '@react-navigation/native';

export const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
  borderSoft: '#1f1f3a',
};

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    primary: COLORS.neonPurple,
    text: COLORS.text,
    border: COLORS.borderSoft,
  },
};
