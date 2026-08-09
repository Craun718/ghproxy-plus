import { describe, expect, it, vi } from 'vitest';
import { RepositoryApiError } from '@/lib/repository-api';
import {
  createRepositoryDownloadModel,
  selectCurrentAsset,
  selectCurrentRelease
} from './repository-download-model';
import type { RepositoryResponse } from './repository-download-types';

function createResponse(name = 'owner/repo'): RepositoryResponse {
  return {
    repository: {
      owner: 'owner',
      name: 'repo',
      fullName: name,
      description: 'A test repository',
      url: 'https://github.com/owner/repo',
      defaultBranch: 'main'
    },
    releases: [
      {
        id: '1',
        name: 'Version 1',
        tagName: 'v1.0.0',
        publishedAt: '2026-01-01T00:00:00Z',
        prerelease: false,
        assets: [
          {
            id: 'asset-windows',
            name: 'tool-windows-x64.zip',
            downloadUrl: 'https://github.com/owner/repo/tool-windows-x64.zip',
            size: 1024,
            downloadCount: 5,
            contentType: 'application/zip',
            kind: 'binary',
            format: 'zip',
            platform: 'windows',
            architecture: 'x64'
          }
        ]
      }
    ]
  };
}

describe('repository download model', () => {
  it('keeps a single release fully actionable', async () => {
    const fetcher = vi.fn().mockResolvedValue(createResponse());
    const model = createRepositoryDownloadModel(fetcher);

    await model.getState().resolveRepository('owner/repo', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    });

    expect(model.getState().status).toBe('ready');
    expect(selectCurrentRelease(model.getState())?.tagName).toBe('v1.0.0');
    expect(selectCurrentAsset(model.getState())?.id).toBe('asset-windows');
  });

  it('restores release and asset selections from URL state', async () => {
    const fetcher = vi.fn().mockResolvedValue(createResponse());
    const model = createRepositoryDownloadModel(fetcher);

    await model.getState().resolveRepository('owner/repo', {
      releaseId: 'v1.0.0',
      assetId: 'asset-windows'
    });

    expect(model.getState().selectedReleaseId).toBe('1');
    expect(model.getState().selectedAssetId).toBe('asset-windows');
  });

  it('does not call the API for invalid input', async () => {
    const fetcher = vi.fn().mockResolvedValue(createResponse());
    const model = createRepositoryDownloadModel(fetcher);

    await model.getState().resolveRepository('https://example.com/owner/repo');

    expect(fetcher).not.toHaveBeenCalled();
    expect(model.getState().error?.code).toBe('invalid');
  });

  it('passes a token to one request without storing it in model state', async () => {
    const fetcher = vi.fn().mockResolvedValue(createResponse());
    const model = createRepositoryDownloadModel(fetcher);

    await model.getState().resolveRepository('owner/repo', {
      token: 'github_pat_ephemeral-token'
    });

    expect(fetcher.mock.calls[0]?.[2]).toMatchObject({
      token: 'github_pat_ephemeral-token'
    });
    expect(model.getState()).not.toHaveProperty('token');
  });

  it('keeps invalid-token distinct from generic service errors', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        new RepositoryApiError(
          'invalid-token',
          'The GitHub token is invalid or no longer active.',
          401
        )
      );
    const model = createRepositoryDownloadModel(fetcher);

    await model.getState().resolveRepository('owner/repo', {
      token: 'github_pat_rejected-token'
    });

    expect(model.getState().error).toEqual({
      code: 'invalid-token',
      message: 'The GitHub token is invalid or no longer active.'
    });
    expect(model.getState()).not.toHaveProperty('token');
  });

  it('clears stale repository data before reporting invalid input', async () => {
    const fetcher = vi.fn().mockResolvedValue(createResponse());
    const model = createRepositoryDownloadModel(fetcher);
    await model.getState().resolveRepository('owner/repo');

    await model.getState().resolveRepository('not-a-repository');

    expect(model.getState().repository).toBeNull();
    expect(model.getState().releases).toEqual([]);
    expect(model.getState().error?.code).toBe('invalid');
  });

  it('ignores an older request that resolves after a newer request', async () => {
    let resolveFirst: ((value: RepositoryResponse) => void) | undefined;
    const first = new Promise<RepositoryResponse>((resolve) => {
      resolveFirst = resolve;
    });
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(createResponse('owner/newer'));
    const model = createRepositoryDownloadModel(fetcher);

    const olderRequest = model.getState().resolveRepository('owner/older');
    await model.getState().resolveRepository('owner/newer');
    resolveFirst?.(createResponse('owner/older'));
    await olderRequest;

    expect(model.getState().repository?.fullName).toBe('owner/newer');
  });
});
