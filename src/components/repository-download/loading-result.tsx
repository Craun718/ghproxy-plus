import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingResult() {
  return (
    <Card aria-busy="true" aria-label="Loading repository releases">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
      <output className="sr-only" aria-live="polite">
        Loading repository and release assets…
      </output>
    </Card>
  );
}
