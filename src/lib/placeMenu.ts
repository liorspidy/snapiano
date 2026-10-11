export type Rect = { top: number; bottom: number; left: number; right: number };

type Options = { align: 'start' | 'end'; gap: number; forceBelow?: boolean };

const MARGIN = 8;

// Ported from take5 (ui/dropdown/placeMenu.ts): picks the offset that fits, falls back to the other side, then clamps to the screen.
const axis = (pref: number, alt: number, size: number, limit: number) => {
  const fits = (p: number) => p >= MARGIN && p + size <= limit - MARGIN;
  const p = fits(pref) || !fits(alt) ? pref : alt;
  return Math.max(MARGIN, Math.min(p, limit - MARGIN - size));
};

export function placeMenu(
  trigger: Rect,
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
  { align, gap, forceBelow }: Options,
): { left: number; below: boolean; top?: number; bottom?: number } {
  const belowTop = trigger.bottom + gap;
  const aboveTop = trigger.top - gap - menu.height;
  const fitsY = (p: number) => p >= MARGIN && p + menu.height <= viewport.height - MARGIN;
  const below = forceBelow ?? (fitsY(belowTop) || !fitsY(aboveTop));
  const startLeft = trigger.left;
  const endLeft = trigger.right - menu.width;
  const left = align === 'end'
    ? axis(endLeft, startLeft, menu.width, viewport.width)
    : axis(startLeft, endLeft, menu.width, viewport.width);
  return below
    ? { left, below, top: belowTop }
    : { left, below, bottom: viewport.height - (trigger.top - gap) };
}
