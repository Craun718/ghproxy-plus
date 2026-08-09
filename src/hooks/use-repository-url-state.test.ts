import { describe, expect, it } from 'vitest';
import {
  createRepositoryUrlSearch,
  readRepositoryUrlState
} from './use-repository-url-state';

describe('repository URL state', () => {
  it('reads repo, release and asset selections', () => {
    const state = readRepositoryUrlState(
      new URLSearchParams('repo=owner%2Frepo&release=v1.2.0&asset=asset-123')
    );

    expect(state).toEqual({
      repo: 'owner/repo',
      releaseId: 'v1.2.0',
      assetId: 'asset-123'
    });
  });

  it('omits empty optional values when serializing', () => {
    expect(
      createRepositoryUrlSearch({
        repo: 'owner/repo',
        releaseId: null,
        assetId: null
      }).toString()
    ).toBe('repo=owner%2Frepo');
  });
});
