/** TokVid-r-Medidas-y-colores-2: presentation tokens, in dp. */
export const referenceVisual = {
  steel: '#4B7194', steelDark: '#3F6486', steelLight: '#6F9CC4',
  outline: ['#15DFF3', '#E91C84'] as const,
  createFill: ['#3F6486', '#6F9CC4'] as const,
  ink: '#0E1216', white: '#FFFFFF', inactive: '#9AA5AE',
  label: '#5B6670', secondary: '#6B7580', darkGray: '#3F3F46',
  border: '#D5DADF', inboxLine: '#E5E8EB', input: '#F2F4F6',
} as const;

export const referenceHeaders = {
  profile: {margin:10, top:38, height:40, radius:16},
  tools: {margin:12, top:44, height:48, radius:20},
  chat: {margin:6, top:40, height:50, radius:20},
  details: {margin:12, top:40, height:50, radius:20},
  inbox: {margin:6, top:36, height:38, radius:17},
} as const;
export type ReferenceHeaderVariant = keyof typeof referenceHeaders;
