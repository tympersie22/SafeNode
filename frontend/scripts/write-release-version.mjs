#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PACKAGE_JSON_PATH = resolve(ROOT, 'package.json')
const OUTPUT_PATH = resolve(ROOT, 'src/config/release.ts')

function normalizeTag(tag) {
  if (!tag || typeof tag !== 'string') return null
  // Strip any surrounding quotes/whitespace that can leak in from shell output.
  const trimmed = tag.trim().replace(/^['"]+|['"]+$/g, '').trim()
  if (!trimmed) return null
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`
}

async function fetchLatestReleaseTag(repo, token) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'safenode-release-version-script'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers })
  if (!response.ok) {
    throw new Error(`GitHub API responded ${response.status}`)
  }

  const data = await response.json()
  return normalizeTag(data?.tag_name)
}

async function fetchLatestRepoTag(repo, token) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'safenode-release-version-script'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/tags?per_page=1`, { headers })
  if (!response.ok) {
    throw new Error(`GitHub tags API responded ${response.status}`)
  }

  const data = await response.json()
  return normalizeTag(Array.isArray(data) ? data[0]?.name : null)
}

function getLatestLocalGitTag() {
  try {
    const raw = execSync('git for-each-ref --sort=-creatordate --format=%(refname:short) refs/tags | head -n 1', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8'
    })
    return normalizeTag(raw)
  } catch {
    return null
  }
}

function readExistingReleaseVersion() {
  try {
    if (!existsSync(OUTPUT_PATH)) return null
    const raw = readFileSync(OUTPUT_PATH, 'utf8')
    const match = raw.match(/RELEASE_VERSION\s*=\s*['"]([^'"]+)['"]/)
    return normalizeTag(match?.[1] || null)
  } catch {
    return null
  }
}

async function main() {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'))
  const repo = process.env.GITHUB_REPOSITORY || 'tympersie22/Safenode'
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
  const forcedVersion = normalizeTag(process.env.VITE_RELEASE_VERSION)
  // On a tag push, GitHub Actions exposes the exact tag — use it directly and
  // deterministically instead of parsing shell git output.
  const ciTag = process.env.GITHUB_REF_TYPE === 'tag'
    ? normalizeTag(process.env.GITHUB_REF_NAME)
    : null

  const fallback = readExistingReleaseVersion() || normalizeTag(pkg.version) || 'v0.0.0'
  let resolved = forcedVersion || ciTag || getLatestLocalGitTag() || fallback

  if (!forcedVersion && !ciTag && resolved === fallback) {
    try {
      const latestRelease = await fetchLatestReleaseTag(repo, token)
      if (latestRelease) {
        resolved = latestRelease
      }
    } catch (error) {
      try {
        const latestTag = await fetchLatestRepoTag(repo, token)
        if (latestTag) {
          resolved = latestTag
        }
      } catch (tagError) {
        console.warn(`[release-version] using fallback (${fallback}) due to: ${error.message}; ${tagError.message}`)
      }
    }
  }

  const output = `// Auto-generated at build time. Do not edit manually.\nexport const RELEASE_VERSION = '${resolved}';\n`
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, output, 'utf8')
  console.log(`[release-version] wrote ${OUTPUT_PATH} -> ${resolved}`)
}

await main()
