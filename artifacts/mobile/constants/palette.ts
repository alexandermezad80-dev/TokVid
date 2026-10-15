/** TokVid's approved palette. Screen surfaces stay light regardless of OS mode.
 * Media stages and their overlays deliberately keep the media palette.
 * Bubble styles, wallpapers and external app logos keep their own colors.
 */
export const palette = {
  background: '#FFFFFF',
  surface: '#F9F9F9',
  input: '#F2F3F5',
  text: '#0B0B0D',
  secondary: '#52525B',
  muted: '#73737D',
  border: '#E5E5E5',
  button: '#161616',
  onButton: '#FFFFFF',
  headerText: '#FFFFFF',
  headerSecondary: '#F1F5F6',
  header: ['#5F6A74', '#76818B', '#2F9A9F'] as const,
  cyan: '#25F4EE',
  magenta: '#FE2C55',
  teal: '#257B80',
  selected: '#F1FAFA',
  selectedBorder: '#2F9A9F',
  unread: '#FFF1F3',
  tabs: '#232F39',
  tabInactive: '#9AA5AE',
  destructive: '#D32F3F',
  success: '#187A50',
  disabled: '#D5D7DB',
  scrim: 'rgba(0,0,0,0.45)',
  media: '#000000',
  mediaSurface: '#161823',
  mediaText: '#FFFFFF',
  mediaMuted: '#B8BCC6',
} as const;
