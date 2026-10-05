import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Locale = "zh-CN" | "en"

export const translations = {
  "zh-CN": {
    // Header & Navigation
    siteTitle: "服务器监控",
    tabServers: "服务器列表",
    tabCharts: "负载图表",
    nodesCount: "台服务器",
    onlineCount: "台在线",
    offlineCount: "台离线",
    searchPlaceholder: "搜索节点、分组、系统、地区...",
    allGroups: "全部节点",
    ungrouped: "未分组",

    // Appearance & Customization
    appearanceLight: "浅色",
    appearanceDark: "深色",
    appearanceSystem: "跟随系统",
    themeCustomizer: "主题定制",
    adminPanel: "后台管理",
    themePrimary: "主题色彩",
    themeRadius: "圆角大小",
    customColor: "自定义色值",
    resetStyle: "恢复默认",

    // Table Columns & Sort
    colStatus: "状态",
    colName: "节点名称",
    colLocation: "地区",
    colOs: "系统",
    colUptime: "运行时间",
    colExpiry: "到期时间",
    colLoad: "负载",
    colSpeed: "网络速率",
    colCpu: "CPU",
    colMem: "内存",
    colDisk: "磁盘",
    colTraffic: "月流量",
    // Headers are set short: a twelve-column table has no room for the full
    // names above their own columns, and the detail panel spells them out.
    colMemShort: "内存",
    colUptimeShort: "在线",
    colExpiryShort: "到期",
    colSpeedShort: "网速",
    colTrafficShort: "流量",

    // Status & Units
    statusOnline: "在线",
    statusOffline: "离线",
    statusPending: "未接入",
    expired: "已过期",
    forever: "永不到期",
    daysUnit: "天",
    coresUnit: "核",

    // Detail & Charts
    detailSpecs: "硬件规格",
    detailResources: "资源监控",
    detailNetwork: "网络流量",
    detailBilling: "账期信息",
    detailLoadHistory: "负载历史",
    detailPingHistory: "延迟",
    chartDespike: "去噪",
    chartSmooth: "平滑",
    cpuModel: "CPU 型号",
    architecture: "系统架构",
    virtualization: "虚拟化",
    kernelVersion: "内核版本",
    trafficLimit: "流量配额",
    trafficReset: "重置日",
    trafficTotal: "累计总流量",
    tcpUdp: "活跃连接",
    billing: "计费周期",
    price: "费用",

    // Time ranges
    range1h: "1 小时",
    range6h: "6 小时",
    range24h: "24 小时",
    range7d: "7 天",

    // Overview Bar
    overview: "状态概览",
    overviewHealth: "节点健康",
    overviewBandwidth: "实时带宽",
    overviewTraffic: "当月流量",
    overviewLoad: "平均负载",
    overviewResources: "资源规模",
    allOnline: "全节点运行正常",
    someOffline: "{count} 台节点离线",
    networkRx: "下行",
    networkTx: "上行",
    viewCharts: "查看图表",
    backToServers: "返回列表",
    clearSearch: "清除",
    totalCores: "总核心",
    totalMem: "总内存",

    // Empty & Alerts
    noNodes: "暂无服务器节点数据",
    noChartData: "该时间段内暂无历史数据",
    loading: "正在连接监控服务...",
    reconnecting: "连接已断开，正在尝试重连...",
    poweredBy: "Powered by Komari Monitor.",
  },
  en: {
    // Header & Navigation
    siteTitle: "Server Monitor",
    tabServers: "Servers",
    tabCharts: "Charts & Metrics",
    nodesCount: "Servers",
    onlineCount: "Online",
    offlineCount: "Offline",
    searchPlaceholder: "Search nodes, groups, OS, region...",
    allGroups: "All Nodes",
    ungrouped: "Ungrouped",
    // Appearance & Customization
    appearanceLight: "Light",
    appearanceDark: "Dark",
    appearanceSystem: "System",
    themeCustomizer: "Theme Customizer",
    adminPanel: "Admin Panel",
    themePrimary: "Primary Color",
    themeRadius: "Corner Radius",
    customColor: "Custom Color",
    resetStyle: "Reset",

    // Table Columns & Sort
    colStatus: "Status",
    colName: "Node Name",
    colLocation: "Region",
    colOs: "OS",
    colUptime: "Uptime",
    colExpiry: "Expiry",
    colLoad: "Load",
    colSpeed: "Network",
    colCpu: "CPU",
    colMem: "Memory",
    colDisk: "Disk",
    colTraffic: "Traffic",
    colMemShort: "RAM",
    colUptimeShort: "Uptime",
    colExpiryShort: "Expiry",
    colSpeedShort: "Network",
    colTrafficShort: "Traffic",

    // Status & Units
    statusOnline: "Online",
    statusOffline: "Offline",
    statusPending: "Pending",
    expired: "Expired",
    forever: "Never",
    daysUnit: "d",
    coresUnit: "Cores",

    // Detail & Charts
    detailSpecs: "Specifications",
    detailResources: "Resources",
    detailNetwork: "Network & Traffic",
    detailBilling: "Billing & Term",
    detailLoadHistory: "Load History",
    detailPingHistory: "Latency",
    chartDespike: "Despike",
    chartSmooth: "Smooth",
    cpuModel: "CPU Model",
    architecture: "Architecture",
    virtualization: "Virtualization",
    kernelVersion: "Kernel",
    trafficLimit: "Traffic Quota",
    trafficReset: "Reset Day",
    trafficTotal: "Total Transfer",
    tcpUdp: "Active Connections",
    billing: "Billing Cycle",
    price: "Price",

    // Time ranges
    range1h: "1h",
    range6h: "6h",
    range24h: "24h",
    range7d: "7d",

    // Empty & Alerts
    // Overview Bar
    overview: "Overview",
    overviewHealth: "Nodes Health",
    overviewBandwidth: "Real-time Bandwidth",
    overviewTraffic: "Monthly Traffic",
    overviewLoad: "Average Load",
    overviewResources: "Total Resources",
    allOnline: "All nodes operational",
    someOffline: "{count} node(s) offline",
    networkRx: "Down",
    networkTx: "Up",
    viewCharts: "View Charts",
    backToServers: "Back to Servers",
    clearSearch: "Clear",
    totalCores: "Total Cores",
    totalMem: "Total RAM",

    // Empty & Alerts
    noNodes: "No server nodes found",
    noChartData: "No history records in this period",
    loading: "Connecting to monitor service...",
    reconnecting: "Disconnected, attempting to reconnect...",
    poweredBy: "Powered by Komari Monitor.",
  },
} as const

export type TranslationKey = keyof (typeof translations)["zh-CN"]

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem("language")
    if (saved === "en" || saved === "zh-CN") return saved
    if (saved?.toLowerCase().startsWith("zh")) return "zh-CN"
    if (saved?.toLowerCase().startsWith("en")) return "en"
  } catch {}

  const nav = navigator.language?.toLowerCase() || ""
  return nav.startsWith("zh") ? "zh-CN" : "en"
}

type I18nContextType = {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: "zh-CN",
  setLocale: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = (next: Locale) => {
    try {
      localStorage.setItem("language", next)
    } catch {}
    setLocaleState(next)
    document.documentElement.lang = next
  }

  useEffect(() => {
    document.documentElement.lang = locale
    const onStorage = (e: StorageEvent) => {
      if (e.key === "language" && (e.newValue === "en" || e.newValue === "zh-CN")) {
        setLocaleState(e.newValue)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [locale])

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[locale] || translations["zh-CN"]
    let text: string = dict[key] ?? translations["zh-CN"][key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
      }
    }
    return text
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
