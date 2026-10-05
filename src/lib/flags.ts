// Every flag is emitted as its own hashed asset and fetched on first use, so a
// page carries only the regions its nodes are in. Vite rewrites the URLs, which
// is what makes them resolve from a node page as well as from the index; a
// hand-built "./flags/x.svg" resolved against the document instead and vanished
// behind the SPA fallback. vite.config.ts keeps the small ones from being inlined
// into the bundle as data URLs.
const FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/*.svg", {
      query: "?url",
      import: "default",
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -".svg".length), url]),
)

/** Alpha-3 codes an operator may have typed instead of the alpha-2 flag-icons uses. */
const ALPHA3: Record<string, string> = {
  usa: "us", chn: "cn", jpn: "jp", hkg: "hk", twn: "tw", sgp: "sg",
  gbr: "gb", deu: "de", fra: "fr", kor: "kr", can: "ca", aus: "au",
  rus: "ru", nld: "nl", ind: "in", bra: "br", ita: "it", esp: "es",
  swe: "se", che: "ch", pol: "pl", fin: "fi", nor: "no", dnk: "dk",
}

const REGIONAL_A = 0x1f1e6

/**
 * Komari fills `region` with the flag emoji GeoIP resolves ("🇯🇵"), which is what
 * the built-in theme renders; an operator can set an ISO code by hand instead.
 * Returns null for anything that is not a country flag.
 */
export function flagUrl(region: string): string | null {
  const trimmed = region.trim()
  if (!trimmed) return null

  const points = [...trimmed].map((c) => c.codePointAt(0)!)
  if (points.length === 2 && points.every((p) => p >= REGIONAL_A && p < REGIONAL_A + 26)) {
    const iso = points.map((p) => String.fromCharCode(p - REGIONAL_A + 97)).join("")
    return FLAGS[iso] ?? null
  }

  const code = trimmed.toLowerCase()
  const iso = ALPHA3[code] ?? code
  return /^[a-z]{2}$/.test(iso) ? FLAGS[iso] ?? null : null
}
