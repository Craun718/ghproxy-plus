import { ChevronDown, CircleAlert, Info } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { LoadingResult } from '@/components/repository-download/loading-result';
import { RecommendedAsset } from '@/components/repository-download/recommended-asset';
import { RepositorySearchForm } from '@/components/repository-download/repository-search-form';
import { RepositorySummary } from '@/components/repository-download/repository-summary';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { useRepositoryUrlState } from '@/hooks/use-repository-url-state';
import { cn } from '@/lib/utils';
import {
  selectCurrentAsset,
  selectCurrentRelease,
  selectProxyPath,
  useRepositoryDownloadModel
} from '@/models/repository-download-model';
import type { RepositoryErrorCode } from '@/models/repository-download-types';

const loadAdvancedSelection = () =>
  import('@/components/repository-download/advanced-selection');
const AdvancedSelection = lazy(loadAdvancedSelection);

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
  const { initialState, replaceUrlState } = useRepositoryUrlState();
  const [input, setInput] = useState(initialState.repo);
  const [token, setToken] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
  const selectRelease = useRepositoryDownloadModel(
    (state) => state.selectRelease
  );
  const selectAsset = useRepositoryDownloadModel((state) => state.selectAsset);
  const currentRelease = useRepositoryDownloadModel(selectCurrentRelease);
  const currentAsset = useRepositoryDownloadModel(selectCurrentAsset);
  const proxyPath = useRepositoryDownloadModel(selectProxyPath);

  useEffect(() => {
    if (!initialState.repo) return;

    void resolveRepository(initialState.repo, {
      releaseId: initialState.releaseId,
      assetId: initialState.assetId,
      userAgent: navigator.userAgent
    });
  }, [initialState, resolveRepository]);

  useEffect(() => {
    if (!repository) return;

    replaceUrlState({
      repo: repository.fullName,
      releaseId: currentRelease?.tagName ?? null,
      assetId: selectedAssetId
    });
  }, [currentRelease?.tagName, repository, replaceUrlState, selectedAssetId]);

  useEffect(() => {
    if (repository) void loadAdvancedSelection();
  }, [repository]);

  useEffect(() => {
    if (status === 'ready' && !selectedAssetId) setAdvancedOpen(true);
  }, [selectedAssetId, status]);

  const handleSubmit = (value: string, githubToken: string) => {
    void resolveRepository(value, {
      userAgent: navigator.userAgent,
      token: githubToken
    });
  };

  const fieldError = error?.code === 'invalid' ? error.message : undefined;
  const resultError = error?.code !== 'invalid' ? error : null;
  const hasOnlySourceAssets =
    currentRelease?.assets.some((asset) => asset.kind === 'source') &&
    !currentRelease.assets.some((asset) => asset.kind === 'binary');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className="mx-auto max-w-3xl space-y-3 text-center">
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
        <div className="rounded-3xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
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

      {repository ? (
        <RepositorySummary repository={repository} release={currentRelease} />
      ) : null}

      {hasOnlySourceAssets ? (
        <output
          className="flex items-start gap-3 rounded-3xl border border-border bg-muted/50 p-4 text-sm"
          aria-live="polite"
        >
          <Info
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-medium">Only source code is available</h2>
            <p className="mt-1 text-muted-foreground">
              No installer or binary was published for this release. Select a
              source archive manually if that is what you need.
            </p>
          </div>
        </output>
      ) : null}

      {currentRelease && status === 'ready' ? (
        <RecommendedAsset
          key={currentAsset?.id ?? currentRelease.id}
          asset={currentAsset}
          release={currentRelease}
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
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'min-h-11 w-full justify-between'
            )}
          >
            Choose another release or file
            <ChevronDown
              className="transition-transform group-data-panel-open:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 rounded-4xl bg-card p-4 shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10 sm:p-6">
            {advancedOpen ? (
              <Suspense
                fallback={
                  <output
                    className="block py-6 text-center text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    Loading release and asset selectors…
                  </output>
                }
              >
                <AdvancedSelection
                  releases={releases}
                  currentRelease={currentRelease}
                  selectedReleaseId={selectedReleaseId}
                  selectedAssetId={selectedAssetId}
                  recommendation={recommendation}
                  onSelectRelease={selectRelease}
                  onSelectAsset={selectAsset}
                />
              </Suspense>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
