import { Activity, Globe, Monitor, Moon, Settings, Sun } from "lucide-react"
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from "react"
import { ServerTable, ServerTableSkeleton } from "@/components/ServerTable"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { api, type PublicSettings, useNodes } from "@/lib/api"
import { I18nProvider, useI18n } from "@/lib/i18n"
import { Link } from "@/lib/route"
import { clampPageWidth } from "@/lib/themes"

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
  const { mode, dark, choose } = useTheme()

  useEffect(() => {
    api<PublicSettings>("/public")
      .then((info) => setPublicInfo(info))
      .catch(() => {})
  }, [])

  const pageWidth = clampPageWidth(Number(publicInfo?.theme_settings?.max_width))
  const announcement = String(publicInfo?.theme_settings?.announcement ?? "")
  const siteTitle = publicInfo?.sitename || t("siteTitle")
  const onlineCount = nodes ? nodes.filter((n) => n.online).length : 0
  const totalCount = nodes ? nodes.length : 0

  const modes = [
    { value: "light" as const, label: <Sun className="size-3.5" />, title: t("appearanceLight") },
    {
      value: "system" as const,
      label: <Monitor className="size-3.5" />,
      title: t("appearanceSystem"),
    },
    { value: "dark" as const, label: <Moon className="size-3.5" />, title: t("appearanceDark") },
  ]

  return (
    <div
      className="km-layout relative flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20"
      style={{ "--page-max": `${pageWidth}px` } as CSSProperties}
    >
      <header className="km-navbar sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-(--page-max) items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-85"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
                <Activity className="size-4" />
              </div>
              <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {siteTitle}
              </h1>
            </Link>
            {totalCount > 0 && (
              <span className="hidden select-none items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-2xs text-muted-foreground sm:inline-flex">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="tnum font-medium text-foreground">
                  {onlineCount}/{totalCount}
                </span>
              </span>
            )}
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
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Globe className="size-3.5 mr-1" />
              {locale === "zh-CN" ? "EN" : "中"}
            </Button>

            {admin && (
              <a
                href="/admin/dashboard"
                target="_blank"
                rel="noopener"
                title={t("adminPanel")}
                aria-label={t("adminPanel")}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Settings className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {announcement && (
        <div className="mx-auto w-full max-w-(--page-max) px-4 pt-4 sm:px-6">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-foreground/90">
            {announcement}
          </div>
        </div>
      )}

      <main className="km-main mx-auto w-full max-w-(--page-max) flex-1 space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="w-full">
          {loading && !nodes ? (
            <ServerTableSkeleton />
          ) : nodes ? (
            <ServerTable nodes={nodes} />
          ) : null}
        </div>
      </main>

      <footer className="km-footer mt-auto shrink-0 border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex w-full max-w-(--page-max) flex-col items-center justify-center gap-1.5 px-4 sm:flex-row sm:gap-3 sm:px-6">
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
