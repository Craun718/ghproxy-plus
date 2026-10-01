import type { GitHubReleaseAsset } from './github-types';

export interface ParsedReleasePage {
  tagName: string;
  expandedAssetsUrl: string;
}

export interface ParsedExpandedAssets {
  assets: GitHubReleaseAsset[];
  publishedAt: string | null;
}

interface GitHubPathContext {
  owner: string;
  repo: string;
}

const githubOrigin = 'https://github.com';

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function getPathContext(pathSegments: string[]): GitHubPathContext | null {
  const [owner, repo] = pathSegments;
  if (!owner || !repo) return null;

  const decodedOwner = decodePathSegment(owner);
  const decodedRepo = decodePathSegment(repo);
  if (!decodedOwner || !decodedRepo) return null;

  return { owner: decodedOwner, repo: decodedRepo };
}

function matchesRepository(
  context: GitHubPathContext,
  owner: string,
  repo: string
): boolean {
  return (
    context.owner.toLocaleLowerCase() === owner.toLocaleLowerCase() &&
    context.repo.toLocaleLowerCase() === repo.toLocaleLowerCase()
  );
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value, githubOrigin);
  } catch {
    return null;
  }
}

function parseExpandedAssetsUrl(
  value: string
): (GitHubPathContext & { tagName: string; url: URL }) | null {
  const url = parseUrl(value);
  if (!url || url.origin !== githubOrigin) return null;

  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (
    pathSegments.length < 5 ||
    pathSegments[2]?.toLowerCase() !== 'releases' ||
    pathSegments[3]?.toLowerCase() !== 'expanded_assets'
  ) {
    return null;
  }

  const context = getPathContext(pathSegments.slice(0, 2));
  const tagName = decodePathSegment(pathSegments.slice(4).join('/'));
  if (!context || !tagName) return null;

  return { ...context, tagName, url };
}

function parseReleaseDownloadUrl(
  value: string
): (GitHubPathContext & { tagName: string; name: string; url: URL }) | null {
  const url = parseUrl(value);
  if (!url || url.origin !== githubOrigin || url.search || url.hash) {
    return null;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
  const downloadIndex = pathSegments.findIndex(
    (segment) => segment.toLowerCase() === 'download'
  );
  if (
    downloadIndex !== 3 ||
    pathSegments[2]?.toLowerCase() !== 'releases' ||
    pathSegments.length < 5
  ) {
    return null;
  }

  const context = getPathContext(pathSegments.slice(0, 2));
  const encodedName = pathSegments[pathSegments.length - 1];
  const encodedTag = pathSegments.slice(4, -1).join('/');
  const tagName = decodePathSegment(encodedTag);
  const name = decodePathSegment(encodedName ?? '');
  if (!context || !tagName || !name) return null;

  return { ...context, tagName, name, url };
}

function isCurrentRepositoryArchive(
  element: HTMLAnchorElement,
  owner: string,
  repo: string
): boolean {
  const url = parseUrl(element.getAttribute('href') ?? '');
  if (!url || url.origin !== githubOrigin) return false;

  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (pathSegments.length < 4 || pathSegments[2]?.toLowerCase() !== 'archive') {
    return false;
  }

  const context = getPathContext(pathSegments.slice(0, 2));
  return Boolean(context && matchesRepository(context, owner, repo));
}

function parseAssetSize(row: Element | null): number | null {
  const match = (row?.textContent ?? '').match(
    /\b(\d+(?:\.\d+)?)\s*(bytes|KB|MB|GB|TB)\b/i
  );
  if (!match) return null;

  const value = Number(match[1]);
  const multiplier = {
    bytes: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4
  }[match[2].toLowerCase() as 'bytes' | 'kb' | 'mb' | 'gb' | 'tb'];

  return Number.isFinite(value) ? Math.round(value * multiplier) : null;
}

function getPublishedAt(anchor: HTMLAnchorElement): string | null {
  return (
    anchor
      .closest('li')
      ?.querySelector('relative-time[datetime]')
      ?.getAttribute('datetime') ?? null
  );
}

export function parseReleasePage(
  html: string,
  owner: string,
  repo: string
): ParsedReleasePage {
  const document = new DOMParser().parseFromString(html, 'text/html');

  for (const fragment of document.querySelectorAll('include-fragment[src]')) {
    const parsed = parseExpandedAssetsUrl(fragment.getAttribute('src') ?? '');
    if (parsed && matchesRepository(parsed, owner, repo)) {
      return {
        tagName: parsed.tagName,
        expandedAssetsUrl: parsed.url.href
      };
    }
  }

  throw new Error('The GitHub release page could not be parsed.');
}

export function parseExpandedAssets(
  html: string,
  owner: string,
  repo: string
): ParsedExpandedAssets {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const assets = new Map<string, GitHubReleaseAsset>();
  let publishedAt: string | null = null;
  let hasCurrentRepositoryArchive = false;

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    'a[href]'
  )) {
    if (isCurrentRepositoryArchive(anchor, owner, repo)) {
      hasCurrentRepositoryArchive = true;
      publishedAt ??= getPublishedAt(anchor);
    }

    const parsed = parseReleaseDownloadUrl(anchor.getAttribute('href') ?? '');
    if (!parsed || !matchesRepository(parsed, owner, repo)) continue;

    const row = anchor.closest('li');
    publishedAt ??= getPublishedAt(anchor);
    assets.set(parsed.url.href, {
      name: parsed.name,
      browser_download_url: parsed.url.href,
      size: parseAssetSize(row) ?? undefined
    });
  }

  if (assets.size === 0 && !hasCurrentRepositoryArchive) {
    throw new Error('The GitHub release assets could not be parsed.');
  }

  return {
    assets: [...assets.values()],
    publishedAt
  };
}
