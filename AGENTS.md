# AGENTS.md

## 核心原则

1. 遵循 KISS、YAGNI 和 Fail-Fast，避免无必要抽象；一般项目无须向后兼容，不写大批量兜底或兼容代码。
2. 事实优先：以代码、测试、官方文档和运行结果为准，发现错误指令必须指出。
3. 风格规范：自然干脆的工程师口吻，禁用 AI 泛滥词汇，无空话套话，就事论事。
4. 文档规范：项目文档全文严禁使用任何 Emoji 表情，只做客观技术陈述。

## Komari 主题开发规范

### 1. 主题结构与打包规范

Komari 主题以 ZIP 压缩包交付，安装时服务器解压并挂载到 `/themes/{short}/` 路径。主题包必须满足以下结构：

```text
theme.zip
├── komari-theme.json    # 主题元数据配置文件（必须位于 ZIP 根目录）
├── preview.png          # 预览图（建议 16:9 或 4:3 比例）
└── dist/                # 前端构建产物目录
    ├── index.html       # 入口 HTML
    └── assets/          # 静态资源（CSS、JS、SVG 等）
```

限制与安全边界：
- 压缩包体积不超过 32 MiB；解压后体积不超过 64 MiB。
- 单文件体积不超过 8 MiB，总条目数不超过 2000 个。
- `dist/index.html` 必须严格保留以下两个占位符字符串，以便服务器运行时动态注入站点信息：
  - `<title>Komari Monitor</title>`
  - `A simple server monitor tool.`

### 2. 主题配置文件 (komari-theme.json)

根目录的 `komari-theme.json` 是主题唯一合法的元数据定义文件。

必填与核心字段：
- `name`：主题全称，支持多语言对象（如 `{"zh-CN": "...", "en": "..."}`）。
- `short`：主题唯一标识符（只允许大小写字母、数字、下划线和连字符，禁止使用 `default`）。安装后主题资源映射路径为 `/themes/{short}/`。
- `description`：主题描述，支持多语言对象。
- `version`：语义化版本号（如 `1.1.0`），必须与 Git Release 标签（如 `v1.1.0`）严格一致。
- `author`：作者信息，支持多语言对象或字符串。
- `url`：主题开源仓库地址。
- `preview`：预览图相对路径（通常为 `preview.png`）。
- `configuration`：管理后台动态设置项，类型支持 `managed`（表单生成）、`raw`（自定义 HTML 面板）、`redirect`（站内路径跳转）。

### 3. 前端工程与设计系统约束

1. **工程基建**：
   - 包管理器使用 Bun，构建工具使用 Vite，样式引擎使用 Tailwind CSS v4，代码检查使用 Oxlint。
2. **Shadcn UI 与 Token 约束**：
   - 严格使用语义化颜色 Token（`bg-background`、`text-foreground`、`text-muted-foreground`、`border-border`、`bg-card`、`bg-primary`、`text-primary-foreground` 等），严禁硬编码具体色值（如 `bg-gray-100`、`text-zinc-600`）。
   - 图表颜色使用 `--chart-1` 到 `--chart-5` 语义变量，遵循 Shadcn UI 官方标准色盘。
   - 圆角遵循默认预设 Token（`rounded-md`、`rounded-lg`），禁止自定义超大圆角。
   - 尺度与间距严格遵循 Tailwind 4px 栅格（`2`, `3`, `4`, `6` 等）与字号系统（`text-xs`, `text-sm`, `text-base` 等），杜绝滥用任意像素中括号值。
3. **国际化 (i18n)**：
   - 默认语言必须为中文（zh-CN），同步支持英文（en），字典集中维护并保证 Translation Key 类型安全。
4. **图表与数据算法**：
   - 时间戳统一采用毫秒为基准。
   - 滤波算法（如去噪 `despike`）必须基于真实的绝对中位差（MAD）进行中位数离差截断；平滑算法（如 `ewma`）时间常数必须与时间戳单位（毫秒）对齐。

## 发布流程

### 1. 发布前本地检查

在提交代码并打标签前，必须依次执行静态检查、构建与完整打包校验：

```bash
pnpm run lint     # 检查代码静态规范，必须为 0 error 0 warning
pnpm run build    # 执行类型检查、前端编译并自动运行 scripts/pack.mjs 生成 theme.zip
pnpm run verify   # 严格校验 theme.zip 的体积限制、占位符完整性与 SHA-256 签名
```

### 2. GitHub Release 发布

1. 确认 `komari-theme.json` 中的 `version` 与 `package.json` 中的 `version` 保持一致（例如 `1.1.0`）。
2. 提交代码并推送 `vX.Y.Z` 格式的 Git Tag：
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. GitHub Actions 触发 `release.yml` 工作流：
   - 校验 Tag 名字与 `komari-theme.json` 中的 `version` 字段是否严格一致；
   - 自动执行 `pnpm run build` 生成 `theme.zip`；
   - 运行 `pnpm run verify` 完成安全边界检测；
   - 调用 GitHub CLI 创建 Release，上传资产 `theme.zip` 并在 Release 说明中附带 SHA-256 校验和。

### 3. 主题市场同步

Komari 内置市场（`theme-market`）监控开源仓库的发布：
- 首次收录：在 `komari-monitor/theme-market` 仓库提交 Issue，提供 GitHub 仓库地址和公开预览图链接。
- 自动更新：市场定时任务（每 6 小时）自动检测仓库最新 Release，验证根清单、`short`、`version` 与 SHA-256，验证通过后自动合并并更新市场目录。

## 开发注意事项

1. **响应式与视图模式**：
   - 监控看板同时支持表格视图（Table View）与卡片视图（Cards View），小屏设备与宽屏设备皆可无缝自适应，保障核心指标在任何视口宽度下均完整呈现。
2. **状态指示与动效克制**：
   - 节点在线状态指示灯采用慢速柔和呼吸光晕（周期 3 秒以上），避免高频闪烁引起视觉疲劳。
   - 上下行网速数值统一采用中性文本色，方向标识使用微弱语义色彩（`text-success` 与 `text-info`），避免大面积色彩溢出。
3. **占位符不可变性**：
   - 禁止在 `index.html` 中改动或移除 `<title>Komari Monitor</title>` 和 `<meta name="description" content="A simple server monitor tool." />`。
