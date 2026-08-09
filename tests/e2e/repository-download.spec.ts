import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const repositoryResponse = {
  repository: {
    owner: 'owner',
    name: 'repo',
    fullName: 'owner/repo',
    description: 'A repository used by the end-to-end test.',
    url: 'https://github.com/owner/repo',
    defaultBranch: 'main'
  },
  releases: [
    {
      id: 'release-2',
      name: 'Version 2',
      tagName: 'v2.0.0',
      publishedAt: '2026-08-01T00:00:00Z',
      prerelease: false,
      assets: [
        {
          id: 'asset-windows',
          name: 'app-windows-x64.zip',
          downloadUrl:
            'https://github.com/owner/repo/releases/download/v2.0.0/app-windows-x64.zip',
          size: 1048576,
          downloadCount: 120,
          contentType: 'application/zip',
          kind: 'binary',
          format: 'zip',
          platform: 'windows',
          architecture: 'x64'
        },
        {
          id: 'asset-android',
          name: 'app-android-arm64.apk',
          downloadUrl:
            'https://github.com/owner/repo/releases/download/v2.0.0/app-android-arm64.apk',
          size: 2097152,
          downloadCount: 80,
          contentType: 'application/vnd.android.package-archive',
          kind: 'binary',
          format: 'apk',
          platform: 'android',
          architecture: 'arm64'
        },
        {
          id: 'asset-source',
          name: 'SourceCode-v2.0.0.zip',
          downloadUrl:
            'https://github.com/owner/repo/archive/refs/tags/v2.0.0.zip',
          size: null,
          downloadCount: null,
          contentType: 'application/zip',
          kind: 'source',
          format: 'zip',
          platform: null,
          architecture: null
        }
      ]
    },
    {
      id: 'release-1',
      name: 'Version 1',
      tagName: 'v1.0.0',
      publishedAt: '2026-07-01T00:00:00Z',
      prerelease: false,
      assets: [
        {
          id: 'asset-legacy',
          name: 'app-windows-x64-v1.zip',
          downloadUrl:
            'https://github.com/owner/repo/releases/download/v1.0.0/app-windows-x64-v1.zip',
          size: 524288,
          downloadCount: 30,
          contentType: 'application/zip',
          kind: 'binary',
          format: 'zip',
          platform: 'windows',
          architecture: 'x64'
        }
      ]
    }
  ]
};

async function mockRepositoryApi(page: Page) {
  await page.route('**/api/repos/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(repositoryResponse)
    })
  );
}

async function observeWebVitals(page: Page) {
  await page.addInitScript(() => {
    const metrics = { cls: 0, inp: 0, lcp: 0 };
    const metricsWindow = window as typeof window & {
      __testWebVitals: typeof metrics;
    };
    metricsWindow.__testWebVitals = metrics;

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.lcp = entry.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) metrics.cls += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const interaction = entry as PerformanceEntry & {
            duration: number;
            interactionId: number;
          };
          if (interaction.interactionId) {
            metrics.inp = Math.max(metrics.inp, interaction.duration);
          }
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch {
      // A missing observer type reports zero and remains covered by bundle/E2E gates.
    }
  });
}

test.beforeEach(async ({ page }) => {
  await mockRepositoryApi(page);
});

test('uses Semifold as the example and applies product titles', async ({
  page
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle('GitHub Proxy Plus');
  await expect(page.getByRole('link', { name: 'API Docs' })).toBeVisible();
  await page.getByRole('button', { name: 'noctisynth/semifold' }).click();
  await expect(page.getByLabel('GitHub repository')).toHaveValue(
    'noctisynth/semifold'
  );
});

test('keeps GitHub authentication optional and sends it in a header', async ({
  page
}) => {
  await page.goto('/');
  await expect(page.getByLabel('GitHub token')).toHaveCount(0);

  await page
    .getByRole('button', { name: 'Optional GitHub authentication' })
    .click();
  await page.getByLabel('GitHub token').fill('github_pat_e2e-token');
  await page.getByLabel('GitHub repository').fill('owner/repo');

  const requestPromise = page.waitForRequest('**/api/repos/**');
  await page.getByRole('button', { name: 'Find assets' }).click();
  const request = await requestPromise;

  expect(request.headers()['x-github-token']).toBe('github_pat_e2e-token');
  expect(request.url()).not.toContain('github_pat_e2e-token');
  await expect(page).not.toHaveURL(/github_pat_e2e-token/);
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
});

test('queries, switches assets, copies and restores URL state', async ({
  page
}) => {
  await observeWebVitals(page);
  await page.goto('/');
  await page.getByLabel('GitHub repository').fill('owner/repo');
  await page.getByRole('button', { name: 'Find assets' }).click();

  await expect(page.getByRole('link', { name: 'owner/repo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  await expect(page).toHaveURL(/repo=owner%2Frepo/);
  await expect(page).toHaveURL(/release=v2\.0\.0/);

  await page
    .getByRole('button', { name: 'Choose another release or file' })
    .click();
  await page.getByRole('button', { name: /SourceCode-v2\.0\.0\.zip/ }).click();

  await expect(page.getByText('Manual selection')).toBeVisible();
  await expect(page).toHaveURL(/asset=asset-source/);

  await page.getByRole('button', { name: 'Copy proxy link' }).click();
  await expect(page.getByText('Proxy link copied.')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(
      '/api/ghproxy/https://github.com/owner/repo/archive/refs/tags/v2.0.0.zip'
    );

  await page.reload();
  await expect(page.getByText('SourceCode-v2.0.0.zip').first()).toBeVisible();
  await expect(page.getByText('Manual selection')).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);

  await page.waitForTimeout(200);
  const webVitals = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __testWebVitals: { cls: number; inp: number; lcp: number };
        }
      ).__testWebVitals
  );
  expect(webVitals.lcp).toBeLessThan(2500);
  expect(webVitals.cls).toBeLessThan(0.1);
  expect(webVitals.inp).toBeLessThan(200);
});

test('starts the selected proxy download', async ({ page }) => {
  await page.route('**/api/ghproxy/**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'content-disposition': 'attachment; filename="app-download.zip"',
        'content-type': 'application/zip'
      },
      body: 'test download'
    })
  );
  await page.goto('/?repo=owner%2Frepo');
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('app-download.zip');
});

test('has no horizontal overflow at target breakpoints', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/?repo=owner%2Frepo');
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
    await page
      .getByRole('button', { name: 'Optional GitHub authentication' })
      .click();
    await expect(page.getByLabel('GitHub token')).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  }
});

test('supports the core keyboard path', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('GitHub repository');
  await input.focus();
  await page.keyboard.type('owner/repo');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Find assets' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  const advancedTrigger = page.getByRole('button', {
    name: 'Choose another release or file'
  });
  await advancedTrigger.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByLabel('Release')).toBeVisible();
});

test('loads API Markdown only on the lazy docs route', async ({ page }) => {
  const markdownRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.md')) markdownRequests.push(request.url());
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Find the right GitHub Release asset' })
  ).toBeVisible();
  expect(markdownRequests).toEqual([]);

  await page.goto('/docs');
  await expect(
    page.getByRole('heading', { name: 'ghproxy plus API' })
  ).toBeVisible();
  expect(markdownRequests).toHaveLength(1);
});
