import { useSyncExternalStore } from "react"

export function useIsDesktop(query = "(min-width: 768px)") {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {}
      const m = window.matchMedia(query)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : true),
    () => true,
  )
}
