# ghproxy plus API

## 1. GitHub proxy API

**Endpoint:** `/api/ghproxy/{github-url}`

Proxies GitHub resources with CORS headers, allowing accelerated access to GitHub files, releases, and repositories.

---

## 2. Smart download API

**Endpoint:** `/api/download/{github-repo-url}`

Automatically detects the user's operating system and architecture from the User-Agent header and downloads the most appropriate release asset from the latest release.

**Parameters:**

- `keyword` (optional): Additional keyword to filter assets

**Example:**

```text
https://your-domain.example/api/download/github.com/owner/repo
```

**Detection Logic:**

- Parses User-Agent to determine OS (Windows, macOS, Linux, Android, iOS, etc.)
- Detects CPU architecture (x86_64, arm64, etc.)
- Automatically selects the best matching asset from the latest release
- Returns no automatic match when platform, architecture, or keyword matching is
  not reliable; it never silently chooses an arbitrary file

---

## 3. Repository releases API

**Endpoint:** `/api/repos/{owner}/{repo}/releases`

Returns normalized repository metadata, releases, source archives, and asset
metadata for the web interface. Errors use stable codes such as `invalid`,
`not-found`, `rate-limit`, and `server`.

---

## 4. Health check API

**Endpoint:** `/api/ping`

Health check endpoint that returns server status information.

**Example:**

```bash
curl https://[host]/api/ping
```
