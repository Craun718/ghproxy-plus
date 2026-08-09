import { describe, expect, it } from 'vitest';
import type { GitHubRelease, GitHubRepository } from './github-types';
import { normalizeRepositoryResponse } from './repository-api';

const repository: GitHubRepository = {
  name: 'repo',
  full_name: 'owner/repo',
  owner: { login: 'owner', avatar_url: 'https://example.com/avatar.png' },
  default_branch: 'main',
  description: null,
  html_url: 'https://github.com/owner/repo'
};

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
