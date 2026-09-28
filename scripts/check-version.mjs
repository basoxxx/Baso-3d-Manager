#!/usr/bin/env node
// Fail if package.json, tauri.conf.json and Cargo.toml disagree on the
// app version. Prints the version on success (used by the Release workflow).
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version
const tauri = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).version
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1]

if (pkg !== tauri || pkg !== cargo) {
  console.error(
    `version mismatch: package.json=${pkg} tauri.conf.json=${tauri} Cargo.toml=${cargo}\n` +
      'Use `bun run version:patch` (or minor/major) to bump all three together.',
  )
  process.exit(1)
}
console.log(pkg)
