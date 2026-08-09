import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import HomePage from '@/pages/home-page';
import './globals.css';

const DocsPage = lazy(() => import('@/pages/docs-page'));

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <output className="sr-only" aria-live="polite">
        Loading page…
      </output>
    </div>
  );
}

export function Main() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <main className="w-full flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <AppFooter />
      </div>
    </BrowserRouter>
  );
}
