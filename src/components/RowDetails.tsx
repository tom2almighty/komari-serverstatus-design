import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChartLine, ExternalLink, Infinity as InfinityIcon } from "lucide-react"

import { Dot, OsIcon } from "@/components/NodeMarks"
import { Latency } from "@/components/NodeDetail"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Segmented } from "@/components/ui/segmented"
import type { Node } from "@/lib/api"
import {
  bytes, cpuName, expiry, money, osName, pair, percent,
  uptime, virtName,
} from "@/lib/format"
import { fetchHistory, latencyWindow } from "@/lib/history"
import { useI18n } from "@/lib/i18n"
import { knownPing } from "@/lib/pings"
import { Link } from "@/lib/route"
import { cn } from "@/lib/utils"

function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card p-3 sm:p-3.5 text-card-foreground shadow-xs">
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b pb-2 text-xs font-semibold">
        <span className="truncate text-foreground">{title}</span>
        {aside}
      </div>
      <div className="space-y-1.5 min-w-0">{children}</div>
    </section>
  )
}

function Line({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 max-w-full items-baseline justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("tnum min-w-0 truncate text-right font-medium text-foreground", className)}>{children}</span>
    </div>
  )
}

function Overview({ node }: { node: Node }) {
  const { t } = useI18n()
  const m = node.online ? node.metrics : null
  const away = useMemo(() => (node.last_seen ? Math.floor(Date.now() / 1000 - node.last_seen) : 0), [node.last_seen])
  const { days, date } = expiry(node.expires_at)
  const used = m ? m.month_rx + m.month_tx : 0
  const limit = node.traffic_limit

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. 硬件规格 */}
      <Block
        title={t("detailSpecs")}
        aside={
          <div className="flex items-center gap-1.5 shrink-0">
            <Dot node={node} />
            {node.group && <Badge variant="secondary" className="text-2xs py-0 px-1.5 truncate max-w-24">{node.group}</Badge>}
          </div>
        }
      >
        <Line label={t("colOs")}>
          <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
            <OsIcon os={node.os} />
            <span className="truncate">{osName(node.os) || "—"}</span>
          </span>
        </Line>
        {node.kernel && <Line label={t("kernelVersion")}>{node.kernel}</Line>}
        <Line label={t("architecture")}>
          {[node.arch, virtName(node.virt)].filter(Boolean).join(" · ") || "—"}
        </Line>
        <Line label={t("cpuModel")}>
          {node.cpu_name
            ? `${cpuName(node.cpu_name)} (${node.cpu_cores} ${t("coresUnit")})`
            : `${node.cpu_cores} ${t("coresUnit")}`}
        </Line>
        <Line label={node.online ? t("statusOnline") : t("statusOffline")}>
          {node.online ? (m ? uptime(m.uptime) : "—") : away >= 60 ? uptime(away) : "—"}
        </Line>
      </Block>

      {/* 2. 资源监控 */}
      <Block
        title={t("detailResources")}
        aside={
          <Link
            href={`/node/${node.uuid}`}
            className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline shrink-0"
          >
            <ChartLine className="size-3" />
            <span>{t("viewCharts")}</span>
          </Link>
        }
      >
        {m && <Line label={t("colCpu")}>{m.cpu.toFixed(1)}%</Line>}
        <Line label={t("colMem")}>
          {m ? `${pair(m.mem_used, m.mem_total)} (${percent(m.mem_used, m.mem_total).toFixed(0)}%)` : bytes(node.mem_total)}
        </Line>
        {node.swap_total > 0 && (
          <Line label="Swap">
            {m ? `${pair(m.swap_used, m.swap_total)} (${percent(m.swap_used, m.swap_total).toFixed(0)}%)` : bytes(node.swap_total)}
          </Line>
        )}
        <Line label={t("colDisk")}>
          {m ? `${pair(m.disk_used, m.disk_total)} (${percent(m.disk_used, m.disk_total).toFixed(0)}%)` : bytes(node.disk_total)}
        </Line>
        {m && <Line label={t("colLoad")}>{m.load.map((n) => n.toFixed(2)).join(" / ")}</Line>}
      </Block>

      {/* 3. 网络流量 */}
      <Block title={t("detailNetwork")}>
        <Line label={t("colTraffic")}>
          {limit > 0 ? (
            `${pair(used, limit)} (${percent(used, limit).toFixed(1)}%)`
          ) : (
            <span className="inline-flex items-center gap-1">
              <span>{bytes(used)} /</span>
              <InfinityIcon className="size-3 text-muted-foreground" />
            </span>
          )}
        </Line>
        {limit > 0 && (
          <div className="py-0.5">
            <Progress
              value={percent(used, limit)}
              title={pair(used, limit)}
              className="h-1.5"
            />
          </div>
        )}
        {m && (
          <Line label={t("colSpeed")}>
            <span className="inline-flex items-center gap-0.5">
              <span className="text-muted-foreground font-semibold">↓</span>
              <span>{bytes(m.net_rx)}/s</span>
            </span>
            <span className="mx-1 text-muted-foreground/60">·</span>
            <span className="inline-flex items-center gap-0.5">
              <span className="text-muted-foreground font-semibold">↑</span>
              <span>{bytes(m.net_tx)}/s</span>
            </span>
          </Line>
        )}
        {m && (
          <Line label={t("trafficTotal")}>
            {`↓ ${bytes(m.total_rx)} · ↑ ${bytes(m.total_tx)}`}
          </Line>
        )}
        {m && <Line label={t("tcpUdp")}>{`TCP: ${m.tcp} · UDP: ${m.udp}`}</Line>}
      </Block>

      {/* 4. 账期与配置 */}
      <Block title={t("detailBilling")}>
        <Line label={t("price")}>
          {node.price > 0 ? `${money(node.price, node.currency)} / ${node.billing_cycle}${t("daysUnit")}` : "Free"}
        </Line>
        <Line label={t("colExpiry")}>
          {days === null ? (
            <span title={t("forever")} className="inline-flex items-center text-muted-foreground">
              <InfinityIcon className="size-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span>{date}</span>
              {days < 0 ? (
                <Badge variant="destructive" className="px-1 py-0 text-2xs">{t("expired")}</Badge>
              ) : days <= 7 ? (
                <Badge variant="warning" className="px-1 py-0 text-2xs">{days}{t("daysUnit")}</Badge>
              ) : (
                <span className="text-muted-foreground">({days}{t("daysUnit")})</span>
              )}
            </span>
          )}
        </Line>
        {node.remark && <Line label="Remark">{node.remark}</Line>}
        <div className="pt-2">
          <Link
            href={`/node/${node.uuid}`}
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-input bg-background text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span>{t("viewCharts")}</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </Block>
    </div>
  )
}

export function RowDetails({ node }: { node: Node }) {
  const { t } = useI18n()
  const [learned, setLearned] = useState<boolean | null>(null)
  const has = learned ?? knownPing(node.uuid)
  const [tab, setTab] = useState<string>("latency")
  const isConfigured = node.cpu_cores > 0 || node.mem_total > 0
  const shown = has === true ? tab : "overview"

  const tabs = [
    { value: "latency", label: t("detailPingHistory") },
    { value: "overview", label: t("detailSpecs") },
  ]

  useEffect(() => {
    if (isConfigured) void fetchHistory(node.uuid, latencyWindow(), "ping")
  }, [node.uuid, isConfigured])

  if (!isConfigured) {
    return <p className="px-4 py-4 text-xs text-muted-foreground">{t("loading")}</p>
  }

  return (
    <div className="@container w-full max-w-full overflow-hidden min-w-0 space-y-2.5 px-0.5 py-0.5 text-sm">
      {has === true && (
        <div className="flex items-center justify-between pb-1 min-w-0">
          <Segmented value={shown} onChange={setTab} options={tabs} label="Details View" />
          <Link
            href={`/node/${node.uuid}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground shrink-0"
          >
            <span>{t("viewCharts")}</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      )}

      {shown === "latency" ? (
        <div className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border bg-card p-3 shadow-xs">
          <Latency uuid={node.uuid} className="h-65 w-full min-w-0" onKnown={setLearned} />
        </div>
      ) : (
        <Overview node={node} />
      )}
    </div>
  )
}
