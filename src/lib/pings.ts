const KEY = "serverstatus:pinged"

const pinged = new Map<string, boolean>(load())

function load(): [string, boolean][] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>
    return Object.entries(saved)
      .filter(([, v]) => typeof v === "boolean")
      .map(([k, v]) => [k, v as boolean])
  } catch {
    return []
  }
}

export function knownPing(uuid: string): boolean | undefined {
  return pinged.get(uuid)
}

export function recordPing(uuid: string, has: boolean, hours: number): boolean {
  const known = has || (hours < 24 && pinged.get(uuid) === true)
  pinged.set(uuid, known)
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(pinged)))
  } catch {}
  return known
}
