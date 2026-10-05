import { useState } from "react"
import { Search, X } from "lucide-react"

import { Dot, Flag, OsIcon } from "@/components/NodeMarks"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { Node } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Link } from "@/lib/route"
import { cn } from "@/lib/utils"

export function NodePicker({ nodes, selected }: { nodes: Node[]; selected: string }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = q
    ? nodes.filter((n) => `${n.name} ${n.country} ${n.os} ${n.group ?? ""}`.toLowerCase().includes(q))
    : nodes

  return (
    <aside className="flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-xs @3xl:sticky @3xl:top-18 @3xl:max-h-[calc(100svh-6rem)]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="km-ui-input pl-8 pr-8 text-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <nav className="min-h-0 space-y-1 overflow-y-auto pr-1">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("noNodes")}</p>
        ) : (
          shown.map((n) => {
            const active = n.uuid === selected
            return (
              <Link
                key={n.uuid}
                href={`/node/${n.uuid}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Dot node={n} className="size-2 shrink-0" />
                <Flag code={n.country} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{n.name}</span>
                <OsIcon os={n.os} className="shrink-0 size-3.5 opacity-75" />
                {n.group && (
                  <Badge
                    variant={active ? "outline" : "secondary"}
                    className={cn(
                      "text-2xs py-0 px-1 truncate max-w-20",
                      active && "border-primary-foreground/30 text-primary-foreground",
                    )}
                  >
                    {n.group}
                  </Badge>
                )}
              </Link>
            )
          })
        )}
      </nav>
    </aside>
  )
}
