/** ServerStatus spacious dashboard width (up to 1680px, 95vw on large screens). */
export const DEFAULT_PAGE_WIDTH = 1680
const MIN_PAGE_WIDTH = 768
const MAX_PAGE_WIDTH = 1920

/**
 * The hub stores the page width as a number. Anything outside a usable range --
 * unset, zero, or past a 4K window -- falls back rather than collapsing the page.
 */
export function clampPageWidth(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_WIDTH
  return Math.min(MAX_PAGE_WIDTH, Math.max(MIN_PAGE_WIDTH, Math.round(value)))
}
