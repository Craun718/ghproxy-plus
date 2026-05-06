# ghproxy-plus

A GitHub release asset download service inspired by gh-proxy

This project is built with **React**, **Hono**, **Tailwind CSS**, and **shadcn/ui**.

**The old version is archived now. See v1 branch for the old version.**

## Deploy

### Cloudflare Workers (Recommended)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://codeberg.org/natsuu/ghproxy-plus.git)

Or deploy manually with wrangler:

```bash
pnpm deploy
```

For local development with wrangler:

```bash
pnpm dev:wrangler
```

[Wrangler](https://developers.cloudflare.com/workers/wrangler/) is the official CLI for Cloudflare Workers, used here to deploy and manage the Workers deployment.

**Note:** Run `pnpm cf-typegen` to generate Cloudflare bindings types after updating `wrangler.jsonc`.

### Node.js

Clone the Repository

```bash
git clone https://github.com/your-username/ghproxy-plus.git
cd ghproxy-plus
```

Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Build the Project

```bash
npm build
# or
yarn build
# or
pnpm build
# or
bun build
```

Start the Server

```bash
npm start
# or
yarn start
# or
pnpm start
# or
bun start
```

## API Manual

### 1. GitHub Proxy API

**Endpoint:** `/api/ghproxy/{github-url}`

Proxies GitHub resources with CORS headers, allowing accelerated access to GitHub files, releases, and repositories.

**Supported URL Types:**

- GitHub releases and archives: `github.com/{owner}/{repo}/releases/*`
- GitHub raw files: `github.com/{owner}/{repo}/blob/*` or `github.com/{owner}/{repo}/raw/*`
- GitHub raw content: `raw.githubusercontent.com/*` or `raw.github.com/*`
- GitHub gists: `gist.githubusercontent.com/*` or `gist.github.com/*`
- GitHub repository info: `github.com/{owner}/{repo}/info/*` or `github.com/{owner}/{repo}/git-*`
- GitHub tags: `github.com/{owner}/{repo}/tags/*`

**Example:**

```bash
curl https://your-domain.com/api/ghproxy/https://github.com/owner/repo/releases/download/v1.0.0/file.zip
```

**Response:**

- Success: Proxied content with CORS headers
- Error 400: Invalid or unsupported URL
- Error 403: URL blocked by whitelist (if configured)
- Error 500: Fetch error

---

### 2. Smart Download API

**Endpoint:** `/api/download/{github-repo-url}`

Automatically detects the user's operating system and architecture from the User-Agent header and downloads the most appropriate release asset from the latest release.

**Parameters:**

- `keyword` (optional): Additional keyword to filter assets

**Example:**

~~curl -L [https://your-domain.com/api/download/https://github.com/owner/repo]~~

Don't fetch it! You can only access it through the browser.

**Detection Logic:**

- Parses User-Agent to determine OS (Windows, macOS, Linux, Android, iOS, etc.)
- Detects CPU architecture (x86_64, arm64, etc.)
- Automatically selects the best matching asset from the latest release
- Falls back to first asset if no match found

**Note:** The web UI provides an option to generate download URLs from the default branch when no releases are found.

**Response:**

- Success (302): Redirects to the download URL via `/api/ghproxy/`
- Error (302): Redirects to 404 page if repo not found or no suitable asset

---

### 3. Health Check API

**Endpoint:** `/api/ping`

Health check endpoint that returns server status information.

**Example:**

```bash
curl https://your-domain.com/api/ping
```

**Response:**

```json
{
  "message": "pong",
  "uptime": 12345.67,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "pid": 1234
}
```

---

## Getting Started

### Front-end Only

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying files under `src/`. The page auto-updates as you edit.

### With Backend (Cloudflare Workers)

This runs the full stack with Hono API routes on Cloudflare Workers:

```bash
pnpm dev:wrangler
```

## Thanks

[hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy)
