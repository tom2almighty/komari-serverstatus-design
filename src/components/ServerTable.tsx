import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Dot, Flag, OsIcon } from "@/components/NodeMarks"
import { RowDetails } from "@/components/RowDetails"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Metrics, Node } from "@/lib/api"
import { compact, duration, pair, percent, shortDistro } from "@/lib/format"
import { useIsDesktop } from "@/lib/hooks"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

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
      : safe >= 90
        ? "bg-destructive text-destructive-foreground"
        : safe >= 80
          ? "bg-warning text-warning-foreground"
          : "bg-success text-success-foreground"
  return (
    <div
      title={title}
      className="relative w-full h-5 overflow-hidden rounded bg-muted/70 dark:bg-muted/40 shadow-inner @max-3xl:h-4"
    >
      {safe !== null && (
        <div
          className={cn("h-full rounded-l-xs transition-[width] duration-500", tone)}
          style={{ width: `${safe}%` }}
        />
      )}
      <span className="tabular-nums absolute inset-y-0 left-1.5 flex items-center text-2xs leading-none text-foreground font-medium @max-3xl:left-0.5">
        {label ?? (safe !== null ? `${safe.toFixed(1)}%` : "—")}
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
        <span className="text-info font-semibold text-2xs leading-none">↑</span>
        <span className="font-medium text-foreground">{compact(m.net_tx)}/s</span>
      </span>
      <span className="tnum inline-flex items-center gap-0.5 text-muted-foreground">
        <span className="text-success font-semibold text-2xs leading-none">↓</span>
        <span className="font-medium text-foreground">{compact(m.net_rx)}/s</span>
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
 * Mobile hides: os, uptime, location, load (4 columns hidden on mobile, 7 columns shown).
 * Mobile retains: status(8%), name(26%), speed(18%), cpu(12%), mem(12%), disk(12%), traffic(12%) = 100%
 * Desktop displays all 11:
 * status(4%), name(22%), os(9%), location(7%), uptime(7%), load(6%), speed(14%), cpu(7.66%), mem(7.67%), disk(7.67%), traffic(8%) = 100%
 */
const COL_CLASSES = {
  status: "px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  name: "px-1 py-1 md:px-1.5 md:py-1 text-left overflow-hidden align-middle",
  os: "hidden md:table-cell px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  location:
    "hidden md:table-cell px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  uptime:
    "hidden md:table-cell px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  load: "hidden md:table-cell px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  speed: "px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  cpu: "px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  mem: "px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  disk: "hidden md:table-cell px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
  traffic: "px-1 py-1 md:px-1.5 md:py-1 text-center overflow-hidden align-middle",
}

/**
 * 排序方向标。窄屏下 cpu/mem/disk 列只有 30 余像素，方向标放进文字流会把「CPU」「RAM」
 * 挤成「C…」，所以移动端把它钉在表头单元格右上角，桌面端回到标签右侧。
 */
const SORT_CARET =
  "absolute top-0.5 right-0.5 size-2 text-primary md:static md:top-auto md:right-auto md:size-3 md:ml-0.5 md:shrink-0"

type SortField =
  | "name"
  | "os"
  | "location"
  | "uptime"
  | "load"
  | "speed"
  | "traffic"
  | "cpu"
  | "mem"
  | "disk"
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

function Row({ node, index, isDesktop }: { node: Node; index: number; isDesktop: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const m = node.online ? node.metrics : null

  const cpu = m ? m.cpu : null
  const mem = m ? percent(m.mem_used, m.mem_total) : null
  const disk = m ? percent(m.disk_used, m.disk_total) : null
  const shade = index % 2 ? "bg-muted/40" : ""

  return (
    <>
      <TableRow
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))
        }
        className={cn(
          "km-ui-table-row cursor-pointer select-none transition-colors hover:bg-accent/80",
          shade,
          open && "bg-muted/70 hover:bg-muted/80",
        )}
      >
        <TableCell className={COL_CLASSES.status}>
          <div className="flex items-center justify-center">
            <Dot node={node} />
          </div>
        </TableCell>

        {/* 2. 节点名称 */}
        <TableCell className={COL_CLASSES.name} title={node.name}>
          <span className="block truncate font-medium text-foreground text-xs md:text-sm">
            {node.name}
          </span>
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
        <TableCell
          className={cn(COL_CLASSES.uptime, "tnum text-xs font-medium text-muted-foreground")}
        >
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

      {/* 展开详细信息行：严格匹配当前视口可见列数 (移动端 7 列，桌面端 11 列)，绝对不挤压或重排父表格 */}
      {open && (
        <TableRow className="bg-muted/15 hover:bg-muted/15">
          <TableCell colSpan={isDesktop ? 11 : 6} className="p-0 text-left whitespace-normal">
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
    <TableHead className={cn(className, "relative")}>
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
            <ArrowUp className={SORT_CARET} />
          ) : (
            <ArrowDown className={SORT_CARET} />
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
      list = list.filter((n) =>
        selectedGroup === "UNGROUPED" ? !n.group : n.group === selectedGroup,
      )
    }

    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.country.toLowerCase().includes(q) ||
          n.os.toLowerCase().includes(q) ||
          Boolean(n.group?.toLowerCase().includes(q)),
      )
    }

    return sortNodes(list, sortField, sortOrder)
  }, [nodes, selectedGroup, filter, sortField, sortOrder])

  const tabs = [
    { value: "ALL", label: t("allGroups"), count: nodes.length },
    ...groups.map((g) => ({
      value: g,
      label: g,
      count: nodes.filter((n) => n.group === g).length,
    })),
    ...(ungrouped > 0 ? [{ value: "UNGROUPED", label: t("ungrouped"), count: ungrouped }] : []),
  ]

  return (
    <div className="km-instance-server-list w-full space-y-3">
      {/* 顶部工具栏：分组选择器与搜索框（平铺无卡片外壳） */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
        {/* 分组筛选：一组可切换的按钮，选中态用实心次级底色，未选中保持幽灵态 */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const active = selectedGroup === tab.value
            return (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={active ? "secondary" : "ghost"}
                aria-pressed={active}
                onClick={() => setSelectedGroup(tab.value)}
                className={cn(
                  "h-8 gap-1.5 px-2.5 sm:px-3 text-xs font-medium",
                  active
                    ? "font-semibold text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="truncate">{tab.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "tnum h-4 min-w-4 px-1 text-2xs",
                    active ? "bg-background text-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </Badge>
              </Button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 sm:size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="km-ui-input pl-8 pr-8 text-xs h-8"
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

      {/* 数据表格：平铺式边框容器，无内外嵌套卡片与阴影 */}
      <div className="w-full overflow-hidden rounded-lg border border-border/80 bg-card/30">
        <Table
          className="km-ui-table table-fixed w-full text-center text-xs md:text-sm [&_tbody_tr]:h-8 sm:[&_tbody_tr]:h-7.5"
          containerClassName="relative w-full overflow-hidden"
        >
          {/* 使用 colgroup 锁死列宽百分比模型 */}
          <colgroup>
            <col className="w-7 sm:w-8" />
            <col className="w-auto" />
            <col className="hidden md:table-column md:w-24" />
            <col className="hidden md:table-column md:w-16" />
            <col className="hidden md:table-column md:w-16" />
            <col className="hidden md:table-column md:w-16" />
            <col className="w-22 sm:w-26 md:w-32" />
            <col className="w-13 sm:w-16 md:w-20" />
            <col className="w-13 sm:w-16 md:w-20" />
            <col className="hidden md:table-column md:w-20" />
            <col className="w-16 sm:w-20 md:w-24" />
          </colgroup>

          <TableHeader className="bg-muted/40 border-b border-border/80">
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
                  colSpan={isDesktop ? 11 : 6}
                  className="h-28 text-center text-muted-foreground text-sm"
                >
                  {t("noNodes")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((node, index) => (
                <Row key={node.uuid} node={node} index={index} isDesktop={isDesktop} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ServerTableSkeleton() {
  const isDesktop = useIsDesktop()
  return (
    <div className="km-instance-server-list w-full space-y-3">
      <div className="w-full overflow-hidden rounded-lg border border-border/80 bg-card/30">
        <Table
          className="km-ui-table table-fixed w-full text-xs"
          containerClassName="relative w-full overflow-hidden"
        >
          <colgroup>
            <col className="w-7 sm:w-8" />
            <col className="w-auto" />
            <col className="hidden md:table-column md:w-24" />
            <col className="hidden md:table-column md:w-16" />
            <col className="hidden md:table-column md:w-16" />
            <col className="hidden md:table-column md:w-16" />
            <col className="w-22 sm:w-26 md:w-32" />
            <col className="w-13 sm:w-16 md:w-20" />
            <col className="w-13 sm:w-16 md:w-20" />
            <col className="hidden md:table-column md:w-20" />
            <col className="w-16 sm:w-20 md:w-24" />
          </colgroup>
          <TableHeader className="bg-muted/40 border-b border-border/80">
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
                <TableCell colSpan={isDesktop ? 11 : 6} className="p-3">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
