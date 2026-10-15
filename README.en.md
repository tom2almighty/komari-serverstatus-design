# Komari ServerStatus Design

[简体中文](./README.md)

Frontend theme for the Komari monitoring system, built with shadcn/ui design standards and ServerStatus data layout.

## Development Setup

- Runtime: Bun >= 1.2
- Start local development server:

```bash
bun install
bun run dev
```

Local development server runs on `http://localhost:5173` by default.

## Build and Deployment

Production build and package command:

```bash
bun run build
bun run verify
```

Build artifacts produce `theme.zip` in the project root, adhering to Komari theme specifications.

Deployment in Komari admin panel:
1. Navigate to Settings - Themes.
2. Upload the generated `theme.zip` file and enable it.

## License

This project is licensed under the [AGPL-3.0](./LICENSE) license.
