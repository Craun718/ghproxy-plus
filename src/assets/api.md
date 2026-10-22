# ghproxy plus API

## 1. GitHub proxy API

**Endpoint:** `/api/ghproxy/{github-url}`

Proxies GitHub resources with CORS headers, allowing accelerated access to GitHub files, releases, and repositories.

### File downloads

**Methods:** `GET`, `HEAD`

Supports release assets, source archives, raw files, tags, and gists. Successful file responses use attachment downloads and preserve the original filename across CDN redirects.

### HTTPS Git clone

Clone a public GitHub repository through this deployment:

```bash
git clone --depth=1 https://[host]/api/ghproxy/https://github.com/Craun718/ghproxy-plus.git
```

The cloned repository keeps this proxy URL as its remote, so subsequent `git fetch` and `git pull` use the proxy too.

Git Smart HTTP endpoints:

```text
GET  /api/ghproxy/https://github.com/{owner}/{repo}.git/info/refs?service=git-upload-pack
POST /api/ghproxy/https://github.com/{owner}/{repo}.git/git-upload-pack
```

Both Git protocol v0 and v2 are supported, including full and shallow clones. POST is only accepted for the `git-upload-pack` endpoint; file downloads remain GET/HEAD only. Git protocol headers and binary request/response bodies are preserved.

Push (`git-receive-pack`), SSH, private-repository authentication, Git LFS, and automatic rewriting of submodule URLs are outside the supported scope.

---

## 2. Health check API

**Endpoint:** `/api/ping`

Health check endpoint that returns server status information.

**Example:**

```bash
curl https://[host]/api/ping
```
