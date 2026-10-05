import type { CSSProperties } from "react"
import {
  siAlmalinux, siAlpinelinux, siApple, siArchlinux, siCentos, siDebian, siFedora, siFreebsd,
  siLinux, siOpensuse, siRedhat, siRockylinux, siUbuntu, type SimpleIcon,
} from "simple-icons"

import type { Node } from "@/lib/api"
import { flagUrl } from "@/lib/flags"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function Dot({ node, className }: { node: Node; className?: string }) {
  const { t } = useI18n()
  const isOnline = node.online
  const isConfigured = node.cpu_cores > 0 || node.mem_total > 0

  return (
    <span
      title={isOnline ? t("statusOnline") : isConfigured ? t("statusOffline") : t("statusPending")}
      className={cn(
        "relative inline-flex size-2 shrink-0 items-center justify-center",
        className,
      )}
    >
      {isOnline ? (
        <>
          <span className="absolute -inset-1 rounded-full bg-success/20 animate-pulse [animation-duration:3s]" />
          <span className="relative size-2 rounded-full bg-success" />
        </>
      ) : (
        <span
          className={cn(
            "size-2 rounded-full",
            isConfigured ? "bg-destructive" : "bg-muted-foreground/40",
          )}
        />
      )}
    </span>
  )
}

export function Flag({ code, className }: { code: string; className?: string }) {
  const url = flagUrl(code)
  if (!url) return <span className="text-muted-foreground">—</span>

  return (
    <span className={cn("inline-flex items-center justify-center align-middle shrink-0", className)}>
      <img
        src={url}
        alt={code}
        title={code}
        className="h-3 w-4 shrink-0 rounded-xs object-cover ring-1 ring-border/40 select-none"
        loading="lazy"
      />
    </span>
  )
}

const DISTROS: [string, SimpleIcon][] = [
  ["debian", siDebian], ["raspbian", siDebian], ["ubuntu", siUbuntu], ["alpine", siAlpinelinux],
  ["centos", siCentos], ["rocky", siRockylinux], ["almalinux", siAlmalinux], ["red hat", siRedhat],
  ["rhel", siRedhat], ["fedora", siFedora], ["arch", siArchlinux], ["opensuse", siOpensuse],
  ["suse", siOpensuse], ["freebsd", siFreebsd], ["apple", siApple], ["darwin", siApple], ["mac", siApple],
]

export function OsIcon({ os, className }: { os: string; className?: string }) {
  if (!os) return null
  const name = os.toLowerCase()
  const icon = DISTROS.find(([key]) => name.includes(key))?.[1] ?? siLinux
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      style={{ "--brand": `#${icon.hex}` } as CSSProperties}
      className={cn("size-4 shrink-0 fill-(--brand) dark:fill-[color-mix(in_oklab,var(--brand)_60%,white)]", className)}
    >
      <path d={icon.path} />
    </svg>
  )
}
