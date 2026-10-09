import { useMemo, useState, useSyncExternalStore } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Search, X } from "lucide-react"

import { Dot, Flag, OsIcon } from "@/components/NodeMarks"
import { RowDetails } from "@/components/RowDetails"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Metrics, Node } from "@/lib/api"
import { compact, duration, pair, percent, shortDistro } from "@/lib/format"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {}
      const m = window.matchMedia("(min-width: 768px)")
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => (typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true),
    () => true,
  )
}

/**
 * ServerStatus style percentage progress bar with centered value text.
 * Strictly uses Shadcn UI semantic tokens: --chart-2 (normal), --warning (elevated), --destructive (high).
 */
function ProgressBar({
  value,
  online,
  title,
  label,
}: {
  value: number | null
  online: boolean
  title?: string
  label?: string
}) {
  const safe = online && value !== null ? Math.min(100, Math.max(0, value)) : null

  const tone =
    safe === null
      ? "bg-muted-foreground/30"
      : safe >= 85
        ? "bg-destructive/85"
        : safe >= 70
          ? "bg-warning/85"
          : "bg-success/85"
  return (
    <div
      title={title}
      className="relative w-full h-4.5 md:h-5 rounded-xs bg-muted/70 dark:bg-muted/40 overflow-hidden flex items-center justify-center select-none"
    >
      {safe !== null && (
        <div
          className={cn("absolute inset-y-0 left-0 transition-[width] duration-300", tone)}
          style={{ width: `${safe}%` }}
        />
      )}
      <span className="relative z-10 text-2xs md:text-xs font-semibold tabular-nums text-foreground leading-none drop-shadow-2xs">
        {label ?? (safe !== null ? `${safe.toFixed(0)}%` : "—")}
      </span>
    </div>
  )
}

function SpeedCell({ m, online }: { m: Metrics | null; online: boolean }) {
  if (!online || !m) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 leading-none text-2xs md:text-xs">
      <span className="tnum inline-flex items-center gap-0.5 text-muted-foreground">
        <span className="text-success font-semibold text-2xs leading-none">↓</span>
        <span className="font-medium text-foreground">{compact(m.net_rx)}/s</span>
      </span>
      <span className="tnum inline-flex items-center gap-0.5 text-muted-foreground">
        <span className="text-info font-semibold text-2xs leading-none">↑</span>
        <span className="font-medium text-foreground">{compact(m.net_tx)}/s</span>
      </span>
    </div>
  )
}

function TrafficCell({ node }: { node: Node }) {
  if (!node.online || !node.metrics) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  const m = node.metrics
  const total = m.month_rx + m.month_tx
  const limit = node.traffic_limit
  const hasQuota = limit > 0

  // 与 CPU/内存/硬盘同一种形式：数字直接叠在进度条上；无配额时显示已用流量
  return (
    <ProgressBar
      value={hasQuota ? percent(total, limit) : null}
      online={node.online}
      title={hasQuota ? pair(total, limit) : compact(total)}
      label={hasQuota ? undefined : compact(total)}
    />
  )
}


/**
 * Strict column percentage definitions that sum to 100% on both mobile (9 columns) and desktop (11 columns).
 * Traffic sits last on both breakpoints; mobile hides os and uptime (2 columns).
 * Mobile retains: status(7%), name(19%), location(6%), load(8%), speed(14%), cpu(11.5%), mem(11.5%), disk(11.5%), traffic(11.5%) = 100%
 * Desktop displays all 11:
 * status(4%), name(22%), os(9%), location(7%), uptime(7%), load(6%), speed(14%), cpu(7.66%), mem(7.67%), disk(7.67%), traffic(8%) = 100%
 */
const COL_CLASSES = {
  status: "w-[7%] md:w-[4%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  name: "w-[19%] md:w-[22%] px-0.5 py-1.5 md:px-2 md:py-2 text-left overflow-hidden align-middle",
  os: "hidden md:table-cell md:w-[9%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  location: "w-[6%] md:w-[7%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  uptime: "hidden md:table-cell md:w-[7%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  load: "w-[8%] md:w-[6%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  speed: "w-[14%] md:w-[14%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  cpu: "w-[11.5%] md:w-[7.66%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  mem: "w-[11.5%] md:w-[7.67%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  disk: "w-[11.5%] md:w-[7.67%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
  traffic: "w-[11.5%] md:w-[8%] px-0.5 py-1.5 md:px-2 md:py-2 text-center overflow-hidden align-middle",
}

type SortField = "name" | "os" | "location" | "uptime" | "load" | "speed" | "traffic" | "cpu" | "mem" | "disk"
type SortOrder = "asc" | "desc"

function sortNodes(nodes: Node[], field: SortField | null, order: SortOrder): Node[] {
  if (!field) {
    return [...nodes].sort((a, b) => b.weight - a.weight)
  }

  return [...nodes].sort((a, b) => {
    let res = 0
    const ma = a.online ? a.metrics : null
    const mb = b.online ? b.metrics : null

    switch (field) {
      case "name":
        res = a.name.localeCompare(b.name, "zh-CN")
        break
      case "os":
        res = a.os.localeCompare(b.os)
        break
      case "location":
        res = a.country.localeCompare(b.country)
        break
      case "uptime":
        res = (ma?.uptime ?? -1) - (mb?.uptime ?? -1)
        break
      case "load":
        res = (ma?.load[0] ?? -1) - (mb?.load[0] ?? -1)
        break
      case "speed": {
        const sa = ma ? ma.net_rx + ma.net_tx : -1
        const sb = mb ? mb.net_rx + mb.net_tx : -1
        res = sa - sb
        break
      }
      case "traffic": {
        const ta = ma ? ma.month_rx + ma.month_tx : 0
        const tb = mb ? mb.month_rx + mb.month_tx : 0
        res = ta - tb
        break
      }
      case "cpu":
        res = (ma?.cpu ?? -1) - (mb?.cpu ?? -1)
        break
      case "mem": {
        const pa = ma ? ma.mem_used / Math.max(1, ma.mem_total) : -1
        const pb = mb ? mb.mem_used / Math.max(1, mb.mem_total) : -1
        res = pa - pb
        break
      }
      case "disk": {
        const pa = ma ? ma.disk_used / Math.max(1, ma.disk_total) : -1
        const pb = mb ? mb.disk_used / Math.max(1, mb.disk_total) : -1
        res = pa - pb
        break
      }
    }

    return order === "desc" ? -res : res
  })
}

function Row({ node, isDesktop }: { node: Node; isDesktop: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const m = node.online ? node.metrics : null

  const cpu = m ? m.cpu : null
  const mem = m ? percent(m.mem_used, m.mem_total) : null
  const disk = m ? percent(m.disk_used, m.disk_total) : null

  return (
    <>
      <TableRow
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
        className={cn(
          "km-ui-table-row cursor-pointer select-none transition-colors hover:bg-muted/50",
          open && "bg-muted/30 hover:bg-muted/40",
        )}
      >
        {/* 1. 状态 */}
        <TableCell className={COL_CLASSES.status}>
          <div className="flex items-center justify-center">
            <Dot node={node} />
          </div>
        </TableCell>

        {/* 2. 节点名称 */}
        <TableCell className={COL_CLASSES.name} title={node.name}>
          <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
            <ChevronRight
              className={cn(
                "size-3 md:size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-90 text-foreground",
              )}
            />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground text-xs md:text-sm">
              {node.name}
            </span>
          </div>
        </TableCell>

        {/* 3. 系统平台 (小屏隐藏) */}
        <TableCell className={COL_CLASSES.os}>
          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <OsIcon os={node.os} className="size-3.5 opacity-85 shrink-0" />
            <span className="truncate text-xs text-muted-foreground font-medium">
              {shortDistro(node.os)}
            </span>
          </div>
        </TableCell>

        {/* 4. 位置 */}
        <TableCell className={COL_CLASSES.location}>
          <div className="flex items-center justify-center min-w-0">
            <Flag code={node.country} />
          </div>
        </TableCell>
        {/* 5. 运行时间 (小屏隐藏) */}
        <TableCell className={cn(COL_CLASSES.uptime, "tnum text-xs font-medium text-muted-foreground")}>
          {m ? duration(m.uptime, t("daysUnit")) : "—"}
        </TableCell>

        {/* 6. 负载 */}
        <TableCell className={cn(COL_CLASSES.load, "tnum text-xs font-medium text-foreground")}>
          {m ? m.load[0].toFixed(2) : "—"}
        </TableCell>

        {/* 7. 实时网速 */}
        <TableCell className={COL_CLASSES.speed}>
          <SpeedCell m={m} online={node.online} />
        </TableCell>

        {/* 8. CPU 进度条 */}
        <TableCell className={COL_CLASSES.cpu}>
          <ProgressBar
            value={cpu}
            online={node.online}
            title={m ? `${t("colCpu")}: ${m.cpu.toFixed(1)}%` : undefined}
          />
        </TableCell>

        {/* 9. 内存 进度条 */}
        <TableCell className={COL_CLASSES.mem}>
          <ProgressBar
            value={mem}
            online={node.online}
            title={m ? pair(m.mem_used, m.mem_total) : undefined}
          />
        </TableCell>

        {/* 10. 硬盘 进度条 */}
        <TableCell className={COL_CLASSES.disk}>
          <ProgressBar
            value={disk}
            online={node.online}
            title={m ? pair(m.disk_used, m.disk_total) : undefined}
          />
        </TableCell>

        {/* 11. 流量 进度条 */}
        <TableCell className={COL_CLASSES.traffic}>
          <TrafficCell node={node} />
        </TableCell>
      </TableRow>

      {/* 展开详细信息行：严格匹配当前视口可见列数 (移动端 9 列，桌面端 11 列)，绝对不挤压或重排父表格 */}
      {open && (
        <TableRow className="bg-muted/15 hover:bg-muted/15">
          <TableCell colSpan={isDesktop ? 11 : 9} className="p-0 text-left whitespace-normal">
            <div className="w-full max-w-full min-w-0 overflow-hidden p-2.5 sm:p-3.5 bg-muted/20 border-b">
              <RowDetails node={node} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function SortableHead({
  className,
  label,
  shortLabel,
  field,
  sortField,
  sortOrder,
  onSort,
}: {
  className: string
  label: string
  shortLabel?: string
  field: SortField
  sortField: SortField | null
  sortOrder: SortOrder
  onSort: (f: SortField) => void
}) {
  const active = sortField === field

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex w-full items-center justify-center text-2xs md:text-xs font-semibold cursor-pointer select-none transition-colors",
          active ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="truncate">
          {shortLabel ? (
            <>
              <span className="md:hidden">{shortLabel}</span>
              <span className="hidden md:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        {active ? (
          sortOrder === "asc" ? (
            <ArrowUp className="size-2.5 md:size-3 shrink-0 text-primary ml-0.5" />
          ) : (
            <ArrowDown className="size-2.5 md:size-3 shrink-0 text-primary ml-0.5" />
          )
        ) : (
          <ArrowUpDown className="hidden md:inline-block size-2.5 shrink-0 opacity-40 ml-0.5" />
        )}
      </button>
    </TableHead>
  )
}

export function ServerTable({ nodes }: { nodes: Node[] }) {
  const { t } = useI18n()
  const isDesktop = useIsDesktop()
  const [filter, setFilter] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  const groups = useMemo(() => {
    const list: string[] = []
    for (const n of nodes) {
      if (n.group && !list.includes(n.group)) list.push(n.group)
    }
    return list
  }, [nodes])

  const ungrouped = useMemo(() => nodes.filter((n) => !n.group).length, [nodes])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === "desc") setSortOrder("asc")
      else {
        setSortField(null)
        setSortOrder("desc")
      }
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    let list = nodes
    if (selectedGroup !== "ALL") {
      list = list.filter((n) => (selectedGroup === "UNGROUPED" ? !n.group : n.group === selectedGroup))
    }

    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.country.toLowerCase().includes(q) ||
          n.os.toLowerCase().includes(q) ||
          (n.group && n.group.toLowerCase().includes(q)),
      )
    }

    return sortNodes(list, sortField, sortOrder)
  }, [nodes, selectedGroup, filter, sortField, sortOrder])

  const tabs = [
    { value: "ALL", label: t("allGroups"), count: nodes.length },
    ...groups.map((g) => ({ value: g, label: g, count: nodes.filter((n) => n.group === g).length })),
    ...(ungrouped > 0 ? [{ value: "UNGROUPED", label: t("ungrouped"), count: ungrouped }] : []),
  ]

  return (
    <div className="km-instance-server-list w-full space-y-3 sm:space-y-4">
      {/* 顶部工具栏：分组选择器与搜索框 */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const active = selectedGroup === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedGroup(tab.value)}
                className={cn(
                  "inline-flex h-7 sm:h-8 items-center gap-1.5 rounded-md px-2.5 sm:px-3 text-xs font-medium transition-colors cursor-pointer select-none",
                  active
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "tnum rounded-full px-1.5 py-0.2 text-2xs",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/80 text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 sm:size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="km-ui-input pl-8 pr-8 text-xs h-7 sm:h-8"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 数据表格卡片：百分比固定列宽 + 移动端9列/桌面端11列，完全不横向滚动 */}
      <Card className="km-node-card overflow-hidden">
        <CardContent className="p-0">
          <Table
            className="km-ui-table table-fixed w-full text-xs"
            containerClassName="relative w-full overflow-hidden"
          >
            {/* 使用 colgroup 锁死列宽百分比模型 */}
            <colgroup>
              <col className="w-[7%] md:w-[4%]" />
              <col className="w-[19%] md:w-[22%]" />
              <col className="hidden md:table-column md:w-[9%]" />
              <col className="w-[6%] md:w-[7%]" />
              <col className="hidden md:table-column md:w-[7%]" />
              <col className="w-[8%] md:w-[6%]" />
              <col className="w-[14%] md:w-[14%]" />
              <col className="w-[11.5%] md:w-[7.66%]" />
              <col className="w-[11.5%] md:w-[7.67%]" />
              <col className="w-[11.5%] md:w-[7.67%]" />
              <col className="w-[11.5%] md:w-[8%]" />
            </colgroup>

            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={COL_CLASSES.status}>
                  <span className="sr-only">{t("colStatus")}</span>
                </TableHead>
                <SortableHead
                  className={COL_CLASSES.name}
                  label={t("colName")}
                  shortLabel={t("colName") === "节点名称" ? "节点" : undefined}
                  field="name"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.os}
                  label={t("colOs")}
                  field="os"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.location}
                  label={t("colLocation")}
                  shortLabel={t("colLocation") === "地区" ? "位置" : undefined}
                  field="location"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.uptime}
                  label={t("colUptimeShort")}
                  field="uptime"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.load}
                  label={t("colLoad")}
                  field="load"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.speed}
                  label={t("colSpeedShort")}
                  field="speed"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.cpu}
                  label={t("colCpu")}
                  field="cpu"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.mem}
                  label={t("colMemShort")}
                  field="mem"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.disk}
                  label={t("colDisk")}
                  field="disk"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  className={COL_CLASSES.traffic}
                  label={t("colTrafficShort")}
                  field="traffic"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isDesktop ? 11 : 9}
                    className="h-28 text-center text-muted-foreground text-sm"
                  >
                    {t("noNodes")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((node) => <Row key={node.uuid} node={node} isDesktop={isDesktop} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function ServerTableSkeleton() {
  const isDesktop = useIsDesktop()
  return (
    <Card className="km-node-card overflow-hidden">
      <CardContent className="p-0">
        <Table
          className="km-ui-table table-fixed w-full text-xs"
          containerClassName="relative w-full overflow-hidden"
        >
          <colgroup>
            <col className="w-[7%] md:w-[4%]" />
            <col className="w-[19%] md:w-[22%]" />
            <col className="hidden md:table-column md:w-[9%]" />
            <col className="w-[6%] md:w-[7%]" />
            <col className="hidden md:table-column md:w-[7%]" />
            <col className="w-[8%] md:w-[6%]" />
            <col className="w-[14%] md:w-[14%]" />
            <col className="w-[11.5%] md:w-[7.66%]" />
            <col className="w-[11.5%] md:w-[7.67%]" />
            <col className="w-[11.5%] md:w-[7.67%]" />
            <col className="w-[11.5%] md:w-[8%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={COL_CLASSES.status}>
                <Skeleton className="mx-auto size-2 rounded-full" />
              </TableHead>
              <TableHead className={COL_CLASSES.name}>
                <Skeleton className="h-3.5 w-16" />
              </TableHead>
              <TableHead className={COL_CLASSES.os}>
                <Skeleton className="mx-auto h-3.5 w-12" />
              </TableHead>
              <TableHead className={COL_CLASSES.location}>
                <Skeleton className="mx-auto h-3.5 w-8" />
              </TableHead>
              <TableHead className={COL_CLASSES.uptime}>
                <Skeleton className="mx-auto h-3.5 w-10" />
              </TableHead>
              <TableHead className={COL_CLASSES.load}>
                <Skeleton className="mx-auto h-3.5 w-8" />
              </TableHead>
              <TableHead className={COL_CLASSES.speed}>
                <Skeleton className="mx-auto h-3.5 w-14" />
              </TableHead>
              <TableHead className={COL_CLASSES.cpu}>
                <Skeleton className="mx-auto h-3.5 w-10" />
              </TableHead>
              <TableHead className={COL_CLASSES.mem}>
                <Skeleton className="mx-auto h-3.5 w-10" />
              </TableHead>
              <TableHead className={COL_CLASSES.disk}>
                <Skeleton className="mx-auto h-3.5 w-10" />
              </TableHead>
              <TableHead className={COL_CLASSES.traffic}>
                <Skeleton className="mx-auto h-3.5 w-14" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={isDesktop ? 11 : 9} className="p-3">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
