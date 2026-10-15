import { type ComponentProps, useEffect, useState } from "react"

export type RouteState = {
  tab: "servers" | "charts"
  nodeUuid: string | null
}

function parseRoute(): RouteState {
  const path = location.pathname
  const hash = location.hash.replace(/^#/, "")
  const target = hash || path

  const nodeMatch = target.match(/(?:^|\/)node\/([a-zA-Z0-9_-]+)/)
  if (nodeMatch) {
    return { tab: "charts", nodeUuid: nodeMatch[1] }
  }
  if (target === "/charts" || target.includes("/charts")) {
    return { tab: "charts", nodeUuid: null }
  }
  return { tab: "servers", nodeUuid: null }
}

export function useAppRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(parseRoute)
  useEffect(() => {
    const sync = () => setRoute(parseRoute())
    addEventListener("popstate", sync)
    addEventListener("hashchange", sync)
    return () => {
      removeEventListener("popstate", sync)
      removeEventListener("hashchange", sync)
    }
  }, [])
  return route
}

export function navigate(href: string) {
  history.pushState({}, "", href)
  dispatchEvent(new PopStateEvent("popstate"))
  scrollTo(0, 0)
}

export function Link({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return
        e.preventDefault()
        navigate(href)
      }}
      {...props}
    />
  )
}
