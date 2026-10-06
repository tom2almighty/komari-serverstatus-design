import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts"

import { Dot, Flag, OsIcon } from "@/components/NodeMarks"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Segmented } from "@/components/ui/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import type { Node } from "@/lib/api"
import {
  axisBytes, axisTop, bytes, clockFor, compact, despike, ewma, quarters, rate, percent, timeTicks, uptime,
} from "@/lib/format"
import { fetchHistory, inRanges, LATENCY_HOURS, RANGES, type History, type Point, type Series } from "@/lib/history"
import { useI18n, type TranslationKey } from "@/lib/i18n"
import { knownPing, recordPing } from "@/lib/pings"
import { usePref } from "@/lib/prefs"
import { Link } from "@/lib/route"
import { cn } from "@/lib/utils"

const AXIS = { stroke: "currentColor", fontSize: 11, tickLine: false, axisLine: false }
const SERIES = { dot: false as const, strokeWidth: 1.5, isAnimationActive: false }
const Y_WIDTH = 68

const PALETTE = [1, 2, 3, 4, 5].map((i) => `var(--color-chart-${i})`)

const TIP = {
  fontSize: 12,
  padding: "8px 12px",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  border: "1px solid var(--color-border)",
  borderRadius: "calc(var(--radius) - 2px)",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)",
}

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 p-4 text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

function useHistory(uuid: string, hours: number, series: Series) {
  const [state, setState] = useState<{
    uuid: string
    hours: number
    series: Series
    data: History | null
    failed: string
    loading: boolean
  }>({
    uuid,
    hours,
    series,
    data: null,
    failed: "",
    loading: true,
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    fetchHistory(uuid, hours, series)
      .then((res) => {
        if (!active) return
        setState({ uuid, hours, series, data: res, failed: "", loading: false })
        if (series === "ping") {
          recordPing(uuid, res.ping.length > 0, hours)
        }
      })
      .catch((err: Error) => {
        if (!active) return
        setState({ uuid, hours, series, data: null, failed: err.message || "Failed to load", loading: false })
      })

    return () => {
      active = false
    }
  }, [uuid, hours, series, attempt])

  const fresh = state.uuid === uuid && state.hours === hours && state.series === series
  return {
    data: fresh ? state.data : null,
    failed: fresh ? state.failed : "",
    loading: !fresh || state.loading,
    retry: () => setAttempt((n) => n + 1),
  }
}

function timeAxis(rows: { ts: number }[], hours: number) {
  const first = rows[0]?.ts ?? 0
  const last = rows[rows.length - 1]?.ts ?? 0
  return {
    dataKey: "ts",
    type: "number" as const,
    domain: ["dataMin", "dataMax"] as const,
    ticks: rows.length ? timeTicks(first, last) : undefined,
    tickFormatter: clockFor(hours),
    minTickGap: hours > 24 ? 72 : 40,
    ...AXIS,
  }
}

export function Latency({
  uuid, hours: fixed, className, onKnown,
}: { uuid: string; hours?: number; card?: boolean; className?: string; onKnown?: (has: boolean) => void }) {
  const { t } = useI18n()
  const [picked, setPicked] = usePref<number>("latency-hours", LATENCY_HOURS)
  const hours = fixed ?? (inRanges(picked) ? picked : LATENCY_HOURS)
  const { data, failed, loading, retry } = useHistory(uuid, hours, "ping")
  const [despiked, setDespiked] = usePref<boolean>("despike", false)
  const [smoothed, setSmoothed] = usePref<boolean>("ewma", false)
  const [hiddenTasks, setHiddenTasks] = useState<Record<number, boolean>>({})

  const toggleTask = useCallback((taskId: number) => {
    setHiddenTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }, [])

  useEffect(() => {
    if (data) onKnown?.(data.ping.length > 0)
  }, [data, onKnown])

  const probeTasks = useMemo(() => {
    if (!data) return []
    const map = new Map<number, string>()
    for (const p of data.ping) {
      if (!map.has(p.task_id)) {
        map.set(p.task_id, data.probes[String(p.task_id)] || `Task ${p.task_id}`)
      }
    }
    return Array.from(map.entries())
  }, [data])

  const chartRows = useMemo(() => {
    if (!data || data.ping.length === 0) return []
    // Time binning: bucket samples so multiple probes align and total points stay reasonable (<200)
    const bucketMs = hours <= 1 ? 30_000 : hours <= 6 ? 120_000 : hours <= 24 ? 300_000 : 1_800_000
    const buckets = new Map<number, { ts: number; [key: string]: number | null }>()

    for (const p of data.ping) {
      const bTs = Math.floor(p.ts / bucketMs) * bucketMs
      let row = buckets.get(bTs)
      if (!row) {
        row = { ts: bTs }
        buckets.set(bTs, row)
      }
      const k = `probe_${p.task_id}`
      if (p.latency !== null) {
        const cur = row[k]
        // The hub reports latency as a float; the chart is an integer display.
        row[k] = cur !== undefined && cur !== null ? Math.round((cur + p.latency) / 2) : Math.round(p.latency)
      } else if (row[k] === undefined) {
        row[k] = null
      }
    }

    const rows = Array.from(buckets.values()).sort((a, b) => a.ts - b.ts).map((r) => ({ ...r }))
    if (!despiked && !smoothed) return rows

    // Process filters per probe
    for (const [taskId] of probeTasks) {
      const key = `probe_${taskId}`
      const rawVals = rows.map((r) => r[key] ?? null)
      let proc = rawVals
      if (despiked) proc = despike(proc)
      if (smoothed) proc = ewma(proc, rows.map((r) => r.ts), 600 * 1000)
      for (let i = 0; i < rows.length; i++) {
        // despike and ewma both return floats; round back to the integer display.
        const v = proc[i]
        rows[i][key] = v === null ? null : Math.round(v)
      }
    }
    return rows
  }, [data, probeTasks, despiked, smoothed, hours])

  const label = (ts: unknown) => new Date(Number(ts)).toLocaleString()

  if (loading && !data) return <Skeleton className={cn("w-full rounded-lg", className || "h-64")} />
  if (failed) {
    return (
      <div className="py-8 text-center text-xs text-destructive">
        {failed} <button onClick={retry} className="ml-1 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  if (chartRows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        {t("noChartData")}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Toggle pressed={despiked} onPressedChange={setDespiked}>
            {t("chartDespike")}
          </Toggle>
          <Toggle pressed={smoothed} onPressedChange={setSmoothed}>
            {t("chartSmooth")}
          </Toggle>
        </div>
        {!fixed && (
          <Segmented
            value={hours}
            onChange={setPicked}
            options={RANGES.map((r) => ({ value: r.hours, label: t(r.labelKey) }))}
            label="Time"
          />
        )}
      </div>

      <div className={cn("w-full", className || "h-64")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows}>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis {...timeAxis(chartRows, hours)} />
            <YAxis unit="ms" width={Y_WIDTH} allowDecimals={false} {...AXIS} />
            <Tooltip
              labelFormatter={label}
              formatter={(v) => `${Math.round(Number(v))} ms`}
              contentStyle={TIP}
            />
            {probeTasks.map(([taskId, name], i) => (
              <Line
                key={taskId}
                dataKey={`probe_${taskId}`}
                name={name}
                hide={Boolean(hiddenTasks[taskId])}
                stroke={PALETTE[i % PALETTE.length]}
                {...SERIES}
              />
            ))}
            {probeTasks.length > 0 && (
              <Legend
                content={() => (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 select-none">
                    {probeTasks.map(([taskId, name], i) => {
                      const isHidden = Boolean(hiddenTasks[taskId])
                      const color = PALETTE[i % PALETTE.length]
                      return (
                        <button
                          key={taskId}
                          type="button"
                          onClick={() => toggleTask(taskId)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium transition-all cursor-pointer border",
                            isHidden
                              ? "border-dashed border-border/70 bg-muted/20 text-muted-foreground/50 opacity-60 hover:opacity-90"
                              : "border-border bg-card/90 text-foreground shadow-2xs hover:bg-accent",
                          )}
                          title={isHidden ? `${name} (已隐藏，点击显示)` : `${name} (点击隐藏)`}
                        >
                          <span
                            className={cn(
                              "size-2 rounded-full shrink-0 transition-opacity",
                              isHidden ? "opacity-30" : "opacity-100",
                            )}
                            style={{ backgroundColor: color }}
                          />
                          <span className={cn("truncate max-w-44", isHidden && "line-through opacity-70")}>
                            {name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function NodeDetail({ node }: { node: Node }) {
  const { t } = useI18n()
  const [hours, setHours] = useState(6)
  const [picked, setChart] = usePref<string>("chart", "cpu")
  const [learned, setLearned] = useState<{ uuid: string; has: boolean } | null>(null)
  const known = learned !== null && learned.uuid === node.uuid ? learned.has : knownPing(node.uuid)
  const learn = useCallback((has: boolean) => setLearned({ uuid: node.uuid, has }), [node.uuid])

  const CHARTS = [
    { key: "cpu", labelKey: "colCpu" as TranslationKey },
    { key: "mem", labelKey: "colMem" as TranslationKey },
    { key: "net", labelKey: "colSpeed" as TranslationKey },
    { key: "disk", labelKey: "colDisk" as TranslationKey },
    { key: "ping", labelKey: "detailPingHistory" as TranslationKey },
  ]

  const charts = CHARTS.filter((c) => c.key !== "ping" || known === true)
  const chart = charts.some((c) => c.key === picked) ? picked : "cpu"
  const { data, failed, loading, retry } = useHistory(node.uuid, hours, "metrics")

  const m = node.metrics
  const away = useMemo(() => (node.last_seen ? Math.floor(Date.now() / 1000 - node.last_seen) : 0), [node.last_seen])

  const metricRows = useMemo(() => {
    const raw = data?.metrics ?? []
    if (raw.length <= 250) return raw
    const step = Math.ceil(raw.length / 200)
    const out: Point[] = []
    for (let i = 0; i < raw.length; i += step) {
      out.push(raw[i])
    }
    return out
  }, [data])

  const tops = useMemo(() => {
    const max = (pick: (pt: Point) => number) =>
      metricRows.reduce((hi, pt) => Math.max(hi, pick(pt)), 0)
    return {
      cpu: axisTop(max((pt) => pt.cpu), 4, 10, 100),
      rate: axisTop(max((pt) => Math.max(pt.net_rx, pt.net_tx)), 1024, 1024),
    }
  }, [metricRows])

  const label = (ts: unknown) => new Date(Number(ts)).toLocaleString()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Dot node={node} />
          <Flag code={node.country} className="text-sm" />
          <h2 className="truncate text-lg font-bold tracking-tight text-foreground">{node.name}</h2>
          <OsIcon os={node.os} className="size-4 opacity-75" />
          <Badge variant={node.online ? "success" : (node.cpu_cores > 0 || node.mem_total > 0) ? "destructive" : "secondary"}>
            {node.online ? `${t("statusOnline")} ${m ? uptime(m.uptime) : ""}` : (node.cpu_cores > 0 || node.mem_total > 0) ? `${t("statusOffline")} ${away >= 60 ? uptime(away) : ""}` : t("statusOffline")}
          </Badge>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground shrink-0"
        >
          <ArrowLeft className="size-3.5" />
          <span>{t("backToServers")}</span>
        </Link>
      </div>

      {m && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-2.5 text-xs shadow-2xs">
            <span className="text-muted-foreground">{t("colCpu")}</span>
            <p className="tnum font-bold text-foreground mt-0.5">{m.cpu.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border bg-card p-2.5 text-xs shadow-2xs">
            <span className="text-muted-foreground">{t("colMem")}</span>
            <p className="tnum font-bold text-foreground mt-0.5">{percent(m.mem_used, m.mem_total).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border bg-card p-2.5 text-xs shadow-2xs">
            <span className="text-muted-foreground">{t("colSpeed")}</span>
            <p className="tnum font-bold text-foreground mt-0.5">↓ {compact(m.net_rx)}/s · ↑ {compact(m.net_tx)}/s</p>
          </div>
          <div className="rounded-lg border bg-card p-2.5 text-xs shadow-2xs">
            <span className="text-muted-foreground">{t("colLoad")}</span>
            <p className="tnum font-bold text-foreground mt-0.5">{m.load[0].toFixed(2)}</p>
          </div>
        </div>
      )}
      {node.remark && (
        <p className="rounded-lg border border-border/80 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{node.remark}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
        <Segmented
          value={chart}
          onChange={setChart}
          options={charts.map((c) => ({ value: c.key, label: t(c.labelKey) }))}
          label="Charts"
          className="max-w-full min-w-0 overflow-x-auto"
        />
        <Segmented
          value={hours}
          onChange={setHours}
          options={RANGES.map((r) => ({ value: r.hours, label: t(r.labelKey) }))}
          label="Time Range"
        />
      </div>

      {chart === "ping" ? null : !data ? (
        <Skeleton className="h-64 w-full" />
      ) : failed ? (
        <div className="py-8 text-center text-xs text-destructive">
          {failed} <button onClick={retry} className="ml-1 underline cursor-pointer">Retry</button>
        </div>
      ) : metricRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noChartData")}</p>
      ) : (
        <div className={cn("transition-opacity", loading && "opacity-50")}>
          {chart === "cpu" ? (
            <Panel title={t("colCpu")}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricRows}>
                  <CartesianGrid className="stroke-border" vertical={false} />
                  <XAxis {...timeAxis(metricRows, hours)} />
                  <YAxis domain={[0, tops.cpu]} ticks={quarters(tops.cpu)} unit="%" width={Y_WIDTH} {...AXIS} />
                  <Tooltip labelFormatter={label} formatter={(v) => [`${Number(v).toFixed(1)}%`, "CPU"]} contentStyle={TIP} />
                  <Area dataKey="cpu" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.15} {...SERIES} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          ) : chart === "mem" ? (
            <Panel title={`${t("colMem")} · ${bytes(node.mem_total)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricRows}>
                  <CartesianGrid className="stroke-border" vertical={false} />
                  <XAxis {...timeAxis(metricRows, hours)} />
                  <YAxis domain={[0, node.mem_total]} ticks={quarters(node.mem_total)} tickFormatter={axisBytes} width={Y_WIDTH} {...AXIS} />
                  <Tooltip labelFormatter={label} formatter={(v) => bytes(Number(v))} contentStyle={TIP} />
                  <Area dataKey="mem_used" name={t("colMem")} stroke="var(--color-chart-4)" fill="var(--color-chart-4)" fillOpacity={0.15} {...SERIES} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          ) : chart === "net" ? (
            <Panel
              title={
                <>
                  {t("colSpeed")}
                  <span className="ml-3 text-chart-2">● RX</span>
                  <span className="ml-2 text-chart-3">● TX</span>
                </>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricRows}>
                  <CartesianGrid className="stroke-border" vertical={false} />
                  <XAxis {...timeAxis(metricRows, hours)} />
                  <YAxis domain={[0, tops.rate]} ticks={quarters(tops.rate)} tickFormatter={axisBytes} unit="/s" width={Y_WIDTH} {...AXIS} />
                  <Tooltip labelFormatter={label} formatter={(v) => rate(Number(v))} contentStyle={TIP} />
                  <Line dataKey="net_rx" name="RX" stroke="var(--color-chart-2)" {...SERIES} />
                  <Line dataKey="net_tx" name="TX" stroke="var(--color-chart-3)" {...SERIES} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          ) : (
            <Panel title={`${t("colDisk")} · ${bytes(node.disk_total)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricRows}>
                  <CartesianGrid className="stroke-border" vertical={false} />
                  <XAxis {...timeAxis(metricRows, hours)} />
                  <YAxis domain={[0, node.disk_total]} ticks={quarters(node.disk_total)} tickFormatter={axisBytes} width={Y_WIDTH} {...AXIS} />
                  <Tooltip labelFormatter={label} formatter={(v) => bytes(Number(v))} contentStyle={TIP} />
                  <Area dataKey="disk_used" name={t("colDisk")} stroke="var(--color-chart-5)" fill="var(--color-chart-5)" fillOpacity={0.15} {...SERIES} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          )}
        </div>
      )}

      {(chart === "ping" || known === undefined) && (
        <div hidden={chart !== "ping"}>
          <Latency uuid={node.uuid} hours={hours} className="h-64" onKnown={learn} />
        </div>
      )}
    </div>
  )
}
