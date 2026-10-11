// Design tokens for the piano app. Contrast ratios are WCAG 2.x, measured.
export const color = {
  ink: '#030E28',          // brand navy (the "Snap" in the wordmark); text and primary buttons; 19.1:1 on surface
  inkSecondary: '#243049', // 13.2:1 on surface
  inkMuted: '#47536C',     // secondary text; 6.7:1 on ground
  ground: '#ECEFF5',       // app background
  surface: '#FFFFFF',      // lists, sheets, paper
  line: '#E1E5EB',         // dividers only (decorative)
  borderStrong: '#6C7890', // inputs, secondary buttons; 4.4:1 on surface
  rh: '#2F5FE8',           // right hand on the dark stage; 3.5:1 on stage
  lh: '#F2A23A',           // left hand on the dark stage; 8.9:1 on stage; ink text on it 8.5:1
  rhOnLight: '#2350D8',    // right hand on white; 6.5:1
  lhOnLight: '#C26A00',    // left hand on white; 3.9:1
  warning: '#8A5300',      // warning text; 6.3:1 on surface
  success: '#1D7A46',      // 5.4:1 on surface
  error: '#B3261E',        // 6.5:1 on surface
  stage: '#030E28',        // practice screen background (brand navy)
  stageRaised: '#10203F',  // controls on the stage
  stageText: '#C8D2E4',    // 10.6:1 on stageRaised
  felt: '#5B1E2A',         // thin strip above the keys
} as const;

// Brand colours from the logo sheet (assets/brand/brand-sheet.png). Used ONLY inside the logo, wordmark,
// app icon and splash; never for UI. In the UI, blue still means the right hand and nothing else.
export const brand = {
  navy: '#030E28',      // "Snap" in the wordmark
  blue: '#0760F1',      // "iano" in the wordmark, ribbon in the mark; 5.3:1 on white
  iconTop: '#02306D',   // app icon background, top
  iconBottom: '#010B1A',// app icon background, bottom
  white: '#FFFFFF',
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
