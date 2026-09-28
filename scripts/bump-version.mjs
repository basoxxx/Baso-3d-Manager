#!/usr/bin/env node
// Bump the app version in every place it lives, then commit.
//
//   bun scripts/bump-version.mjs patch|minor|major|<x.y.z>
//
// Pushing the resulting commit to `main` is what triggers a release: the
// Release workflow sees a version with no matching `v*` tag, builds the
// installers, and publishes them (plus latest.json for the auto-updater).
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const FILES = {
  pkg: 'package.json',
  tauri: 'src-tauri/tauri.conf.json',
  cargo: 'src-tauri/Cargo.toml',
}

const arg = process.argv[2]
if (!arg) {
  console.error('usage: bump-version.mjs patch|minor|major|<x.y.z>')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(FILES.pkg, 'utf8'))
const [maj, min, pat] = pkg.version.split('.').map(Number)
const next =
  arg === 'patch' ? `${maj}.${min}.${pat + 1}`
  : arg === 'minor' ? `${maj}.${min + 1}.0`
  : arg === 'major' ? `${maj + 1}.0.0`
  : arg

if (!/^\d+\.\d+\.\d+$/.test(next)) {
  console.error(`invalid version: ${next}`)
  process.exit(1)
}

const replaceJsonVersion = (file) => {
  const src = readFileSync(file, 'utf8')
  const out = src.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`)
  if (out === src) throw new Error(`no version field in ${file}`)
  writeFileSync(file, out)
}
replaceJsonVersion(FILES.pkg)
replaceJsonVersion(FILES.tauri)

const cargo = readFileSync(FILES.cargo, 'utf8')
const cargoOut = cargo.replace(/^(version\s*=\s*")[^"]+(")/m, `$1${next}$2`)
if (cargoOut === cargo) throw new Error(`no version in ${FILES.cargo}`)
writeFileSync(FILES.cargo, cargoOut)

execFileSync('git', ['add', ...Object.values(FILES)], { stdio: 'inherit' })
execFileSync('git', ['commit', '-m', `chore(release): v${next}`], { stdio: 'inherit' })
console.log(`\nBumped ${pkg.version} -> ${next}. Push to main to publish the release.`)
