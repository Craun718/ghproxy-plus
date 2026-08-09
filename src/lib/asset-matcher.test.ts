import { describe, expect, it } from 'vitest';
import type { RepositoryAsset } from '@/models/repository-download-types';
import {
  classifyAsset,
  getDownloadAsset,
  inferAssetArchitecture,
  inferAssetPlatform,
  recommendAsset
} from './asset-matcher';
import type { GitHubReleaseAsset } from './github-types';

function createGitHubAsset(name: string): GitHubReleaseAsset {
  return {
    name,
    browser_download_url: `https://github.com/example/tool/releases/${name}`
  };
}

function createAsset(name: string): RepositoryAsset {
  return {
    id: name,
    name,
    downloadUrl: `https://github.com/example/tool/releases/${name}`,
    size: 1024,
    downloadCount: 1,
    contentType: 'application/octet-stream',
    kind: classifyAsset(name),
    format: null,
    platform: inferAssetPlatform(name),
    architecture: inferAssetArchitecture(name)
  };
}

describe('asset metadata', () => {
  it('separates source, checksum and signature assets', () => {
    expect(classifyAsset('SourceCode-v1.0.0.zip')).toBe('source');
    expect(classifyAsset('tool.sha256')).toBe('checksum');
    expect(classifyAsset('SHA256SUMS')).toBe('checksum');
    expect(classifyAsset('tool.tar.gz.asc')).toBe('signature');
  });

  it('detects common platforms and architectures', () => {
    expect(inferAssetPlatform('tool-windows-x86_64.zip')).toBe('windows');
    expect(inferAssetArchitecture('tool-windows-x86_64.zip')).toBe('x64');
    expect(inferAssetPlatform('tool-darwin-arm64.tar.gz')).toBe('macos');
    expect(inferAssetArchitecture('tool-darwin-arm64.tar.gz')).toBe('arm64');
  });
});

describe('recommendAsset', () => {
  it('returns none when the device cannot be detected reliably', () => {
    const result = recommendAsset([createAsset('tool-linux-x64.tar.gz')]);

    expect(result.confidence).toBe('none');
    expect(result.assetId).toBeNull();
  });

  it('recommends the asset matching the detected operating system', () => {
    const assets = [
      createAsset('tool-linux-x86_64.tar.gz'),
      createAsset('tool-windows-x64.zip')
    ];
    const windowsUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    expect(recommendAsset(assets, windowsUserAgent).assetId).toBe(
      'tool-windows-x64.zip'
    );
  });

  it('does not recommend source archives automatically', () => {
    const result = recommendAsset(
      [createAsset('SourceCode-main.zip')],
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    );

    expect(result.confidence).toBe('none');
    expect(result.assetId).toBeNull();
  });
});

describe('getDownloadAsset compatibility API', () => {
  it('returns an exact keyword match', () => {
    const assets = [
      createGitHubAsset('tool-linux-x86_64.tar.gz'),
      createGitHubAsset('tool-windows-x64.zip')
    ];

    expect(getDownloadAsset(assets, undefined, 'windows')?.name).toBe(
      'tool-windows-x64.zip'
    );
  });

  it('does not silently select an asset when a keyword has no match', () => {
    const assets = [
      createGitHubAsset('tool-linux-x86_64.tar.gz'),
      createGitHubAsset('tool-windows-x64.zip')
    ];

    expect(getDownloadAsset(assets, undefined, 'android')).toBeUndefined();
  });

  it('treats a whitespace-only keyword as no keyword', () => {
    const assets = [createGitHubAsset('tool-windows-x64.zip')];

    expect(getDownloadAsset(assets, undefined, '   ')).toBeUndefined();
  });

  it('never recommends checksum or signature files', () => {
    const assets = [
      createGitHubAsset('tool.sha256'),
      createGitHubAsset('tool.tar.gz.asc')
    ];

    expect(getDownloadAsset(assets, undefined, undefined)).toBeUndefined();
  });
});
