import "i18next"
import type zhCN from "@/locales/zh-CN.json"

export type TranslationKey = keyof typeof zhCN

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: {
      translation: typeof zhCN
    }
  }
}
