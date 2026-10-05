import { api } from "@/lib/api"
import { readPref } from "@/lib/prefs"

export type Point = {
  ts: number
  cpu: number
  mem_used: number
  disk_used: number
  net_rx: number
  net_tx: number
  load: number
}

export type PingPoint = {
  task_id: number
  ts: number
  latency: number | null
  band?: [number, number]
  loss?: number
}

export type Probes = Record<string, string>

export type History = {
  metrics: Point[]
  ping: PingPoint[]
  probes: Probes
}

export type Series = "metrics" | "ping"

export const RANGES = [
  { hours: 1, labelKey: "range1h" as const },
  { hours: 6, labelKey: "range6h" as const },
  { hours: 24, labelKey: "range24h" as const },
  { hours: 168, labelKey: "range7d" as const },
]

export const inRanges = (hours: number) => RANGES.some((r) => r.hours === hours)
export const LATENCY_HOURS = 24

export function latencyWindow(): number {
  const picked = readPref<number>("latency-hours", LATENCY_HOURS)
  return inRanges(picked) ? picked : LATENCY_HOURS
}

type KomariLoadRecord = {
  time: string
  cpu?: number
  ram?: number
  disk?: number
  load?: number
  net_in?: number
  net_out?: number
}

type KomariPingRecord = {
  task_id: number
  time: string
  value: number
  client: string
}

type KomariPingTask = {
  id: number
  name: string
  type: string
}

const TTL = 30_000
const cache = new Map<string, { at: number; promise: Promise<History> }>()

export function fetchHistory(uuid: string, hours: number, series: Series): Promise<History> {
  const key = `${uuid}/${hours}/${series}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.promise

  const loadData = async (): Promise<History> => {
    if (series === "metrics") {
      const res = await api<{ records: KomariLoadRecord[] }>(
        `/records/load?uuid=${encodeURIComponent(uuid)}&hours=${hours}&load_type=all`
      ).catch(() => ({ records: [] }))

      const records = Array.isArray(res?.records) ? res.records : []
      const metrics: Point[] = records.map((r) => ({
        ts: new Date(r.time).getTime(),
        cpu: r.cpu ?? 0,
        mem_used: r.ram ?? 0,
        disk_used: r.disk ?? 0,
        net_rx: r.net_in ?? 0,
        net_tx: r.net_out ?? 0,
        load: r.load ?? 0,
      })).sort((a, b) => a.ts - b.ts)

      return { metrics, ping: [], probes: {} }
    } else {
      const res = await api<{ records: KomariPingRecord[]; tasks: KomariPingTask[] }>(
        `/records/ping?uuid=${encodeURIComponent(uuid)}&hours=${hours}`
      ).catch(() => ({ records: [], tasks: [] }))

      const records = Array.isArray(res?.records) ? res.records : []
      const tasks = Array.isArray(res?.tasks) ? res.tasks : []

      const probes: Record<string, string> = {}
      for (const t of tasks) {
        probes[String(t.id)] = t.name || `Task ${t.id}`
      }

      const ping: PingPoint[] = records.map((r) => ({
        task_id: r.task_id,
        ts: new Date(r.time).getTime(),
        latency: r.value >= 0 ? r.value : null,
      })).sort((a, b) => a.ts - b.ts)

      return { metrics: [], ping, probes }
    }
  }

  const promise = loadData()
  cache.set(key, { at: Date.now(), promise })
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key)
  })

  return promise
}
