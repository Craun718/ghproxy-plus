import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AssetKind,
  RepositoryAsset,
  RepositoryRelease
} from '@/models/repository-download-types';
import { AssetList } from './asset-list';
import { ReleasePicker } from './release-picker';

function createAsset(
  id: string,
  name: string,
  kind: AssetKind,
  platform: string | null,
  architecture: string | null
): RepositoryAsset {
  return {
    id,
    name,
    downloadUrl: `https://github.com/owner/repo/releases/download/v1/${name}`,
    size: 1048576,
    downloadCount: 42,
    contentType: 'application/octet-stream',
    kind,
    format: 'zip',
    platform,
    architecture
  };
}

function createRelease(
  id: string,
  name: string,
  tagName: string
): RepositoryRelease {
  return {
    id,
    name,
    tagName,
    publishedAt: '2026-08-01T00:00:00Z',
    prerelease: false,
    assets: []
  };
}

afterEach(cleanup);

describe('ReleasePicker', () => {
  it('filters by release name and tag, then selects by stable ID', async () => {
    const onSelect = vi.fn();
    const releases = [
      createRelease('release-stable', 'Stable Release', 'v3.0.0'),
      createRelease('release-preview', 'Preview Build', 'v4.0.0-beta.1'),
      createRelease('release-legacy', 'Legacy', 'v1.5.0')
    ];
    render(
      <ReleasePicker
        releases={releases}
        selectedReleaseId="release-stable"
        onSelect={onSelect}
      />
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText('Release');

    await user.click(input);
    await user.clear(input);
    await user.type(input, 'beta.1');

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Preview Build')).toBeVisible();
    expect(
      within(listbox).queryByText('Stable Release')
    ).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('release-preview');
  });

  it('keeps the current selection when a search has no results', async () => {
    const onSelect = vi.fn();
    render(
      <ReleasePicker
        releases={[createRelease('release-1', 'Stable Release', 'v1.0.0')]}
        selectedReleaseId="release-1"
        onSelect={onSelect}
      />
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText('Release');

    await user.click(input);
    await user.clear(input);
    await user.type(input, 'not-a-release');

    expect(screen.getByText('No releases match your search.')).toBeVisible();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('AssetList', () => {
  it('shows every platform until the user searches, then selects by ID', async () => {
    const onSelect = vi.fn();
    const assets = [
      createAsset(
        'asset-windows',
        'tool-windows-x64.zip',
        'binary',
        'windows',
        'x64'
      ),
      createAsset(
        'asset-linux',
        'tool-linux-arm64.zip',
        'binary',
        'linux',
        'arm64'
      ),
      createAsset('asset-source', 'source.zip', 'source', null, null),
      createAsset('asset-checksum', 'checksums.txt', 'checksum', null, null)
    ];
    render(
      <AssetList
        assets={assets}
        selectedAssetId="asset-windows"
        recommendedAssetId="asset-windows"
        onSelect={onSelect}
      />
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText('Asset');

    await user.click(input);
    expect(screen.getByText('Installers and binaries')).toBeVisible();
    expect(screen.getByText('Source code')).toBeVisible();
    expect(screen.getByText('Checksums and signatures')).toBeVisible();
    expect(screen.getByText('Recommended')).toBeVisible();
    expect(
      screen.getByText('tool-windows-x64.zip').closest('[role="option"]')
    ).toHaveTextContent('Windows · X64 · Zip · 1.0 MB · 42 downloads');
    expect(screen.getByText('tool-linux-arm64.zip')).toBeVisible();
    expect(screen.getByText('source.zip')).toBeVisible();
    expect(screen.getByText('checksums.txt')).toBeVisible();

    await user.clear(input);
    await user.type(input, 'arm64');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('tool-linux-arm64.zip')).toBeVisible();
    expect(
      within(listbox).queryByText('tool-windows-x64.zip')
    ).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('asset-linux');
  });

  it('does not change the asset selection for an empty result', async () => {
    const onSelect = vi.fn();
    render(
      <AssetList
        assets={[
          createAsset(
            'asset-windows',
            'tool-windows-x64.zip',
            'binary',
            'windows',
            'x64'
          )
        ]}
        selectedAssetId="asset-windows"
        recommendedAssetId="asset-windows"
        onSelect={onSelect}
      />
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText('Asset');

    await user.click(input);
    await user.clear(input);
    await user.type(input, 'plan-9-risc-v');

    expect(screen.getByText('No assets match your search.')).toBeVisible();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
