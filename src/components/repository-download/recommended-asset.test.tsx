import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AssetRecommendation,
  RepositoryAsset,
  RepositoryRelease
} from '@/models/repository-download-types';
import { RecommendedAsset } from './recommended-asset';

const asset: RepositoryAsset = {
  id: 'asset-windows',
  name: 'tool-windows-x64.zip',
  downloadUrl:
    'https://github.com/owner/repo/releases/download/v1/tool-windows-x64.zip',
  size: 2048,
  downloadCount: 10,
  contentType: 'application/zip',
  kind: 'binary',
  format: 'zip',
  platform: 'windows',
  architecture: 'x64'
};

const release: RepositoryRelease = {
  id: 'release-1',
  name: 'Version 1',
  tagName: 'v1.0.0',
  publishedAt: '2026-01-01T00:00:00Z',
  prerelease: false,
  assets: [asset]
};

const recommendation: AssetRecommendation = {
  assetId: asset.id,
  confidence: 'exact',
  reasons: ['Matches windows', 'Matches x64'],
  platform: 'windows',
  architecture: 'x64'
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RecommendedAsset', () => {
  it('keeps clipboard rejection feedback next to the action', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    render(
      <RecommendedAsset
        asset={asset}
        release={release}
        recommendation={recommendation}
        proxyPath={`/api/ghproxy/${asset.downloadUrl}`}
        isManualSelection={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy proxy link' }));

    expect(writeText).toHaveBeenCalledOnce();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Clipboard access was denied'
    );
  });

  it('does not expose a download action without a selected asset', () => {
    render(
      <RecommendedAsset
        asset={null}
        release={release}
        recommendation={{
          assetId: null,
          confidence: 'none',
          reasons: ['No release asset matches the detected device'],
          platform: 'linux',
          architecture: 'x64'
        }}
        proxyPath={null}
        isManualSelection={false}
      />
    );

    expect(screen.getByText('No automatic match')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download' })
    ).not.toBeInTheDocument();
  });
});
