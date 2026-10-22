export const colors = Object.freeze({
  plum900: '#3F0824',
  plum700: '#713666',
  mauve: '#C9789B',
  rose: '#EB587B',
  blush: '#F4A5B8',
  lavender: '#C8AAD9',
  lavender100: '#F3EDF7',
  lavender50: '#FAF7FB',
  sage700: '#4E7554',
  sage400: '#A9C7AB',
  sage100: '#E9F1EA',
  gold: '#E8C86A',
  stem: '#6E9473',
  textSecondary: '#5E3A55',
  textMuted: '#6B4C63',
  surface: '#FFFFFF',
  danger: '#B42318',
  border: 'rgba(63, 8, 36, 0.10)',
  borderStrong: 'rgba(63, 8, 36, 0.18)',
})

export const phaseColors = Object.freeze({
  menstrual: colors.blush,
  follicular: colors.sage400,
  ovulation: colors.gold,
  luteal: colors.lavender,
})

export const signalColors = Object.freeze({
  energy: colors.gold,
  skin: colors.blush,
  sleep: colors.lavender,
  mood: colors.sage400,
})

export const heatmapColors = Object.freeze([
  'rgba(113, 54, 102, 0.06)',
  '#E6D5EC',
  '#C9A3CB',
  colors.plum700,
])

export const theme = Object.freeze({
  colors,
  phaseColors,
  signalColors,
  heatmapColors,
  radius: {
    control: 14,
    card: 14,
    pill: 100,
  },
  tapTarget: 48,
})

export default theme
