import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiDocumentationUrl from '@/assets/api.md';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocsPage() {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    fetch(apiDocumentationUrl, { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Documentation request failed.');
        return response.text();
      })
      .then(setContent)
      .catch((loadError: unknown) => {
        if (
          loadError instanceof DOMException &&
          loadError.name === 'AbortError'
        ) {
          return;
        }
        setError('The API documentation could not be loaded. Please retry.');
      });

    return () => abortController.abort();
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link to="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft aria-hidden="true" />
        Back to downloads
      </Link>
      <article className="mt-5 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10 sm:p-8">
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        {!content && !error ? (
          <output
            className="block space-y-4"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">Loading API documentation…</span>
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-32 w-full" />
          </output>
        ) : null}
        {content ? <MarkdownRenderer content={content} /> : null}
      </article>
    </div>
  );
}
