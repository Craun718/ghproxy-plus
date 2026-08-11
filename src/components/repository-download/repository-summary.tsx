import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type {
  RepositoryRelease,
  RepositorySummary as RepositorySummaryType
} from '@/models/repository-download-types';

interface RepositorySummaryProps {
  repository: RepositorySummaryType;
  release: RepositoryRelease | null;
}

export function RepositorySummary({
  repository,
  release
}: RepositorySummaryProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-semibold hover:text-primary"
          >
            {repository.fullName}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <p className="max-w-2xl text-muted-foreground">
            {repository.description || 'No repository description provided.'}
          </p>
        </div>
        {release ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="secondary">{release.tagName}</Badge>
            {release.prerelease ? (
              <Badge variant="outline">Pre-release</Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {formatDate(release.publishedAt)}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
