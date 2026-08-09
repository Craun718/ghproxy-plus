import type { Context } from 'hono';
import {
  GitHubApiError,
  getRepository,
  getRepositoryReleases,
  getSourceCodeAssets
} from '@/lib/github-api';
import type { GitHubRelease } from '@/lib/github-types';
import { normalizeRepositoryResponse } from '@/lib/repository-api';

const segmentPattern = /^[a-zA-Z0-9_.-]+$/;

function errorResponse(
  context: Context,
  status: 400 | 404 | 429 | 500 | 502 | 503,
  code: string,
  message: string
) {
  return context.json({ error: { code, message } }, status);
}

export async function repositoryApi(context: Context) {
  const owner = context.req.param('owner') ?? '';
  const repo = context.req.param('repo') ?? '';

  if (!segmentPattern.test(owner) || !segmentPattern.test(repo)) {
    return errorResponse(
      context,
      400,
      'invalid',
      'The repository identifier is invalid.'
    );
  }

  try {
    const repository = await getRepository(owner, repo);
    let releases = await getRepositoryReleases(owner, repo);

    if (releases.length === 0) {
      const branch = repository.default_branch;
      releases = [
        {
          id: 0,
          name: `Default branch — ${branch}`,
          tag_name: branch,
          assets: getSourceCodeAssets(owner, repo, branch, 'heads'),
          prerelease: false
        } satisfies GitHubRelease
      ];
    }

    return context.json(normalizeRepositoryResponse(repository, releases));
  } catch (error) {
    if (error instanceof GitHubApiError) {
      if (error.status === 404) {
        return errorResponse(
          context,
          404,
          'not-found',
          'The GitHub repository was not found.'
        );
      }

      if (error.status === 403 || error.status === 429) {
        return errorResponse(
          context,
          429,
          'rate-limit',
          'GitHub rate limit reached. Try again later.'
        );
      }

      return errorResponse(context, 502, 'github', error.message);
    }

    return errorResponse(
      context,
      500,
      'server',
      'The repository service failed unexpectedly.'
    );
  }
}
