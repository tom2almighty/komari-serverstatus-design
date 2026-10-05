const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"]

/** Ten years; past this an expiry date is a stand-in for "permanent". */
export const FOREVER_DAYS = 3650

const unitOf = (n: number) => Math.min(Math.floor(Math.log(n) / Math.log(1024)), UNITS.length - 1)

export function bytes(n: number, digits?: number): string {
  if (!n || n < 1) return "0 B"
  const i = unitOf(n)
  const v = n / 1024 ** i
  return `${v.toFixed(i === 0 ? 0 : (digits ?? (v >= 100 ? 0 : v >= 10 ? 1 : 2)))} ${UNITS[i]}`
}

export function pair(used: number, total: number): string {
  if (used > 0 && total > 0 && unitOf(used) === unitOf(total)) {
    const i = unitOf(total)
    const f = (n: number) => (n / 1024 ** i).toFixed(i === 0 ? 0 : 2)
    return `${f(used)} / ${f(total)} ${UNITS[i]}`
  }
  return `${bytes(used)} / ${bytes(total)}`
}

export function axisBytes(v: number): string {
  if (!v || v < 0) return "0 B"
  const unit = Math.min(Math.floor(Math.log(v) / Math.log(1024)), 5)
  return bytes(v, v / 1024 ** unit >= 100 ? 0 : 1).replace(".0 ", " ")
}

export function rate(n: number): string {
  return `${bytes(n, 1)}/s`
}

export function compact(n: number): string {
  if (!n || n < 1) return "0B"
  const i = unitOf(n)
  const v = n / 1024 ** i
  return `${Number(v.toFixed(i === 0 || v >= 100 ? 0 : v >= 10 ? 1 : 2))}${UNITS[i][0]}`
}

export function duration(seconds: number, dayUnit = "天"): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s >= 86400) return `${Math.floor(s / 86400)} ${dayUnit}`
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

const VIRT: Record<string, string> = {
  kvm: "KVM", qemu: "QEMU", vmware: "VMware", microsoft: "Hyper-V", xen: "Xen", oracle: "VirtualBox",
  parallels: "Parallels", bhyve: "bhyve", openvz: "OpenVZ", lxc: "LXC", "lxc-libvirt": "LXC", docker: "Docker",
  podman: "Podman", wsl: "WSL", "systemd-nspawn": "nspawn",
}

export function virtName(virt: string): string {
  return !virt || virt === "none" ? "" : VIRT[virt] ?? virt
}

export function percent(used: number, total: number): number {
  return total > 0 ? Math.min(100, (used / total) * 100) : 0
}

export function uptime(seconds: number, isEn = false): string {
  if (!seconds) return "—"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (isEn) {
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  return d > 0 ? `${d} 天 ${h} 小时` : h > 0 ? `${h} 小时 ${m} 分` : `${m} 分`
}

export type Expiry = { days: number | null; date: string }

/**
 * A node's term, from the RFC 3339 stamp the hub sends. `days` is null when there
 * is no date, or when the date stands in for "permanent": an operator writes
 * 2099-12-31 or 9999-12-31 to mean no expiry, and no billing term runs ten years,
 * so past that it is a sentinel rather than a countdown.
 */
export function expiry(val?: string | number | null): Expiry {
  const none: Expiry = { days: null, date: "" }
  if (val === undefined || val === null || val === "") return none

  let ms = 0
  if (typeof val === "number") {
    ms = val < 1e11 ? val * 1000 : val
  } else {
    const s = val.trim()
    if (!s || s === "0" || s === "null") return none
    if (s.includes("T") || s.includes(" ")) {
      ms = new Date(s).getTime()
    } else if (s.includes("-") || s.includes("/")) {
      ms = new Date(`${s}T00:00:00`).getTime()
    } else {
      const n = Number(s)
      if (!Number.isNaN(n) && n > 0) ms = n < 1e11 ? n * 1000 : n
    }
  }
  if (!ms || Number.isNaN(ms)) return none

  const at = new Date(ms)
  const days = Math.ceil((ms - Date.now()) / 86400000)
  return {
    days: days > FOREVER_DAYS ? null : days,
    date: `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`,
  }
}

const SYMBOLS: Record<string, string> = { USD: "$", CNY: "¥", EUR: "€", GBP: "£", JPY: "¥" }

export function money(amount: number, currency: string): string {
  return `${SYMBOLS[currency] ?? ""}${amount.toFixed(2)}${SYMBOLS[currency] ? "" : ` ${currency}`}`
}

const HHMM = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" })
const MDHHMM = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

export function clockFor(hours: number): (ms: number) => string {
  return hours <= 24 ? (ms: number) => HHMM.format(ms) : (ms: number) => MDHHMM.format(ms)
}

export function osName(name: string): string {
  return name.replace("GNU/Linux ", "").replace(/\s*\([^)]*\)\s*$/, "")
}
const KNOWN_DISTROS = [
  ["debian", "Debian"],
  ["ubuntu", "Ubuntu"],
  ["centos", "CentOS"],
  ["rocky", "Rocky"],
  ["almalinux", "AlmaLinux"],
  ["alma", "AlmaLinux"],
  ["alpine", "Alpine"],
  ["fedora", "Fedora"],
  ["arch", "Arch"],
  ["opensuse", "openSUSE"],
  ["suse", "SUSE"],
  ["red hat", "Red Hat"],
  ["rhel", "RHEL"],
  ["freebsd", "FreeBSD"],
  ["openbsd", "OpenBSD"],
  ["netbsd", "NetBSD"],
  ["windows", "Windows"],
  ["darwin", "macOS"],
  ["mac", "macOS"],
  ["proxmox", "Proxmox"],
  ["openwrt", "OpenWrt"],
  ["android", "Android"],
  ["raspbian", "Raspbian"],
  ["armbian", "Armbian"],
  ["gentoo", "Gentoo"],
  ["nixos", "NixOS"],
  ["manjaro", "Manjaro"],
  ["synology", "Synology"],
  ["unraid", "Unraid"],
] as const

export function shortDistro(raw: string): string {
  if (!raw) return "—"
  const s = raw.toLowerCase()
  for (const [key, label] of KNOWN_DISTROS) {
    if (s.includes(key)) return label
  }
  const first = raw.trim().split(/[\s/_-]+/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Linux"
}

export function cpuName(name: string): string {
  return name
    .replace(/\((R|TM|r|tm)\)/g, "")
    .replace(/\s+(CPU|Processor)\b/g, "")
    .replace(/\s+\d+-Core\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080].map((m) => m * 60_000)

export function timeTicks(from: number, to: number, count = 8): number[] {
  const step = TICK_STEPS.find((s) => (to - from) / s <= count) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const zone = new Date(from).getTimezoneOffset() * 60_000
  const ticks: number[] = []
  for (let t = Math.ceil((from - zone) / step) * step + zone; t <= to; t += step) ticks.push(t)
  return ticks
}

const LADDER: Record<number, number[]> = {
  10: [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10],
  1024: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
}

export function axisTop(max: number, floor: number, base = 10, cap = Infinity): number {
  const target = Math.min(cap, Math.max(max, floor)) / 4
  const scale = base ** Math.floor(Math.log(target) / Math.log(base))
  const step = LADDER[base].map((m) => m * scale).find((n) => n >= target)
  return Math.min(cap, (step ?? target) * 4)
}

export function quarters(top: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => top * f)
}

export function despike(values: (number | null)[], window = 7, sigmas = 3): (number | null)[] {
  const half = window >> 1
  return values.map((v, i) => {
    if (v === null) return v
    const near = values.slice(Math.max(0, i - half), i + half + 1).filter((n) => n !== null) as number[]
    if (near.length === 0) return v
    const sorted = [...near].sort((a, b) => a - b)
    const mid = sorted.length % 2 ? sorted[sorted.length >> 1] : (sorted[(sorted.length >> 1) - 1] + sorted[sorted.length >> 1]) / 2
    const devs = near.map((n) => Math.abs(n - mid)).sort((a, b) => a - b)
    const mad = Math.max(1, devs.length % 2 ? devs[devs.length >> 1] : (devs[(devs.length >> 1) - 1] + devs[devs.length >> 1]) / 2)
    return Math.abs(v - mid) > sigmas * 1.4826 * mad ? mid : v
  })
}

export function ewma(values: (number | null)[], times: number[], tau: number): (number | null)[] {
  let mean: number | null = null
  let last = 0
  const tauMs = tau < 100_000 ? tau * 1000 : tau
  return values.map((v, i) => {
    if (v === null) return null
    mean = mean === null ? v : mean + (1 - Math.exp(-(times[i] - last) / tauMs)) * (v - mean)
    last = times[i]
    return mean
  })
}
