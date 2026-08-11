import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingResult } from '@/components/repository-download/loading-result';
import { RepositorySearchForm } from '@/components/repository-download/repository-search-form';
import { Card, CardContent } from '@/components/ui/card';
import {
  createRepositoryUrlSearch,
  useRepositoryUrlState
} from '@/hooks/use-repository-url-state';
import {
  selectCurrentRelease,
  useRepositoryDownloadModel
} from '@/models/repository-download-model';
import type { RepositoryErrorCode } from '@/models/repository-download-types';

const errorTitles: Record<RepositoryErrorCode, string> = {
  invalid: 'Check the repository address',
  'invalid-token': 'GitHub token rejected',
  'not-found': 'Repository not found',
  'rate-limit': 'GitHub rate limit reached',
  network: 'Network connection failed',
  'empty-release': 'No releases found',
  'empty-asset': 'No assets in this release',
  server: 'GitHub service unavailable'
};

export default function HomePage() {
  const navigate = useNavigate();
  const { initialState } = useRepositoryUrlState();
  const [input, setInput] = useState(initialState.repo);
  const [token, setToken] = useState('');
  const initialQueryStarted = useRef(false);
  const shouldNavigateToResults = useRef(false);

  const status = useRepositoryDownloadModel((state) => state.status);
  const repository = useRepositoryDownloadModel((state) => state.repository);
  const selectedAssetId = useRepositoryDownloadModel(
    (state) => state.selectedAssetId
  );
  const error = useRepositoryDownloadModel((state) => state.error);
  const resolveRepository = useRepositoryDownloadModel(
    (state) => state.resolveRepository
  );
  const currentRelease = useRepositoryDownloadModel(selectCurrentRelease);

  useEffect(() => {
    if (
      initialQueryStarted.current ||
      !initialState.repo ||
      status !== 'idle'
    ) {
      return;
    }

    initialQueryStarted.current = true;
    shouldNavigateToResults.current = true;
    void resolveRepository(initialState.repo, {
      releaseId: initialState.releaseId,
      assetId: initialState.assetId,
      userAgent: navigator.userAgent
    });
  }, [initialState, resolveRepository, status]);

  useEffect(() => {
    if (
      !shouldNavigateToResults.current ||
      !repository ||
      (status !== 'ready' && status !== 'empty')
    ) {
      return;
    }

    shouldNavigateToResults.current = false;
    const search = createRepositoryUrlSearch({
      repo: repository.fullName,
      releaseId: currentRelease?.tagName ?? null,
      assetId: selectedAssetId
    }).toString();

    navigate(
      {
        pathname: '/download',
        search: search ? `?${search}` : ''
      },
      { replace: true }
    );
  }, [currentRelease?.tagName, navigate, repository, selectedAssetId, status]);

  const handleSubmit = (value: string, githubToken: string) => {
    shouldNavigateToResults.current = true;
    void resolveRepository(value, {
      userAgent: navigator.userAgent,
      token: githubToken
    });
  };

  const fieldError = error?.code === 'invalid' ? error.message : undefined;
  const resultError = error?.code !== 'invalid' ? error : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <section className="space-y-3 text-center">
        <div className="space-y-3">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Find the right GitHub Release asset
          </h1>
          <p className="text-pretty text-base text-foreground/80 sm:text-lg">
            Paste a repo. Get the right build. Download via proxy.
          </p>
        </div>
      </section>

      <Card>
        <CardContent>
          <RepositorySearchForm
            value={input}
            token={token}
            status={status}
            errorMessage={fieldError}
            promptForToken={error?.code === 'rate-limit'}
            onValueChange={setInput}
            onTokenChange={setToken}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      {status === 'idle' ? (
        <div className="rounded-3xl border border-dashed border-border px-5 py-5 text-center text-sm text-muted-foreground">
          Try{' '}
          <button
            type="button"
            className="font-medium text-primary underline underline-offset-4"
            onClick={() => setInput('noctisynth/semifold')}
          >
            noctisynth/semifold
          </button>{' '}
          or paste any public GitHub repository URL.
        </div>
      ) : null}

      {status === 'validating' || status === 'loading' ? (
        <LoadingResult />
      ) : null}

      {resultError ? (
        <div
          className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/8 p-4 text-sm"
          role="alert"
        >
          <CircleAlert
            className="mt-0.5 size-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-medium">{errorTitles[resultError.code]}</h2>
            <p className="mt-1 text-muted-foreground">{resultError.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
