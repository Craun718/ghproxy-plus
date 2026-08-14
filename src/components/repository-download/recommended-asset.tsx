import {
  Check,
  Clipboard,
  Download,
  ExternalLink,
  FileQuestion,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { formatBytes, formatDate, titleCase } from '@/lib/utils';
import type {
  AssetRecommendation,
  RepositoryAsset,
  RepositoryRelease,
  RepositorySummary
} from '@/models/repository-download-types';

interface RecommendedAssetProps {
  asset: RepositoryAsset | null;
  release: RepositoryRelease;
  repository: RepositorySummary;
  recommendation: AssetRecommendation | null;
  proxyPath: string | null;
  isManualSelection: boolean;
}

type ActionFeedback =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | null;

function getProxyUrl(proxyPath: string): string {
  return new URL(proxyPath, window.location.origin).toString();
}

function RepositoryContext({
  repository,
  release
}: {
  repository: RepositorySummary;
  release: RepositoryRelease;
}) {
  return (
    <CardHeader className="border-b pb-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
          >
            {repository.fullName}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {repository.description || 'No repository description provided.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{release.tagName}</Badge>
          {release.prerelease ? (
            <Badge variant="outline">Pre-release</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatDate(release.publishedAt)}
          </span>
        </div>
      </div>
    </CardHeader>
  );
}

export function RecommendedAsset({
  asset,
  release,
  repository,
  recommendation,
  proxyPath,
  isManualSelection
}: RecommendedAssetProps) {
  const [feedback, setFeedback] = useState<ActionFeedback>(null);
  const hasOnlySourceAssets =
    release.assets.some((item) => item.kind === 'source') &&
    !release.assets.some((item) => item.kind === 'binary');

  const handleDownload = () => {
    if (!proxyPath) return;

    try {
      const link = document.createElement('a');
      link.href = getProxyUrl(proxyPath);
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        kind: 'success',
        message: 'Download started. If it was blocked, try copying the link.'
      });
    } catch {
      setFeedback({
        kind: 'error',
        message:
          'The download could not be started. Copy the proxy link instead.'
      });
    }
  };

  const handleCopy = async () => {
    if (!proxyPath) return;

    try {
      await navigator.clipboard.writeText(getProxyUrl(proxyPath));
      setFeedback({ kind: 'success', message: 'Proxy link copied.' });
    } catch {
      setFeedback({
        kind: 'error',
        message:
          'Clipboard access was denied. Check browser permissions and retry.'
      });
    }
  };

  if (!asset || !proxyPath) {
    return (
      <Card size="sm" className="ring-border/80">
        <RepositoryContext repository={repository} release={release} />
        <CardHeader className="pt-0">
          <div className="flex items-start gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <FileQuestion
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 space-y-0.5">
              <CardTitle>No automatic match</CardTitle>
              <CardDescription>
                {recommendation?.reasons[0] ||
                  'This release does not contain a reliably matched asset.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            {hasOnlySourceAssets ? (
              <div>
                <h2 className="font-medium">Only source code is available</h2>
                <p className="mt-0.5 text-muted-foreground">
                  No installer or binary was published for this release. Select
                  a source archive manually if that is what you need.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Review the files below and select one before downloading. No
                file has been chosen for you.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidence = isManualSelection
    ? 'Manual selection'
    : recommendation?.confidence === 'exact'
      ? 'Exact match'
      : 'Likely match';

  return (
    <>
      <Card size="sm" className="ring-primary/30">
        <RepositoryContext repository={repository} release={release} />
        <div className="flex min-w-0 flex-col gap-(--card-spacing) lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-x-(--card-spacing)">
          <CardHeader className="lg:pr-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <Badge variant={isManualSelection ? 'outline' : 'default'}>
                {confidence}
              </Badge>
            </div>
            <CardTitle className="break-all">{asset.name}</CardTitle>
            <CardDescription>
              {isManualSelection
                ? 'You selected this file manually.'
                : recommendation?.reasons.join(' · ') ||
                  'Recommended release asset'}
            </CardDescription>
          </CardHeader>
          <CardContent className="lg:pl-0">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Platform</dt>
                <dd className="mt-1 font-medium">
                  {titleCase(asset.platform)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Architecture</dt>
                <dd className="mt-1 font-medium">
                  {titleCase(asset.architecture)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Format</dt>
                <dd className="mt-1 font-medium">{titleCase(asset.format)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="mt-1 font-medium">{formatBytes(asset.size)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Release</dt>
                <dd className="mt-1 font-medium">{release.tagName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Published</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(release.publishedAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </div>
        <CardFooter className="flex-col items-stretch border-t">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              className="min-h-11 flex-1"
              onClick={handleDownload}
            >
              <Download aria-hidden="true" />
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 flex-1"
              onClick={handleCopy}
            >
              <Clipboard aria-hidden="true" />
              Copy proxy link
            </Button>
          </div>
        </CardFooter>
      </Card>
      {feedback ? (
        <output
          className={`flex w-full items-start gap-2 text-sm ${
            feedback.kind === 'error' ? 'text-destructive' : 'text-foreground'
          }`}
          role={feedback.kind === 'error' ? 'alert' : undefined}
          aria-live={feedback.kind === 'success' ? 'polite' : undefined}
        >
          {feedback.kind === 'error' ? (
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Check
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          )}
          {feedback.message}
        </output>
      ) : null}
    </>
  );
}
