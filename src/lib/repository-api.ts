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
  let response: Response;
  const token = options.token?.trim();

  try {
    response = await fetch(
      `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
      {
        signal: options.signal,
        headers: token ? { 'X-GitHub-Token': token } : undefined
      }
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new RepositoryApiError(
      'network',
      'The repository service could not be reached.',
      503
    );
  }

  const payload = (await response.json()) as
    | RepositoryResponse
    | { error?: { code?: string; message?: string } };

  if (!response.ok) {
    const apiError = 'error' in payload ? payload.error : undefined;
    throw new RepositoryApiError(
      apiError?.code ?? 'server',
      apiError?.message ?? 'The repository could not be loaded.',
      response.status
    );
  }

  return payload as RepositoryResponse;
}
