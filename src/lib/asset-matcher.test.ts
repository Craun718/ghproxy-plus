import { describe, expect, it } from 'vitest';
import type { RepositoryAsset } from '@/models/repository-download-types';
import {
  classifyAsset,
  inferAssetArchitecture,
  inferAssetFormat,
  inferAssetPlatform,
  recommendAsset
} from './asset-matcher';

function createAsset(name: string): RepositoryAsset {
  return {
    id: name,
    name,
    downloadUrl: `https://github.com/example/tool/releases/${name}`,
    size: 1024,
    downloadCount: 1,
    contentType: 'application/octet-stream',
    kind: classifyAsset(name),
    format: inferAssetFormat(name),
    platform: inferAssetPlatform(name),
    architecture: inferAssetArchitecture(name)
  };
}

describe('asset metadata', () => {
  it('separates source, checksum, signature and config assets', () => {
    expect(classifyAsset('SourceCode-v1.0.0.zip')).toBe('source');
    expect(classifyAsset('tool.sha256')).toBe('checksum');
    expect(classifyAsset('SHA256SUMS')).toBe('checksum');
    expect(classifyAsset('tool.tar.gz.asc')).toBe('signature');
    expect(classifyAsset('latest-mac.yml')).toBe('config');
    expect(classifyAsset('latest-linux.yaml')).toBe('config');
    expect(classifyAsset('update.json')).toBe('config');
    expect(classifyAsset('metadata.xml')).toBe('config');
  });

  it('detects common platforms and architectures', () => {
    expect(inferAssetPlatform('tool-windows-x86_64.zip')).toBe('windows');
    expect(inferAssetArchitecture('tool-windows-x86_64.zip')).toBe('x64');
    expect(inferAssetPlatform('tool-darwin-arm64.tar.gz')).toBe('macos');
    expect(inferAssetArchitecture('tool-darwin-arm64.tar.gz')).toBe('arm64');
  });

  it('prefers suffix-derived platform over platform words in filenames', () => {
    expect(inferAssetFormat('draw.io-arm64-31.1.8.dmg')).toBe('dmg');
    expect(inferAssetPlatform('draw.io-arm64-31.1.8.dmg')).toBe('macos');
    expect(inferAssetPlatform('tool-windows-x64.dmg')).toBe('macos');
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

  it('does not recommend config or update metadata automatically', () => {
    const result = recommendAsset(
      [createAsset('latest-mac.yml')],
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );

    expect(result.confidence).toBe('none');
    expect(result.assetId).toBeNull();
  });

  it('prefers the dmg installer over update metadata on macOS', () => {
    const assets = [
      createAsset('latest-mac.yml'),
      createAsset('draw.io-arm64-31.1.8.dmg')
    ];
    const result = recommendAsset(
      assets,
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );

    expect(result.assetId).toBe('draw.io-arm64-31.1.8.dmg');
    expect(result.reasons).toContain('Prefers dmg format');
  });
});
