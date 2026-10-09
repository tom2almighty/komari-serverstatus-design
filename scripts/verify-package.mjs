// Gates the built theme.zip against the limits the hub enforces at install time
// (32 MiB package, 64 MiB extracted, 8 MiB per file, 2000 entries) and against
// the two strings the hub rewrites to publish the operator's own title and
// description. Run after `pnpm run build`; the release workflow runs it too, so a
// tag cannot publish a package the market would reject.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const MIB = 1024 * 1024
const LIMITS = { archive: 32 * MIB, extracted: 64 * MIB, file: 8 * MIB, entries: 2000 }
const PLACEHOLDERS = ["<title>Komari Monitor</title>", "A simple server monitor tool."]

const zipPath = path.join(process.cwd(), "theme.zip")
if (!fs.existsSync(zipPath)) {
  console.error("theme.zip not found. Run `pnpm run build` first.")
  process.exit(1)
}

const problems = []
const check = (ok, message) => {
  if (!ok) problems.push(message)
}

const archive = fs.readFileSync(zipPath)
const names = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" }).split("\n").filter(Boolean)
const sizes = execFileSync("unzip", ["-l", zipPath], { encoding: "utf8" })
  .split("\n")
  .map((line) => /^\s*(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s{2}(.+?)\s*$/.exec(line))
  .filter(Boolean)
  .map((match) => ({ size: Number(match[1]), name: match[2] }))

const read = (name) => {
  try {
    return execFileSync("unzip", ["-p", zipPath, name], { encoding: "utf8", maxBuffer: 8 * MIB })
  } catch {
    return ""
  }
}

check(sizes.length === names.length, `unzip reported ${names.length} entries but ${sizes.length} sizes`)
check(names.length <= LIMITS.entries, `${names.length} entries exceeds the ${LIMITS.entries} limit`)
check(archive.length <= LIMITS.archive, `package is ${(archive.length / MIB).toFixed(1)} MiB, over the ${LIMITS.archive / MIB} MiB limit`)

const extracted = sizes.reduce((total, entry) => total + entry.size, 0)
check(extracted <= LIMITS.extracted, `extracted size ${(extracted / MIB).toFixed(1)} MiB exceeds the ${LIMITS.extracted / MIB} MiB limit`)
for (const entry of sizes) {
  check(entry.size <= LIMITS.file, `${entry.name} is ${(entry.size / MIB).toFixed(1)} MiB, over the ${LIMITS.file / MIB} MiB per-file limit`)
}

check(names.includes("komari-theme.json"), "komari-theme.json must sit at the archive root")
check(names.includes("dist/index.html"), "dist/index.html is missing")

let manifest = {}
try {
  manifest = JSON.parse(read("komari-theme.json"))
} catch {
  problems.push("komari-theme.json is not valid JSON")
}
check(typeof manifest.name === "string" && manifest.name.trim().length > 0, "komari-theme.json name must be a non-empty string")
check(typeof manifest.short === "string" && manifest.short.trim().length > 0, "komari-theme.json short must be a non-empty string")
check(/^[A-Za-z0-9_-]+$/.test(manifest.short ?? ""), "short may only contain letters, digits, underscores and hyphens")
check(manifest.short !== "default", "short cannot be `default`")
check(typeof manifest.version === "string" && manifest.version.trim().length > 0, "komari-theme.json version must be a non-empty string")
check(typeof manifest.author === "string" && manifest.author.trim().length > 0, "komari-theme.json author must be a non-empty string")
check(typeof manifest.description === "string", "komari-theme.json description must be a string")

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"))
check(manifest.version === pkg.version, `komari-theme.json version (${manifest.version}) does not match package.json version (${pkg.version})`)

const html = read("dist/index.html")
for (const placeholder of PLACEHOLDERS) {
  check(html.includes(placeholder), `dist/index.html lost the placeholder ${placeholder}`)
}

const digest = createHash("sha256").update(archive).digest("hex")
console.log(`theme.zip  ${manifest.short} ${manifest.version}`)
console.log(`  entries   ${names.length}`)
console.log(`  packed    ${(archive.length / MIB).toFixed(2)} MiB`)
console.log(`  extracted ${(extracted / MIB).toFixed(2)} MiB`)
console.log(`  sha256    ${digest}`)

if (problems.length > 0) {
  console.error("\nPackage checks failed:")
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
