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

  it('sends a token only through the repository request header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        repository: {
          owner: 'owner',
          name: 'repo',
          fullName: 'owner/repo',
          description: null,
          url: 'https://github.com/owner/repo',
          defaultBranch: 'main'
        },
        releases: []
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchRepository('owner', 'repo', {
      token: 'github_pat_browser-token'
    });

    const [url, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).not.toContain('github_pat_browser-token');
    expect(new Headers(requestInit?.headers).get('x-github-token')).toBe(
      'github_pat_browser-token'
    );
  });
});
