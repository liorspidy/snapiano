// Design tokens for the piano app. Contrast ratios are WCAG 2.x, measured.
export const color = {
  ink: '#1A2233',          // text and primary buttons; 15.9:1 on surface
  inkSecondary: '#3A4354', // 9.9:1 on surface
  inkMuted: '#566072',     // secondary text; 6.3:1 on surface, 5.5:1 on ground
  ground: '#EDEFF3',       // app background
  surface: '#FFFFFF',      // lists, sheets, paper
  line: '#E1E5EB',         // dividers only (decorative)
  borderStrong: '#7A8394', // inputs, secondary buttons; 3.8:1 on surface
  rh: '#2F5FE8',           // right hand on the dark stage; 3.2:1 on stage
  lh: '#F2A23A',           // left hand on the dark stage; 8.2:1 on stage; ink text on it 7.6:1
  rhOnLight: '#2350D8',    // right hand on white; 6.5:1
  lhOnLight: '#C26A00',    // left hand on white; 3.9:1
  warning: '#8A5300',      // warning text; 6.3:1 on surface
  success: '#1D7A46',      // 5.4:1 on surface
  error: '#B3261E',        // 6.5:1 on surface
  stage: '#151B28',        // practice screen background
  stageRaised: '#232B3B',  // controls on the stage
  stageText: '#C9D1DE',    // 9.2:1 on stageRaised
  felt: '#5B1E2A',         // thin strip above the keys
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { s: 8, m: 12, l: 16, sheet: 22, pill: 999 } as const;
export const touch = { min: 48, gap: 8, primaryHeight: 56 } as const;

export const font = { family: 'Rubik' } as const;
export const type = {
  display:   { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  headline:  { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  title:     { fontSize: 20, lineHeight: 28, fontWeight: '500' },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  body:      { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label:     { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption:   { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export const handColor = (hand: 'R' | 'L', onLight = false) =>
  hand === 'R' ? (onLight ? color.rhOnLight : color.rh) : (onLight ? color.lhOnLight : color.lh);
