import { z } from 'zod';
import type { RepositoryIdentifier } from './repository-download-types';

const repositorySegmentSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    'Repository names can only contain letters, numbers, dots, dashes and underscores.'
  );

export const repositoryIdentifierSchema = z.object({
  owner: repositorySegmentSchema,
  repo: repositorySegmentSchema
});

function parsePath(path: string): RepositoryIdentifier {
  const [owner = '', rawRepo = ''] = path.split('/').filter(Boolean);
  const repo = rawRepo.endsWith('.git') ? rawRepo.slice(0, -4) : rawRepo;
  const parsed = repositoryIdentifierSchema.safeParse({ owner, repo });

  if (!parsed.success) {
    throw new Error(
      'Enter a GitHub repository as owner/repo or paste its GitHub URL.'
    );
  }

  return {
    ...parsed.data,
    fullName: `${parsed.data.owner}/${parsed.data.repo}`
  };
}

export function parseRepositoryInput(value: string): RepositoryIdentifier {
  const input = value.trim();

  if (!input) {
    throw new Error('Enter a GitHub repository to continue.');
  }

  if (!input.includes('://') && !input.startsWith('github.com/')) {
    return parsePath(input);
  }

  let url: URL;
  try {
    url = new URL(input.startsWith('github.com/') ? `https://${input}` : input);
  } catch {
    throw new Error('Enter a valid GitHub repository URL.');
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    throw new Error('Only github.com repository URLs are supported.');
  }

  return parsePath(url.pathname);
}
