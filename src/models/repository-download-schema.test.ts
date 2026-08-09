import { describe, expect, it } from 'vitest';
import { parseRepositoryInput } from './repository-download-schema';

describe('parseRepositoryInput', () => {
  it.each([
    'owner/repo',
    'github.com/owner/repo',
    'https://github.com/owner/repo',
    'https://github.com/owner/repo.git',
    'https://github.com/owner/repo/releases/tag/v1.0.0'
  ])('parses %s', (input) => {
    expect(parseRepositoryInput(input)).toEqual({
      owner: 'owner',
      repo: 'repo',
      fullName: 'owner/repo'
    });
  });

  it('rejects non-GitHub hosts', () => {
    expect(() =>
      parseRepositoryInput('https://example.com/owner/repo')
    ).toThrow('Only github.com');
  });

  it('rejects incomplete identifiers', () => {
    expect(() => parseRepositoryInput('owner')).toThrow('owner/repo');
  });
});
