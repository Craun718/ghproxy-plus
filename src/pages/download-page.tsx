import { ArrowLeft, ChevronDown, CircleAlert, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdvancedSelection from '@/components/repository-download/advanced-selection';
import { LoadingResult } from '@/components/repository-download/loading-result';
import { RecommendedAsset } from '@/components/repository-download/recommended-asset';
import { RepositorySummary } from '@/components/repository-download/repository-summary';
import { buttonVariants } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  createRepositoryUrlSearch,
  useRepositoryUrlState
} from '@/hooks/use-repository-url-state';
import { cn } from '@/lib/utils';
import {
  selectCurrentAsset,
  selectCurrentRelease,
  selectProxyPath,
  useRepositoryDownloadModel
} from '@/models/repository-download-model';
import { parseRepositoryInput } from '@/models/repository-download-schema';
import type {
  RepositoryErrorCode,
  RepositoryRelease
} from '@/models/repository-download-types';

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

function isRequestedRelease(
  release: RepositoryRelease | null,
  releaseId: string | null
) {
  return (
    !releaseId || release?.id === releaseId || release?.tagName === releaseId
  );
}

function matchesRequestedRepository(
  repositoryFullName: string | undefined,
  input: string
) {
  if (!repositoryFullName) return false;

  try {
    return (
      parseRepositoryInput(input).fullName.toLocaleLowerCase() ===
      repositoryFullName.toLocaleLowerCase()
    );
  } catch {
    return false;
  }
}

export default function DownloadPage() {
  const navigate = useNavigate();
  const { initialState, replaceUrlState } = useRepositoryUrlState();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const resolvedRequest = useRef<string | null>(null);

  const status = useRepositoryDownloadModel((state) => state.status);
  const repository = useRepositoryDownloadModel((state) => state.repository);
  const releases = useRepositoryDownloadModel((state) => state.releases);
  const selectedReleaseId = useRepositoryDownloadModel(
    (state) => state.selectedReleaseId
  );
  const selectedAssetId = useRepositoryDownloadModel(
    (state) => state.selectedAssetId
  );
  const recommendation = useRepositoryDownloadModel(
    (state) => state.recommendation
  );
  const error = useRepositoryDownloadModel((state) => state.error);
  const notice = useRepositoryDownloadModel((state) => state.notice);
  const resolveRepository = useRepositoryDownloadModel(
    (state) => state.resolveRepository
  );
  const reset = useRepositoryDownloadModel((state) => state.reset);
  const selectRelease = useRepositoryDownloadModel(
    (state) => state.selectRelease
  );
  const selectAsset = useRepositoryDownloadModel((state) => state.selectAsset);
  const currentRelease = useRepositoryDownloadModel(selectCurrentRelease);
  const currentAsset = useRepositoryDownloadModel(selectCurrentAsset);
  const proxyPath = useRepositoryDownloadModel(selectProxyPath);

  useEffect(() => {
    if (!initialState.repo) {
      navigate('/', { replace: true });
      return;
    }

    const requestKey = [
      initialState.repo,
      initialState.releaseId ?? '',
      initialState.assetId ?? ''
    ].join('\u0000');
    if (resolvedRequest.current === requestKey) return;

    const hasCurrentSelection =
      isRequestedRelease(currentRelease, initialState.releaseId) &&
      (!initialState.assetId || selectedAssetId === initialState.assetId);
    if (
      matchesRequestedRepository(repository?.fullName, initialState.repo) &&
      hasCurrentSelection
    ) {
      resolvedRequest.current = requestKey;
      return;
    }

    resolvedRequest.current = requestKey;
    void resolveRepository(initialState.repo, {
      releaseId: initialState.releaseId,
      assetId: initialState.assetId,
      userAgent: navigator.userAgent
    });
  }, [
    currentRelease,
    initialState,
    navigate,
    repository?.fullName,
    resolveRepository,
    selectedAssetId
  ]);

  useEffect(() => {
    if (!repository) return;

    replaceUrlState({
      repo: repository.fullName,
      releaseId: currentRelease?.tagName ?? null,
      assetId: selectedAssetId
    });
  }, [currentRelease?.tagName, repository, replaceUrlState, selectedAssetId]);

  useEffect(() => {
    if (status === 'ready' && !selectedAssetId) setAdvancedOpen(true);
  }, [selectedAssetId, status]);

  const retrySearch = createRepositoryUrlSearch({
    repo: initialState.repo,
    releaseId: initialState.releaseId,
    assetId: initialState.assetId
  }).toString();
  return (
    <div className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          to="/"
          onClick={reset}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft aria-hidden="true" />
          Search another repository
        </Link>
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Release assets
          </h1>
          <p className="text-sm text-foreground/80">
            Review the recommendation or choose a specific release and file.
          </p>
        </div>
      </div>

      {status === 'validating' || status === 'loading' ? (
        <LoadingResult />
      ) : null}

      {error ? (
        <div
          className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/8 p-4 text-sm"
          role="alert"
        >
          <CircleAlert
            className="mt-0.5 size-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-medium">{errorTitles[error.code]}</h2>
            <p className="mt-1 text-muted-foreground">{error.message}</p>
            <Link
              to={{
                pathname: '/',
                search: retrySearch ? `?${retrySearch}` : ''
              }}
              className={cn(buttonVariants({ variant: 'link' }), '-ml-3 mt-2')}
            >
              <ArrowLeft aria-hidden="true" />
              Try again from the search page
            </Link>
          </div>
        </div>
      ) : null}

      {notice ? (
        <output
          className="flex items-start gap-3 rounded-3xl border border-border bg-muted/50 p-4 text-sm"
          aria-live="polite"
        >
          <Info
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>{notice}</p>
        </output>
      ) : null}

      {repository && (status !== 'ready' || !currentRelease) ? (
        <RepositorySummary repository={repository} release={currentRelease} />
      ) : null}

      {currentRelease && repository && status === 'ready' ? (
        <RecommendedAsset
          key={currentAsset?.id ?? currentRelease.id}
          asset={currentAsset}
          release={currentRelease}
          repository={repository}
          recommendation={recommendation}
          proxyPath={proxyPath}
          isManualSelection={
            Boolean(currentAsset) &&
            currentAsset?.id !== recommendation?.assetId
          }
        />
      ) : null}

      {currentRelease && releases.length > 0 ? (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'min-h-11 w-full justify-between'
            )}
          >
            Choose another release or file
            <ChevronDown
              className="transition-transform group-data-panel-open:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 rounded-4xl bg-card p-6 shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10">
            {advancedOpen ? (
              <AdvancedSelection
                releases={releases}
                currentRelease={currentRelease}
                selectedReleaseId={selectedReleaseId}
                selectedAssetId={selectedAssetId}
                recommendation={recommendation}
                onSelectRelease={selectRelease}
                onSelectAsset={selectAsset}
              />
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
