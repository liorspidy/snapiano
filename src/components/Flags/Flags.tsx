import { ReactNode } from 'react';
import Svg, { ClipPath, Defs, G, Path, Polygon, Rect } from 'react-native-svg';

// National flags as SVG (never emoji). National colours are exempt from the hand-colour rule.
// Arabic has no single country: the UAE flag stands for it.
const FLAGS: Record<string, ReactNode> = {
  he: (
    <>
      <Rect width="30" height="20" fill="#FFFFFF" />
      <Rect y="2.5" width="30" height="2.5" fill="#0038B8" />
      <Rect y="15" width="30" height="2.5" fill="#0038B8" />
      <G fill="none" stroke="#0038B8" strokeWidth="0.8">
        <Polygon points="15,6.4 18,11.6 12,11.6" />
        <Polygon points="15,13.6 12,8.4 18,8.4" />
      </G>
    </>
  ),
  en: (
    <>
      <Rect width="30" height="20" fill="#012169" />
      <Path d="M0,0 L30,20 M30,0 L0,20" stroke="#FFFFFF" strokeWidth="4" />
      <Path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.4" />
      <Path d="M15,0 V20 M0,10 H30" stroke="#FFFFFF" strokeWidth="6" />
      <Path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3.4" />
    </>
  ),
  fr: (
    <>
      <Rect width="10" height="20" fill="#0055A4" />
      <Rect x="10" width="10" height="20" fill="#FFFFFF" />
      <Rect x="20" width="10" height="20" fill="#EF4135" />
    </>
  ),
  ar: (
    <>
      <Rect width="30" height="6.67" fill="#00732F" />
      <Rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
      <Rect y="13.33" width="30" height="6.67" fill="#000000" />
      <Rect width="7.5" height="20" fill="#FF0000" />
    </>
  ),
  ru: (
    <>
      <Rect width="30" height="6.67" fill="#FFFFFF" />
      <Rect y="6.67" width="30" height="6.67" fill="#0039A6" />
      <Rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
    </>
  ),
};

export function Flag({ code, width = 28 }: { code: string; width?: number }) {
  return (
    <Svg width={width} height={(width * 2) / 3} viewBox="0 0 30 20" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs><ClipPath id="r"><Rect width="30" height="20" rx="3" /></ClipPath></Defs>
      <G clipPath="url(#r)">{FLAGS[code]}</G>
      <Rect x="0.5" y="0.5" width="29" height="19" rx="2.5" fill="none" stroke="#0B1733" strokeOpacity="0.25" />
    </Svg>
  );
}
