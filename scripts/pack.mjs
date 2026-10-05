import fs from "node:fs"
import path from "node:path"
import archiver from "archiver"

const rootDir = process.cwd()
const distDir = path.join(rootDir, "dist")
const zipPath = path.join(rootDir, "theme.zip")

if (!fs.existsSync(distDir)) {
  console.error("Error: dist/ does not exist. Run vite build first.")
  process.exit(1)
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath)
}

const output = fs.createWriteStream(zipPath)
const archive = archiver("zip", { zlib: { level: 9 } })

output.on("close", () => {
  console.log(`Successfully created theme.zip (${(archive.pointer() / 1024).toFixed(1)} KiB)`)
})

archive.on("error", (err) => {
  throw err
})

archive.pipe(output)

// Add komari-theme.json
if (fs.existsSync(path.join(rootDir, "komari-theme.json"))) {
  archive.file(path.join(rootDir, "komari-theme.json"), { name: "komari-theme.json" })
}

// Add preview.png
if (fs.existsSync(path.join(rootDir, "preview.png"))) {
  archive.file(path.join(rootDir, "preview.png"), { name: "preview.png" })
}

// Add dist directory
archive.directory(distDir, "dist")

await archive.finalize()
