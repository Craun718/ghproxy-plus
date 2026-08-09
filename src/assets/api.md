# ghproxy plus API

## 1. GitHub proxy API

**Endpoint:** `/api/ghproxy/{github-url}`

Proxies GitHub resources with CORS headers, allowing accelerated access to GitHub files, releases, and repositories.

---

## 2. Health check API

**Endpoint:** `/api/ping`

Health check endpoint that returns server status information.

**Example:**

```bash
curl https://[host]/api/ping
```
