import {palette} from './palette';

// App UI follows the approved light presentation, independent of Android theme.
// Media stages use palette.media explicitly instead of changing the whole UI.
const light = {
  text: palette.text, tint: palette.magenta, background: palette.background,
  foreground: palette.text, card: palette.surface, cardForeground: palette.text,
  primary: palette.button, primaryForeground: palette.onButton,
  secondary: palette.input, secondaryForeground: palette.text,
  muted: palette.input, mutedForeground: palette.secondary,
  accent: palette.teal, accentForeground: palette.onButton,
  destructive: palette.destructive, destructiveForeground: palette.onButton,
  border: palette.border, input: palette.border,
};
export default {light, radius:12};
