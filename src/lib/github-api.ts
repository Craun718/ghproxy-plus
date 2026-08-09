import { LRUCache } from 'lru-cache';
import type {
  GitHubRelease,
  GitHubReleaseAsset,
  GitHubRepository
} from './github-types';

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

const releasesCache = new LRUCache<string, GitHubRelease[]>({
  max: 50,
  ttl: 60_000
});

const repositoryCache = new LRUCache<string, GitHubRepository>({
  max: 100,
  ttl: 60_000
});

function canUseSharedCache(requestInit: RequestInit): boolean {
  return !new Headers(requestInit.headers).has('authorization');
}

async function fetchGitHub<T>(
  url: string,
  requestInit: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, requestInit);
  } catch {
    throw new GitHubApiError('GitHub could not be reached.', 503, url);
  }

  if (!response.ok) {
    const message =
      response.status === 403
        ? 'GitHub API rate limit exceeded.'
        : `GitHub returned ${response.status}.`;
    throw new GitHubApiError(message, response.status, url);
  }

  return (await response.json()) as T;
}

export function getSourceCodeAssets(
  owner: string,
  repo: string,
  ref: string,
  refType: 'tags' | 'heads' = 'tags'
): GitHubReleaseAsset[] {
  return ['tar.gz', 'zip'].map((format) => ({
    name: `SourceCode-${ref}.${format}`,
    browser_download_url: `https://github.com/${owner}/${repo}/archive/refs/${refType}/${ref}.${format}`
  }));
}

export async function getRepository(
  owner: string,
  repo: string,
  requestInit: RequestInit = {}
): Promise<GitHubRepository> {
  const cacheKey = `${owner}/${repo}`.toLowerCase();
  const useSharedCache = canUseSharedCache(requestInit);
  const cached = useSharedCache ? repositoryCache.get(cacheKey) : undefined;
  if (cached) return cached;

  const repository = await fetchGitHub<GitHubRepository>(
    `https://api.github.com/repos/${owner}/${repo}`,
    requestInit
  );
  if (useSharedCache) repositoryCache.set(cacheKey, repository);
  return repository;
}

export async function getRepositoryReleases(
  owner: string,
  repo: string,
  requestInit: RequestInit = {}
): Promise<GitHubRelease[]> {
  const cacheKey = `${owner}/${repo}`.toLowerCase();
  const useSharedCache = canUseSharedCache(requestInit);
  const cached = useSharedCache ? releasesCache.get(cacheKey) : undefined;
  if (cached) return cached;

  const releases = await fetchGitHub<GitHubRelease[]>(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`,
    requestInit
  );
  const normalized = releases.map((release) => ({
    ...release,
    assets: [
      ...release.assets,
      ...getSourceCodeAssets(owner, repo, release.tag_name)
    ]
  }));

  if (useSharedCache) releasesCache.set(cacheKey, normalized);
  return normalized;
}
