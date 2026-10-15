import i18next from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { type ReactNode, useCallback } from "react"
import { I18nextProvider, useTranslation } from "react-i18next"

import enUS from "@/locales/en-US.json"
import zhCN from "@/locales/zh-CN.json"
import type { TranslationKey } from "@/types/i18n"

export type Locale = "zh-CN" | "en-US"

export const resources = {
  "zh-CN": { translation: zhCN },
  "en-US": { translation: enUS },
} as const

void i18next.use(LanguageDetector).init({
  resources,
  fallbackLng: "zh-CN",
  lng: (typeof localStorage !== "undefined" && localStorage.getItem("i18nextLng")) || "zh-CN",
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
    lookupLocalStorage: "i18nextLng",
  },
})

export type { TranslationKey }

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
}

export function useI18n() {
  const { t: translate, i18n } = useTranslation()

  const locale = (i18n.language.startsWith("en") ? "en-US" : "zh-CN") as Locale

  const setLocale = useCallback(
    (next: Locale) => {
      void i18n.changeLanguage(next)
      try {
        localStorage.setItem("i18nextLng", next)
        localStorage.setItem("language", next)
      } catch {}
    },
    [i18n],
  )

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(key, params as Record<string, unknown>)
    },
    [translate],
  )

  return { locale, setLocale, t }
}
