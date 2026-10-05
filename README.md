# Komari ServerStatus Design

本项目是为 [Komari](https://github.com/komari-monitor/komari) 监控服务开发的前端主题，采用 shadcn/ui 设计规范与 ServerStatus 数据展示布局。本项目参考并致谢 [monitor-theme-serverstatus](https://github.com/monitor-probe/monitor-theme-serverstatus)。

## 开发环境配置

- 运行环境：Bun >= 1.2.0 或 Node.js >= 20
- 启动本地开发服务：

```bash
bun install
bun run dev
```

本地服务默认运行在 `http://localhost:5173`。

## 构建与部署

生产环境构建与主题打包命令：

```bash
bun run build
bun run verify
```

构建完成后将在项目根目录生成符合 Komari 主题市场规范的 `theme.zip` 安装包。

在 Komari 后台部署：
1. 打开 Komari 管理后台的「设置 - 主题」面板。
2. 上传生成的 `theme.zip` 文件并启用。

## 开源许可证

本项目基于 [AGPL-3.0](./LICENSE) 许可证开源。
