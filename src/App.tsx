import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import { Activity, ChartLine, Check, Globe, Monitor, Moon, Palette, RotateCcw, Server, Settings, Sun } from "lucide-react"

import { NodePicker } from "@/components/NodePicker"
import { ServerTable, ServerTableSkeleton } from "@/components/ServerTable"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SEGMENT, Segmented } from "@/components/ui/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { api, useNodes, type PublicSettings } from "@/lib/api"
import { I18nProvider, useI18n } from "@/lib/i18n"
import { Link, useAppRoute } from "@/lib/route"
import { applyTheme, clampPageWidth, DEFAULT_RADIUS, PRIMARY_COLOR_PRESETS, RADIUS_PRESETS } from "@/lib/themes"
import { cn } from "@/lib/utils"

import { NodeDetail } from "@/components/NodeDetail"
const DARK_MEDIA = matchMedia("(prefers-color-scheme: dark)")
type Mode = "light" | "dark" | "system"

function savedAppearance(): Mode {
  try {
    const saved = localStorage.getItem("appearance") || localStorage.getItem("theme")
    return saved === "dark" || saved === "light" ? saved : "system"
  } catch {
    return "system"
  }
}

function useTheme() {
  const [mode, setMode] = useState<Mode>(savedAppearance)
  const systemDark = useSyncExternalStore(
    (notify) => {
      DARK_MEDIA.addEventListener("change", notify)
      return () => DARK_MEDIA.removeEventListener("change", notify)
    },
    () => DARK_MEDIA.matches,
  )
  const dark = mode === "system" ? systemDark : mode === "dark"

  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === "appearance" || e.key === "theme") {
        setMode(savedAppearance())
      }
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  const choose = (next: Mode) => {
    try {
      if (next === "system") {
        localStorage.removeItem("appearance")
        localStorage.removeItem("theme")
      } else {
        localStorage.setItem("appearance", next)
        localStorage.setItem("theme", next)
      }
    } catch {}
    setMode(next)
  }

  return { mode, dark, choose }
}

function useThemeCustomizer(
  serverCustomPrimary = "",
  serverCustomRadius = DEFAULT_RADIUS,
) {
  const [primary, setPrimary] = useState<string>(() => {
    try {
      return localStorage.getItem("theme-primary") ?? serverCustomPrimary
    } catch {
      return serverCustomPrimary
    }
  })

  const [radius, setRadius] = useState<string>(() => {
    try {
      return localStorage.getItem("theme-radius") ?? serverCustomRadius
    } catch {
      return serverCustomRadius
    }
  })

  useEffect(() => {
    applyTheme(primary, radius)
    try {
      if (primary.trim()) localStorage.setItem("theme-primary", primary.trim())
      else localStorage.removeItem("theme-primary")

      if (radius.trim()) localStorage.setItem("theme-radius", radius.trim())
      else localStorage.removeItem("theme-radius")
    } catch {}
  }, [primary, radius])

  const reset = () => {
    setPrimary("")
    setRadius(DEFAULT_RADIUS)
    try {
      localStorage.removeItem("theme-primary")
      localStorage.removeItem("theme-radius")
    } catch {}
  }

  return {
    primary,
    setPrimary,
    radius,
    setRadius,
    reset,
    isCustomized: Boolean(primary.trim() || (radius && radius !== DEFAULT_RADIUS)),
  }
}

function ThemeSettingsPopover({
  primary,
  onPrimaryChange,
  radius,
  onRadiusChange,
  onReset,
  isCustomized,
}: {
  primary: string
  onPrimaryChange: (val: string) => void
  radius: string
  onRadiusChange: (val: string) => void
  onReset: () => void
  isCustomized: boolean
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", clickAway)
    return () => document.removeEventListener("mousedown", clickAway)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((o) => !o)}
        title={t("themeCustomizer")}
        className={cn("text-muted-foreground hover:text-foreground cursor-pointer", open && "bg-accent text-foreground")}
      >
        <Palette className="size-4" />
      </Button>

      {open && (
        <Card className="absolute right-0 top-full z-50 mt-2 w-72 p-3.5 shadow-xs border-border/80 bg-popover text-popover-foreground">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Palette className="size-3.5 text-primary" />
                {t("themeCustomizer")}
              </h4>
              {isCustomized && (
                <button
                  type="button"
                  onClick={onReset}
                  title={t("resetStyle")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>{t("resetStyle")}</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("themePrimary")}</label>
              <div className="flex items-center gap-1.5">
                {PRIMARY_COLOR_PRESETS.map((p) => {
                  const active = primary.toLowerCase() === p.value.toLowerCase() || (!primary && p.value === "#18181b")
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => onPrimaryChange(p.value)}
                      title={p.name}
                      style={{ backgroundColor: p.value }}
                      className={cn(
                        "size-6 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ring-offset-background",
                        active && "ring-2 ring-foreground ring-offset-1",
                      )}
                    >
                      {active && <Check className="size-3 text-primary-foreground" />}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="color"
                  value={primary || "#18181b"}
                  onChange={(e) => onPrimaryChange(e.target.value)}
                  className="size-7 rounded-md border border-border cursor-pointer p-0 bg-transparent shrink-0"
                />
                <Input
                  placeholder="#18181b"
                  value={primary}
                  onChange={(e) => onPrimaryChange(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-xs font-medium text-muted-foreground">{t("themeRadius")}</label>
              <div className="grid grid-cols-5 gap-1">
                {RADIUS_PRESETS.map((r) => {
                  const active = (radius || DEFAULT_RADIUS) === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => onRadiusChange(r.value)}
                      className={cn(
                        "h-6 rounded-md text-xs font-mono border transition-colors cursor-pointer",
                        active
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border/60 hover:bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

type Me = { username?: string; logged_in?: boolean }

/**
 * GET /api/me needs no auth and answers with raw JSON: Guest with
 * `logged_in: false`, or the operator's profile with `logged_in: true`. The
 * theme only needs that flag, so the admin entry never renders for a visitor.
 *
 * `no-store` keeps the identity out of the HTTP cache, and the focus re-check
 * catches a sign-in or sign-out made in the admin panel on the same origin,
 * which the theme cannot observe directly.
 */
function useAdmin() {
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    let active = true
    const check = () => {
      api<Me>("/me", { cache: "no-store" })
        .then((me) => {
          if (active) setAdmin(me?.logged_in === true)
        })
        .catch(() => {})
    }
    const onWake = () => {
      if (document.visibilityState === "visible") check()
    }

    check()
    document.addEventListener("visibilitychange", onWake)
    window.addEventListener("focus", onWake)
    return () => {
      active = false
      document.removeEventListener("visibilitychange", onWake)
      window.removeEventListener("focus", onWake)
    }
  }, [])

  return admin
}

function MainApp() {
  const { t, locale, setLocale } = useI18n()
  const [publicInfo, setPublicInfo] = useState<PublicSettings | null>(null)
  const admin = useAdmin()
  const rpcTransport = String(publicInfo?.theme_settings?.rpcTransport ?? "WebSocket")
  const { nodes, error, loading } = useNodes(rpcTransport)
  const route = useAppRoute()
  const { mode, dark, choose } = useTheme()

  useEffect(() => {
    api<PublicSettings>("/public")
      .then((info) => setPublicInfo(info))
      .catch(() => {})
  }, [])

  const defaultPrimary = String(publicInfo?.theme_settings?.custom_primary ?? "")
  const defaultRadius = String(publicInfo?.theme_settings?.custom_radius ?? DEFAULT_RADIUS)
  const pageWidth = clampPageWidth(Number(publicInfo?.theme_settings?.max_width))
  const announcement = String(publicInfo?.theme_settings?.announcement ?? "")
  const siteTitle = publicInfo?.sitename || t("siteTitle")

  const {
    primary,
    setPrimary,
    radius,
    setRadius,
    reset,
    isCustomized,
  } = useThemeCustomizer(defaultPrimary, defaultRadius)

  const selectedNodeUuid = useMemo(() => {
    if (route.nodeUuid) return route.nodeUuid
    if (nodes && nodes.length > 0) {
      const firstOnline = nodes.find((n) => n.online)
      return firstOnline ? firstOnline.uuid : nodes[0].uuid
    }
    return null
  }, [route.nodeUuid, nodes])

  const selectedNode = useMemo(() => {
    if (!selectedNodeUuid || !nodes) return null
    return nodes.find((n) => n.uuid === selectedNodeUuid) ?? null
  }, [selectedNodeUuid, nodes])


  const modes = [
    { value: "light" as const, label: <Sun className="size-3.5" />, title: t("appearanceLight") },
    { value: "system" as const, label: <Monitor className="size-3.5" />, title: t("appearanceSystem") },
    { value: "dark" as const, label: <Moon className="size-3.5" />, title: t("appearanceDark") },
  ]

  const activeTab = route.tab

  return (
    <div
      className="km-layout relative flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20"
      style={{ "--page-max": `${pageWidth}px` } as CSSProperties}
    >
      <header className="km-navbar sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="@container mx-auto flex h-14 max-w-(--page-max) flex-nowrap items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-85">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Activity className="size-4" />
              </div>
              <h1 className="hidden max-w-36 truncate text-sm font-semibold tracking-tight @2xl:inline">{siteTitle}</h1>
            </Link>

            {/* Top navigation: the same trough as the radio groups below, as links
                so a middle click still opens a tab. */}
            <div className={cn(SEGMENT.list, "shrink-0")}>
              <Link
                href="/"
                aria-current={activeTab === "servers" ? "page" : undefined}
                className={cn(SEGMENT.item, activeTab === "servers" ? SEGMENT.on : SEGMENT.off)}
              >
                <Server />
                <span className="hidden @md:inline">{t("tabServers")}</span>
              </Link>
              <Link
                href={selectedNodeUuid ? `/node/${selectedNodeUuid}` : "/charts"}
                aria-current={activeTab === "charts" ? "page" : undefined}
                className={cn(SEGMENT.item, activeTab === "charts" ? SEGMENT.on : SEGMENT.off)}
              >
                <ChartLine />
                <span className="hidden @md:inline">{t("tabCharts")}</span>
              </Link>
            </div>

          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Segmented
              value={mode}
              onChange={choose}
              options={modes}
              label={t("appearanceSystem")}
              className="hidden @xl:inline-flex"
            />

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => choose(dark ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground cursor-pointer @xl:hidden"
            >
              {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale(locale === "zh-CN" ? "en" : "zh-CN")}
              title="Switch Language"
              className="px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Globe className="size-3.5 mr-1" />
              {locale === "zh-CN" ? "EN" : "中"}
            </Button>

            <ThemeSettingsPopover
              primary={primary}
              onPrimaryChange={setPrimary}
              radius={radius}
              onRadiusChange={setRadius}
              onReset={reset}
              isCustomized={isCustomized}
            />

            {admin && (
              <a
                href="/admin/dashboard"
                target="_blank"
                rel="noopener"
                title={t("adminPanel")}
                aria-label={t("adminPanel")}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Settings className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {announcement && (
        <div className="mx-auto max-w-(--page-max) px-3 pt-4 sm:px-6">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-foreground/90">
            {announcement}
          </div>
        </div>
      )}

      <main className="km-main @container mx-auto w-full max-w-(--page-max) flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {activeTab === "charts" ? (
          <div className="flex w-full flex-col gap-6 @3xl:flex-row">
            <div className="@3xl:w-64 @3xl:shrink-0">
              {nodes ? (
                <NodePicker nodes={nodes} selected={selectedNodeUuid || ""} />
              ) : (
                <Skeleton className="h-64 w-full rounded-lg" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {selectedNode ? (
                <Suspense fallback={<Skeleton className="h-120 w-full rounded-lg" />}>
                  <NodeDetail node={selectedNode} />
                </Suspense>
              ) : loading ? (
                <Skeleton className="h-120 w-full rounded-lg" />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">{t("noNodes")}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {loading && !nodes ? (
              <ServerTableSkeleton />
            ) : nodes ? (
              <ServerTable nodes={nodes} />
            ) : null}
          </div>
        )}
      </main>

      <footer className="km-footer mt-auto shrink-0 border-t py-3.5 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-(--page-max) flex-col items-center justify-center gap-1 px-3 sm:flex-row sm:gap-3 sm:px-6">
          <p>
            Powered by{" "}
            <a
              href="https://github.com/komari-monitor/komari"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Komari Monitor
            </a>
          </p>
          <span className="hidden opacity-40 sm:inline">·</span>
          <p>
            Theme:{" "}
            <a
              href="https://github.com/tom2almighty/komari-serverstatus-design"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              ServerStatus Design
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <I18nProvider>
      <MainApp />
    </I18nProvider>
  )
}

export default App
