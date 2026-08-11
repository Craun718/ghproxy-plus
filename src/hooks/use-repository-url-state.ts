import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface RepositoryUrlState {
  repo: string;
  releaseId: string | null;
  assetId: string | null;
}

export function readRepositoryUrlState(
  searchParams: URLSearchParams
): RepositoryUrlState {
  return {
    repo: searchParams.get('repo')?.trim() ?? '',
    releaseId: searchParams.get('release'),
    assetId: searchParams.get('asset')
  };
}

export function createRepositoryUrlSearch(
  state: RepositoryUrlState
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (state.repo) searchParams.set('repo', state.repo);
  if (state.releaseId) searchParams.set('release', state.releaseId);
  if (state.assetId) searchParams.set('asset', state.assetId);

  return searchParams;
}

export function useRepositoryUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialState] = useState(() => readRepositoryUrlState(searchParams));

  const replaceUrlState = useCallback(
    (state: RepositoryUrlState) => {
      setSearchParams(createRepositoryUrlSearch(state), { replace: true });
    },
    [setSearchParams]
  );

  return { initialState, replaceUrlState };
}
