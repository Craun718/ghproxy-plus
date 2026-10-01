import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GitHubRelease, GitHubRepository } from './github-types';
import { fetchRepository, normalizeRepositoryResponse } from './repository-api';

const repository: GitHubRepository = {
  name: 'repo',
  full_name: 'owner/repo',
  owner: { login: 'owner', avatar_url: 'https://example.com/avatar.png' },
  default_branch: 'main',
  description: null,
  html_url: 'https://github.com/owner/repo'
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function releaseResponse(): GitHubRelease[] {
  return [
    {
      id: 1,
      name: 'Version 1',
      tag_name: 'v1.0.0',
      assets: [
        {
          id: 11,
          name: 'tool-windows-x64.zip',
          browser_download_url:
            'https://github.com/owner/repo/releases/download/v1.0.0/tool-windows-x64.zip'
        }
      ],
      prerelease: false
    }
  ];
}

const tagName = '@scope/cli-v0.3.4';
const encodedTagName = '%40scope%2Fcli-v0.3.4';

function rateLimitResponse() {
  return Response.json(
    { message: 'API rate limit exceeded' },
    { status: 403, statusText: 'Forbidden' }
  );
}

describe('normalizeRepositoryResponse', () => {
  it('falls back to the tag when the release name is empty', () => {
    const releases: GitHubRelease[] = [
      {
        id: 1,
        name: '  ',
        tag_name: 'v1.0.0',
        assets: [],
        prerelease: false
      }
    ];

    expect(
      normalizeRepositoryResponse(repository, releases).releases[0]?.name
    ).toBe('v1.0.0');
  });

  it('classifies verification files separately from binaries', () => {
    const releases: GitHubRelease[] = [
      {
        id: 1,
        name: 'Version 1',
        tag_name: 'v1.0.0',
        assets: [
          {
            id: 1,
            name: 'tool-linux-x64.tar.gz',
            browser_download_url: 'https://example.com/tool.tar.gz'
          },
          {
            id: 2,
            name: 'tool.sha256',
            browser_download_url: 'https://example.com/tool.sha256'
          }
        ]
      }
    ];

    expect(
      normalizeRepositoryResponse(repository, releases).releases[0]?.assets.map(
        (asset) => asset.kind
      )
    ).toEqual(['binary', 'checksum']);
  });
});

describe('fetchRepository', () => {
  it('queries GitHub from the browser and returns normalized release assets', async () => {
    const fetchMock = vi.fn(
      (input: string | URL | Request, _requestInit?: RequestInit) =>
        Promise.resolve(
          String(input).endsWith('/releases?per_page=100')
            ? Response.json(releaseResponse())
            : Response.json(repository)
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchRepository('owner', 'repo');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.github.com/repos/owner/repo',
      'https://api.github.com/repos/owner/repo/releases?per_page=100'
    ]);
    expect(result.repository.fullName).toBe('owner/repo');
    expect(result.releases[0]?.assets.map((asset) => asset.kind)).toEqual([
      'binary',
      'source',
      'source'
    ]);
  });

  it('sends a temporary token only to GitHub in Authorization headers', async () => {
    const fetchMock = vi.fn(
      (input: string | URL | Request, _requestInit?: RequestInit) =>
        Promise.resolve(
          String(input).endsWith('/releases?per_page=100')
            ? Response.json(releaseResponse())
            : Response.json(repository)
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchRepository('owner', 'repo', {
      token: 'github_pat_browser-token'
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, requestInit] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/api\.github\.com\/repos\//);
      expect(String(url)).not.toContain('github_pat_browser-token');
      const headers = new Headers(requestInit?.headers);
      expect(headers.get('authorization')).toBe(
        'Bearer github_pat_browser-token'
      );
      expect(headers.get('x-github-api-version')).toBe('2022-11-28');
      expect(headers.has('x-github-token')).toBe(false);
    }
  });

  it('falls back to source archives from the default branch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) =>
        Promise.resolve(
          String(input).endsWith('/releases?per_page=100')
            ? Response.json([])
            : Response.json(repository)
        )
      )
    );

    const result = await fetchRepository('owner', 'repo');

    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.tagName).toBe('main');
    expect(result.releases[0]?.assets.map((asset) => asset.kind)).toEqual([
      'source',
      'source'
    ]);
    expect(result.releases[0]?.assets[0]?.downloadUrl).toContain(
      '/archive/refs/heads/main.tar.gz'
    );
  });

  it('parses the latest release page after the GitHub API is rate-limited', async () => {
    const fetchMock = vi.fn(
      (input: string | URL | Request, _requestInit?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/releases/latest')) {
          return Promise.resolve(
            new Response(
              `<include-fragment src="https://github.com/owner/repo/releases/expanded_assets/${encodedTagName}"></include-fragment>`,
              { headers: { 'content-type': 'text/html' } }
            )
          );
        }

        if (url.includes('/expanded_assets/')) {
          return Promise.resolve(
            new Response(
              `<li class="Box-row">
              <a href="/owner/repo/releases/download/${encodedTagName}/tool-windows-x64.zip">tool</a>
              <span>1.5 MB</span>
              <relative-time datetime="2026-09-30T08:00:00Z"></relative-time>
            </li>`,
              { headers: { 'content-type': 'text/html' } }
            )
          );
        }

        return Promise.resolve(rateLimitResponse());
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchRepository('owner', 'repo', {
      token: 'github_pat_browser-token'
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.github.com/repos/owner/repo',
      'https://api.github.com/repos/owner/repo/releases?per_page=100',
      '/api/ghproxy/https://github.com/owner/repo/releases/latest',
      `/api/ghproxy/https://github.com/owner/repo/releases/expanded_assets/${encodedTagName}`
    ]);
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toEqual({
      Accept: 'text/html'
    });
    expect(fetchMock.mock.calls[3]?.[1]?.headers).toEqual({
      Accept: 'text/html'
    });

    expect(result.dataSource).toBe('release-page');
    expect(result.repository).toMatchObject({
      fullName: 'owner/repo',
      description: null,
      defaultBranch: ''
    });
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]).toMatchObject({
      name: tagName,
      tagName,
      publishedAt: '2026-09-30T08:00:00Z'
    });
    expect(
      result.releases[0]?.assets.find(
        (asset) => asset.name === 'tool-windows-x64.zip'
      )
    ).toMatchObject({
      downloadUrl: `https://github.com/owner/repo/releases/download/${encodedTagName}/tool-windows-x64.zip`,
      size: 1_572_864
    });
    expect(result.releases[0]?.assets).toHaveLength(3);
  });

  it.each([
    [401, 'invalid-token'],
    [403, 'rate-limit'],
    [429, 'rate-limit'],
    [404, 'not-found'],
    [500, 'server']
  ])('maps GitHub status %i to %s', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: 'GitHub error' },
            { status, statusText: 'GitHub error' }
          )
        )
    );

    await expect(fetchRepository('owner', 'repo')).rejects.toMatchObject({
      code,
      status
    });
  });

  it('keeps the original rate-limit error when page parsing fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) =>
        String(input).endsWith('/releases/latest')
          ? Promise.resolve(
              new Response('<html><main>Not a release page</main></html>', {
                headers: { 'content-type': 'text/html' }
              })
            )
          : Promise.resolve(rateLimitResponse())
      )
    );

    await expect(fetchRepository('owner', 'repo')).rejects.toMatchObject({
      code: 'rate-limit',
      status: 403,
      message:
        'GitHub rate limit reached. Wait and try again, or add a token under optional GitHub authentication.'
    });
  });

  it('does not expose a rejected token in the error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: 'Bad credentials' },
            { status: 401, statusText: 'Unauthorized' }
          )
        )
    );

    let error: unknown;
    try {
      await fetchRepository('owner', 'repo', {
        token: 'github_pat_secret-value'
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toMatchObject({ code: 'invalid-token', status: 401 });
    expect(String(error)).not.toContain('github_pat_secret-value');
  });

  it('maps browser network failures without exposing the request URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed')));

    await expect(fetchRepository('owner', 'repo')).rejects.toMatchObject({
      code: 'network',
      status: 503,
      message: 'GitHub could not be reached from this browser.'
    });
  });
});
