import type {
  RepositoryAsset,
  RepositoryResponse
} from '@/models/repository-download-types';
import {
  classifyAsset,
  inferAssetArchitecture,
  inferAssetFormat,
  inferAssetPlatform
} from './asset-matcher';
import type { GitHubRelease, GitHubRepository } from './github-types';

export class RepositoryApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'RepositoryApiError';
  }
}

interface FetchRepositoryOptions {
  signal?: AbortSignal;
  token?: string;
}

const githubApiBaseUrl = 'https://api.github.com';

function getSourceCodeAssets(
  owner: string,
  repo: string,
  ref: string,
  refType: 'tags' | 'heads' = 'tags'
): GitHubRelease['assets'] {
  return ['tar.gz', 'zip'].map((format) => ({
    name: `SourceCode-${ref}.${format}`,
    browser_download_url: `https://github.com/${owner}/${repo}/archive/refs/${refType}/${ref}.${format}`
  }));
}

function getErrorDetails(status: number): {
  code: string;
  message: string;
} {
  if (status === 401) {
    return {
      code: 'invalid-token',
      message: 'The GitHub token is invalid or no longer active.'
    };
  }

  if (status === 403 || status === 429) {
    return {
      code: 'rate-limit',
      message:
        'GitHub rate limit reached. Wait and try again, or add a token under optional GitHub authentication.'
    };
  }

  if (status === 404) {
    return {
      code: 'not-found',
      message: 'The GitHub repository was not found.'
    };
  }

  return {
    code: 'server',
    message: `GitHub returned ${status}.`
  };
}

async function fetchGitHub<T>(
  url: string,
  requestInit: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, requestInit);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new RepositoryApiError(
      'network',
      'GitHub could not be reached from this browser.',
      503
    );
  }

  if (!response.ok) {
    const details = getErrorDetails(response.status);
    throw new RepositoryApiError(
      details.code,
      details.message,
      response.status
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new RepositoryApiError(
      'server',
      'GitHub returned an unreadable response.',
      502
    );
  }
}

function normalizeAsset(
  releaseId: string,
  asset: GitHubRelease['assets'][number],
  index: number
): RepositoryAsset {
  return {
    id: `${releaseId}:${asset.id ?? index}:${asset.name}`,
    name: asset.name,
    downloadUrl: asset.browser_download_url,
    size: asset.size ?? null,
    downloadCount: asset.download_count ?? null,
    contentType: asset.content_type ?? null,
    kind: classifyAsset(asset.name),
    format: inferAssetFormat(asset.name),
    platform: inferAssetPlatform(asset.name),
    architecture: inferAssetArchitecture(asset.name)
  };
}

export function normalizeRepositoryResponse(
  repository: GitHubRepository,
  releases: GitHubRelease[]
): RepositoryResponse {
  const [owner = '', name = repository.name] = repository.full_name.split('/');

  return {
    repository: {
      owner,
      name,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.html_url,
      defaultBranch: repository.default_branch
    },
    releases: releases.map((release) => {
      const id = String(release.id);
      return {
        id,
        name: release.name?.trim() || release.tag_name,
        tagName: release.tag_name,
        publishedAt: release.published_at ?? null,
        prerelease: release.prerelease ?? false,
        assets: release.assets.map((asset, index) =>
          normalizeAsset(id, asset, index)
        )
      };
    })
  };
}

export async function fetchRepository(
  owner: string,
  repo: string,
  options: FetchRepositoryOptions = {}
): Promise<RepositoryResponse> {
  const token = options.token?.trim();
  const repositoryPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const requestInit: RequestInit = {
    signal: options.signal,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };

  const [repository, githubReleases] = await Promise.all([
    fetchGitHub<GitHubRepository>(
      `${githubApiBaseUrl}/repos/${repositoryPath}`,
      requestInit
    ),
    fetchGitHub<GitHubRelease[]>(
      `${githubApiBaseUrl}/repos/${repositoryPath}/releases?per_page=100`,
      requestInit
    )
  ]);

  const releases = githubReleases.map((release) => ({
    ...release,
    assets: [
      ...release.assets,
      ...getSourceCodeAssets(owner, repo, release.tag_name)
    ]
  }));

  if (releases.length === 0) {
    const branch = repository.default_branch;
    releases.push({
      id: 0,
      name: `Default branch — ${branch}`,
      tag_name: branch,
      assets: getSourceCodeAssets(owner, repo, branch, 'heads'),
      prerelease: false
    });
  }

  return normalizeRepositoryResponse(repository, releases);
}
