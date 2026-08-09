import {
  Check,
  Clipboard,
  Download,
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
  RepositoryRelease
} from '@/models/repository-download-types';

interface RecommendedAssetProps {
  asset: RepositoryAsset | null;
  release: RepositoryRelease;
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

export function RecommendedAsset({
  asset,
  release,
  recommendation,
  proxyPath,
  isManualSelection
}: RecommendedAssetProps) {
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

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
      <Card className="ring-border/80">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
            <FileQuestion
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <CardTitle className="text-lg">No automatic match</CardTitle>
          <CardDescription>
            {recommendation?.reasons[0] ||
              'This release does not contain a reliably matched asset.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Review the files below and select one before downloading. No file
            has been chosen for you.
          </p>
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
    <Card className="ring-primary/30">
      <CardHeader>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <Badge variant={isManualSelection ? 'outline' : 'default'}>
            {confidence}
          </Badge>
        </div>
        <CardTitle className="break-all text-lg">{asset.name}</CardTitle>
        <CardDescription>
          {isManualSelection
            ? 'You selected this file manually.'
            : recommendation?.reasons.join(' · ') ||
              'Recommended release asset'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Platform</dt>
            <dd className="mt-1 font-medium">{titleCase(asset.platform)}</dd>
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
      <CardFooter className="flex-col items-stretch gap-3 border-t sm:flex-row">
        <Button size="lg" className="min-h-11 flex-1" onClick={handleDownload}>
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
        {feedback ? (
          <output
            className={`flex items-start gap-2 text-sm sm:basis-full ${
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
      </CardFooter>
    </Card>
  );
}
