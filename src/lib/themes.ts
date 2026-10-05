export const PRIMARY_COLOR_PRESETS = [
  { name: "Zinc", value: "#18181b" },
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#10b981" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Orange", value: "#f97316" },
  { name: "Rose", value: "#e11d48" },
] as const

export const RADIUS_PRESETS = [
  { label: "0", value: "0rem" },
  { label: "0.3", value: "0.3rem" },
  { label: "0.5", value: "0.5rem" },
  { label: "0.75", value: "0.75rem" },
  { label: "1.0", value: "1.0rem" },
] as const

export const DEFAULT_RADIUS = "0.5rem"

/** ServerStatus data-rich width; wide enough for all metrics, comfortably centered. */
export const DEFAULT_PAGE_WIDTH = 1200
const MIN_PAGE_WIDTH = 768
const MAX_PAGE_WIDTH = 1600

/**
 * The hub stores the page width as a number. Anything outside a usable range --
 * unset, zero, or past a 4K window -- falls back rather than collapsing the page.
 */
export function clampPageWidth(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_WIDTH
  return Math.min(MAX_PAGE_WIDTH, Math.max(MIN_PAGE_WIDTH, Math.round(value)))
}

/**
 * Readable text on a custom primary. The presets and the colour picker are all
 * hex; anything else (a named colour typed into the field) keeps white, which is
 * what every preset wants.
 */
function readableOn(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!hex) return "oklch(1 0 0)"

  const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1]
  const channel = (at: number) => {
    const v = parseInt(digits.slice(at, at + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.4 ? "oklch(0.205 0 0)" : "oklch(1 0 0)"
}

/**
 * Only what the visitor changed, so index.css stays the single definition of the
 * palette. Clearing the properties hands the default back to the stylesheet, and
 * to its dark block when the mode flips.
 */
export function applyTheme(customPrimary: string, customRadius: string) {
  const root = document.documentElement
  const primary = customPrimary.trim()

  if (primary) {
    root.style.setProperty("--primary", primary)
    root.style.setProperty("--ring", primary)
    root.style.setProperty("--primary-foreground", readableOn(primary))
  } else {
    root.style.removeProperty("--primary")
    root.style.removeProperty("--ring")
    root.style.removeProperty("--primary-foreground")
  }

  root.style.setProperty("--radius", customRadius.trim() || DEFAULT_RADIUS)
}
