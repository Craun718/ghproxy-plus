import { UAParser } from 'ua-parser-js';
import type {
  AssetKind,
  AssetRecommendation,
  RepositoryAsset
} from '@/models/repository-download-types';

interface DownloadAssetLike {
  name: string;
  browser_download_url: string;
}

interface DeviceProfile {
  platform: string | null;
  architecture: string | null;
}

const checksumSuffixes = [
  '.md5',
  '.md5sum',
  '.sha1',
  '.sha1sum',
  '.sha256',
  '.sha256sum',
  '.sha512',
  '.sha512sum',
  'checksums.txt'
];

const signatureSuffixes = ['.asc', '.sig', '.minisig'];

const formatSuffixes = [
  'tar.gz',
  'tar.zst',
  'tar.xz',
  'appimage',
  'msi',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'apk',
  'exe',
  'zip',
  'tgz',
  'gz'
];

const platformPatterns: Record<string, RegExp> = {
  windows: /(?:^|[_.-])(windows|win32|win64|win)(?:[_.-]|$)/i,
  macos: /(?:^|[_.-])(macos|darwin|osx|mac)(?:[_.-]|$)/i,
  linux: /(?:^|[_.-])(linux|gnu|appimage|deb|rpm)(?:[_.-]|$)/i,
  android: /(?:^|[_.-])(android|apk)(?:[_.-]|$)/i,
  ios: /(?:^|[_.-])(ios|ipa)(?:[_.-]|$)/i
};

const architecturePatterns: Record<string, RegExp> = {
  x64: /(?:^|[_.-])(x86_64|x64|amd64)(?:[_.-]|$)/i,
  x86: /(?:^|[_.-])(x86|i386|i686|ia32)(?:[_.-]|$)/i,
  arm64: /(?:^|[_.-])(arm64|aarch64|armv8|armv8l)(?:[_.-]|$)/i,
  arm: /(?:^|[_.-])(armv7|armv7l|armhf|arm)(?:[_.-]|$)/i
};

export function classifyAsset(name: string): AssetKind {
  const lowerName = name.toLowerCase();

  if (
    checksumSuffixes.some((suffix) => lowerName.endsWith(suffix)) ||
    /(?:^|[_.-])(checksums?|sha\d+sums)(?:[_.-]|$)/i.test(lowerName)
  ) {
    return 'checksum';
  }

  if (signatureSuffixes.some((suffix) => lowerName.endsWith(suffix))) {
    return 'signature';
  }

  if (
    lowerName.startsWith('sourcecode-') ||
    lowerName.includes('source-code') ||
    lowerName.includes('source_code')
  ) {
    return 'source';
  }

  return 'binary';
}

export function inferAssetFormat(name: string): string | null {
  const lowerName = name.toLowerCase();
  return (
    formatSuffixes.find((suffix) => lowerName.endsWith(`.${suffix}`)) ?? null
  );
}

function findPatternMatch(
  name: string,
  patterns: Record<string, RegExp>
): string | null {
  return (
    Object.entries(patterns).find(([, pattern]) => pattern.test(name))?.[0] ??
    null
  );
}

export function inferAssetPlatform(name: string): string | null {
  return findPatternMatch(name, platformPatterns);
}

export function inferAssetArchitecture(name: string): string | null {
  return findPatternMatch(name, architecturePatterns);
}

function getDeviceProfile(userAgent?: string): DeviceProfile {
  if (!userAgent) {
    return { platform: null, architecture: null };
  }

  const parser = new UAParser(userAgent);
  const osName = parser.getOS().name?.toLowerCase() ?? '';
  const rawArchitecture = parser.getCPU().architecture?.toLowerCase() ?? '';

  let platform: string | null = null;
  if (osName.includes('windows')) platform = 'windows';
  else if (osName.includes('mac')) platform = 'macos';
  else if (osName.includes('android')) platform = 'android';
  else if (osName.includes('ios')) platform = 'ios';
  else if (osName.includes('linux')) platform = 'linux';

  let architecture: string | null = null;
  if (['amd64', 'x64', 'x86_64'].includes(rawArchitecture)) {
    architecture = 'x64';
  } else if (['ia32', 'x86', 'i386', 'i686'].includes(rawArchitecture)) {
    architecture = 'x86';
  } else if (
    ['arm64', 'aarch64', 'armv8', 'armv8l'].includes(rawArchitecture)
  ) {
    architecture = 'arm64';
  } else if (rawArchitecture.startsWith('arm')) {
    architecture = 'arm';
  }

  return { platform, architecture };
}

export function recommendAsset(
  assets: RepositoryAsset[],
  userAgent?: string,
  keyword?: string
): AssetRecommendation {
  const downloadableAssets = assets.filter(
    (asset) => asset.kind !== 'checksum' && asset.kind !== 'signature'
  );
  const profile = getDeviceProfile(userAgent);

  const normalizedKeyword = keyword?.trim().toLowerCase();
  if (normalizedKeyword) {
    const keywordMatch = downloadableAssets.find((asset) =>
      asset.name.toLowerCase().includes(normalizedKeyword)
    );

    return keywordMatch
      ? {
          assetId: keywordMatch.id,
          confidence: 'exact',
          reasons: [`Matches “${keyword?.trim()}”`],
          platform: keywordMatch.platform,
          architecture: keywordMatch.architecture
        }
      : {
          assetId: null,
          confidence: 'none',
          reasons: [`No asset matches “${keyword?.trim()}”`],
          ...profile
        };
  }

  const binaryAssets = downloadableAssets.filter(
    (asset) => asset.kind === 'binary'
  );

  if (!profile.platform && !profile.architecture) {
    return {
      assetId: null,
      confidence: 'none',
      reasons: ['Your platform could not be detected reliably'],
      ...profile
    };
  }

  const ranked = binaryAssets
    .map((asset, index) => {
      const platformMatch =
        Boolean(profile.platform) && asset.platform === profile.platform;
      const architectureMatch =
        Boolean(profile.architecture) &&
        asset.architecture === profile.architecture;
      const platformMismatch =
        Boolean(profile.platform) &&
        Boolean(asset.platform) &&
        asset.platform !== profile.platform;
      const architectureMismatch =
        Boolean(profile.architecture) &&
        Boolean(asset.architecture) &&
        asset.architecture !== profile.architecture;
      const score =
        (platformMatch ? 4 : 0) +
        (architectureMatch ? 3 : 0) -
        (platformMismatch ? 5 : 0) -
        (architectureMismatch ? 4 : 0);

      return {
        asset,
        index,
        score,
        platformMatch,
        architectureMatch
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) => right.score - left.score || left.index - right.index
    );

  const best = ranked[0];
  if (!best) {
    return {
      assetId: null,
      confidence: 'none',
      reasons: ['No release asset matches the detected device'],
      ...profile
    };
  }

  const reasons = [
    best.platformMatch && profile.platform
      ? `Matches ${profile.platform}`
      : null,
    best.architectureMatch && profile.architecture
      ? `Matches ${profile.architecture}`
      : null
  ].filter((reason): reason is string => Boolean(reason));

  return {
    assetId: best.asset.id,
    confidence:
      best.platformMatch && (!profile.architecture || best.architectureMatch)
        ? 'exact'
        : 'likely',
    reasons,
    ...profile
  };
}

export function getDownloadAsset<TAsset extends DownloadAssetLike>(
  assets: TAsset[],
  userAgent?: string,
  keyword?: string
): TAsset | undefined {
  const normalized = assets.map<RepositoryAsset>((asset, index) => ({
    id: String(index),
    name: asset.name,
    downloadUrl: asset.browser_download_url,
    size: null,
    downloadCount: null,
    contentType: null,
    kind: classifyAsset(asset.name),
    format: inferAssetFormat(asset.name),
    platform: inferAssetPlatform(asset.name),
    architecture: inferAssetArchitecture(asset.name)
  }));

  if (!userAgent && !keyword) {
    const firstDownloadable = normalized.find(
      (asset) => asset.kind === 'binary' || asset.kind === 'source'
    );
    return firstDownloadable ? assets[Number(firstDownloadable.id)] : undefined;
  }

  const recommendation = recommendAsset(normalized, userAgent, keyword);
  return recommendation.assetId === null
    ? undefined
    : assets[Number(recommendation.assetId)];
}
