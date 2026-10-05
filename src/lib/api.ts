import { useEffect, useState } from "react"

export type Metrics = {
  uptime: number
  cpu: number
  load: [number, number, number]
  mem_total: number
  mem_used: number
  swap_total: number
  swap_used: number
  disk_total: number
  disk_used: number
  net_rx: number
  net_tx: number
  total_rx: number
  total_tx: number
  month_rx: number
  month_tx: number
  month_used?: number
  tcp: number
  udp: number
  procs: number
}

export type KomariClient = {
  uuid: string
  name: string
  cpu_name: string
  virtualization: string
  arch: string
  cpu_cores: number
  cpu_physical_cores?: number
  os: string
  kernel_version: string
  gpu_name?: string
  ipv4?: string
  ipv6?: string
  region: string
  public_remark?: string
  mem_total: number
  swap_total: number
  disk_total: number
  weight?: number
  price?: number
  billing_cycle?: number
  auto_renewal?: boolean
  currency?: string
  expired_at?: string | null
  group?: string
  tags?: string
  hidden?: boolean
  traffic_limit?: number
  traffic_limit_type?: string
}

export type KomariLiveMetric = {
  cpu: {
    name?: string
    cores?: number
    arch?: string
    usage: number
  }
  ram: {
    total?: number
    used: number
  }
  swap: {
    total?: number
    used: number
  }
  load: {
    load1: number
    load5: number
    load15: number
  }
  disk: {
    total?: number
    used: number
  }
  network: {
    up: number
    down: number
    totalUp: number
    totalDown: number
  }
  connections: {
    tcp: number
    udp: number
  }
  uptime: number
  process: number
  message?: string
  updated_at?: string
}

export type Node = {
  uuid: string
  name: string
  online: boolean
  country: string
  group?: string
  last_seen: number
  metrics: Metrics | null
  os: string
  kernel: string
  arch: string
  virt: string
  cpu_name: string
  cpu_cores: number
  mem_total: number
  swap_total: number
  disk_total: number
  weight: number
  price: number
  currency: string
  billing_cycle: number | string
  expires_at: string | null
  traffic_limit: number
  traffic_mode: string
  remark?: string
}

export type PublicSettings = {
  sitename?: string
  description?: string
  theme?: string
  theme_settings?: {
    default_preset?: "claude" | "default"
    default_appearance?: "system" | "light" | "dark"
    grain_percent?: number
    frosted_percent?: number
    announcement?: string
    [key: string]: unknown
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
    })
  } catch {
    throw new ApiError(0, "Network connection error")
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new ApiError(res.status, text || res.statusText || `HTTP ${res.status}`)
  }

  const json = await res.json()
  if (json && typeof json === "object" && "status" in json && "data" in json) {
    return json.data as T
  }
  return json as T
}

function normalizeNode(
  client: KomariClient,
  isOnline: boolean,
  metric?: KomariLiveMetric,
): Node {
  const m: Metrics | null = metric
    ? {
        uptime: metric.uptime ?? 0,
        cpu: metric.cpu?.usage ?? 0,
        load: [metric.load?.load1 ?? 0, metric.load?.load5 ?? 0, metric.load?.load15 ?? 0],
        mem_total: metric.ram?.total || client.mem_total || 0,
        mem_used: metric.ram?.used ?? 0,
        swap_total: metric.swap?.total || client.swap_total || 0,
        swap_used: metric.swap?.used ?? 0,
        disk_total: metric.disk?.total || client.disk_total || 0,
        disk_used: metric.disk?.used ?? 0,
        net_rx: metric.network?.down ?? 0,
        net_tx: metric.network?.up ?? 0,
        total_rx: metric.network?.totalDown ?? 0,
        total_tx: metric.network?.totalUp ?? 0,
        month_rx: metric.network?.totalDown ?? 0,
        month_tx: metric.network?.totalUp ?? 0,
        tcp: metric.connections?.tcp ?? 0,
        udp: metric.connections?.udp ?? 0,
        procs: metric.process ?? 0,
      }
    : null

  return {
    uuid: client.uuid,
    name: client.name,
    online: isOnline,
    country: client.region || "",
    group: client.group || "",
    last_seen: metric?.updated_at ? new Date(metric.updated_at).getTime() : 0,
    metrics: m,
    os: client.os || "",
    kernel: client.kernel_version || "",
    arch: client.arch || "",
    virt: client.virtualization || "",
    cpu_name: client.cpu_name || "",
    cpu_cores: client.cpu_cores || 1,
    mem_total: client.mem_total || 0,
    swap_total: client.swap_total || 0,
    disk_total: client.disk_total || 0,
    weight: client.weight ?? 0,
    price: client.price ?? 0,
    currency: client.currency || "USD",
    billing_cycle: client.billing_cycle ?? 30,
    expires_at: client.expired_at || null,
    traffic_limit: client.traffic_limit ?? 0,
    traffic_mode: client.traffic_limit_type || "sum",
    remark: client.public_remark || "",
  }
}

export function useNodes(transport?: string) {
  const [nodes, setNodes] = useState<Node[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let socket: WebSocket | null = null
    let pollTimer: number | undefined = undefined
    let healthTimer: number | undefined = undefined
    let clientsCache: KomariClient[] = []
    let stopped = false
    const updateCombined = (
      clients: KomariClient[],
      onlineList: string[] = [],
      liveMap: Record<string, KomariLiveMetric> = {},
    ) => {
      const onlineSet = new Set(onlineList)
      const list = clients
        .filter((c) => !c.hidden)
        .map((c) => normalizeNode(c, onlineSet.has(c.uuid), liveMap[c.uuid]))
        .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "zh-CN"))

      setNodes(list)
      setError(null)
      setLoading(false)
    }

    const loadClients = async () => {
      try {
        const clientList = await api<KomariClient[]>("/nodes")
        if (stopped) return
        clientsCache = Array.isArray(clientList) ? clientList : []
        updateCombined(clientsCache)
      } catch (e) {
        if (stopped) return
        setError(e instanceof Error ? e.message : "Failed to load nodes")
        setLoading(false)
      }
    }

    void loadClients()

    const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/clients`

    const startPolling = () => {
      if (pollTimer !== undefined) return
      pollTimer = window.setInterval(async () => {
        if (stopped) return
        await loadClients()
      }, 5000)
    }
    const connectWs = () => {
      if (transport === "HTTP") {
        startPolling()
        return
      }
      try {
        socket = new WebSocket(wsUrl)
      } catch {
        startPolling()
        return
      }

      socket.onopen = () => {
        socket?.send("get")
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          const data = payload?.data
          if (data && typeof data === "object") {
            const online: string[] = Array.isArray(data.online) ? data.online : []
            const live: Record<string, KomariLiveMetric> = data.data || {}
            updateCombined(clientsCache, online, live)
          }
        } catch {}
      }

      socket.onerror = () => {
        socket?.close()
      }

      socket.onclose = () => {
        if (stopped) return
        startPolling()
        setTimeout(() => {
          if (!stopped) connectWs()
        }, 5000)
      }
    }
    if (transport === "HTTP") {
      startPolling()
    } else {
      connectWs()
      healthTimer = window.setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send("get")
        }
      }, 2000)
    }

    return () => {
      stopped = true
      socket?.close()
      clearInterval(pollTimer)
      clearInterval(healthTimer)
    }
  }, [transport])

  return { nodes, error, loading }
}
