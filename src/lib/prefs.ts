import { useState } from "react"

const PREFIX = "serverstatus:"

export function readPref<T extends boolean | number | string>(name: string, initial: T): T {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFIX + name) ?? "null") as unknown
    return typeof saved === typeof initial ? (saved as T) : initial
  } catch {
    return initial
  }
}

export function usePref<T extends boolean | number | string>(name: string, initial: T) {
  const [value, setValue] = useState<T>(() => readPref(name, initial))
  return [
    value,
    (next: T) => {
      try {
        localStorage.setItem(PREFIX + name, JSON.stringify(next))
      } catch {}
      setValue(next)
    },
  ] as const
}
