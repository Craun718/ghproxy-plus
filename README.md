# ghproxy-plus

ghproxy-plus finds a suitable GitHub Release asset for the current device and
downloads it through a self-hosted GitHub proxy. It also keeps the low-level
proxy API available for direct use.

Canonical repository: [Craun718/ghproxy-plus](https://github.com/Craun718/ghproxy-plus)

The frontend is a React 19 + Farm SPA. Its component layer uses shadcn/ui Luma
components generated on Base UI primitives, Tailwind CSS, and the existing
light/dark OKLCH palette. Shared repository state lives in a Zustand model and
all GitHub responses are normalized by the browser API client before reaching
the model or UI.
Searchable Release and Asset Comboboxes load on demand after repository results
arrive, while their transient search state remains local to each component.

## Requirements

- Node.js 22 or newer
- pnpm 11.9.0

Install the exact dependency graph:

```bash
pnpm install --frozen-lockfile
```

## Development

Run the frontend-only Farm server on `http://127.0.0.1:3000`:

```bash
pnpm dev
```

The Farm server can query public GitHub repositories directly from the browser.
To exercise `/api/ghproxy/` downloads as well, build the frontend and run the
complete Cloudflare Workers application locally with:

```bash
pnpm dev:wrangler
```

The main application is available at `/`; API documentation is route-lazy at
`/docs`. Cloudflare asset fallback is configured for direct SPA navigation and
refreshes on both routes.

## Architecture

```text
src/
  api/                         Hono API handlers
  components/
    ui/                        shadcn/ui Luma + Base UI primitives
    repository-download/      download workflow components
  hooks/                       URL state synchronization
  lib/                         API clients and pure matching/normalization
  models/                      Zustand state, schemas, types and selectors
  pages/                       route-level composition
  globals.css                  Tailwind imports, tokens and global base rules
```

The key request path is:

```text
HomePage -> Zustand repository model -> browser GitHub API client
         -> normalized repository/releases -> pure asset recommendation
         -> /api/ghproxy/:github-url
```

`docs/DESIGN.md` is the authoritative architecture and interaction contract.
Root `TODO.md` contains only work from that contract that has not landed.

## Quality checks

Run all non-browser checks, the production build, and the bundle budget:

```bash
pnpm check
```

Install Chromium once and run desktop/mobile end-to-end checks:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The quality gates include TypeScript, read-only Biome checks, Vitest unit/model/
component tests, Farm production build, route bundle budgets, Playwright core
flows, target viewport overflow checks, keyboard navigation, axe, and Web
Vitals smoke budgets. CI runs the same gates without auto-fixing or committing
changes.

## API

### GitHub proxy

```text
GET|HEAD /api/ghproxy/:github-url
```

Proxies supported GitHub release, archive, raw file, repository, tag, and gist
URLs with CORS response headers. Successful file responses force attachment
downloads and preserve the safely encoded filename from the original GitHub
URL across CDN redirects.

### Health check

```text
GET /api/ping
```

## Deployment

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Craun718/ghproxy-plus.git)

Deploy the Worker and `dist/` assets using Wrangler:

```bash
pnpm deploy
```

After changing Cloudflare bindings, regenerate their types with:

```bash
pnpm cf-typegen
```

The proxy core is derived from
[hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy).
