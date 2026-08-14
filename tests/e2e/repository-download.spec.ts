import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

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

function createLargeRepositoryResponse() {
  return {
    ...repositoryResponse,
    releases: Array.from({ length: 36 }, (_, releaseIndex) => {
      const version = 36 - releaseIndex;
      return {
        id: `release-${version}`,
        name: version === 17 ? 'Nightly Search Target' : `Version ${version}`,
        tagName: `v${version}.0.0`,
        publishedAt: '2026-08-01T00:00:00Z',
        prerelease: false,
        assets: Array.from({ length: 28 }, (_, assetIndex) => ({
          id: `asset-${version}-${assetIndex}`,
          name:
            assetIndex === 23
              ? `tool-v${version}-linux-arm64-search-target.tar.gz`
              : `tool-v${version}-windows-x64-${assetIndex}.zip`,
          downloadUrl: `https://github.com/owner/repo/releases/download/v${version}.0.0/tool-${assetIndex}.zip`,
          size: 1048576 + assetIndex,
          downloadCount: assetIndex * 10,
          contentType: 'application/octet-stream',
          kind: 'binary',
          format: assetIndex === 23 ? 'tar.gz' : 'zip',
          platform: assetIndex === 23 ? 'linux' : 'windows',
          architecture: assetIndex === 23 ? 'arm64' : 'x64'
        }))
      };
    })
  };
}

function toGitHubReleases(response: typeof repositoryResponse) {
  return response.releases.map((release) => ({
    id: release.id,
    name: release.name,
    tag_name: release.tagName,
    published_at: release.publishedAt,
    prerelease: release.prerelease,
    assets: release.assets
      .filter((asset) => asset.kind !== 'source')
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        browser_download_url: asset.downloadUrl,
        size: asset.size,
        download_count: asset.downloadCount,
        content_type: asset.contentType
      }))
  }));
}

async function mockGitHubApi(
  page: Page,
  response: typeof repositoryResponse = repositoryResponse
) {
  await page.route('https://api.github.com/repos/**', (route) => {
    const corsHeaders = {
      'access-control-allow-headers':
        'Accept, Authorization, X-GitHub-Api-Version',
      'access-control-allow-methods': 'GET',
      'access-control-allow-origin': '*'
    };

    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    const requestUrl = new URL(route.request().url());
    const isReleasesRequest = requestUrl.pathname.endsWith('/releases');
    const body = isReleasesRequest
      ? toGitHubReleases(response)
      : {
          name: response.repository.name,
          full_name: response.repository.fullName,
          owner: { login: response.repository.owner, avatar_url: '' },
          default_branch: response.repository.defaultBranch,
          description: response.repository.description,
          html_url: response.repository.url
        };

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(body)
    });
  });
}

async function ensureAdvancedSelectionOpen(page: Page) {
  const trigger = page.getByRole('button', {
    name: 'Choose another release or file'
  });
  await expect(trigger).toBeVisible();

  const combobox = page.getByRole('combobox', { name: 'Release', exact: true });

  // The auto-expand effect fires when the repository resolves with no
  // auto-selected asset (e.g. no platform match on mobile). Wait briefly for
  // it to settle so we don't read a stale aria-expanded and toggle the
  // collapsible closed while the effect is concurrently opening it.
  const autoOpened = await combobox
    .waitFor({ state: 'visible', timeout: 2_000 })
    .then(() => true)
    .catch(() => false);

  if (!autoOpened) {
    await trigger.click();
  }
  await expect(combobox).toBeVisible({ timeout: 20_000 });
}

async function expectInlineAddonPlacement(
  input: Locator,
  options: { hasInlineEnd?: boolean } = {}
) {
  const inputGroup = input.locator('..');
  const inlineStart = inputGroup.locator('[data-align="inline-start"]');
  const [inputBox, inlineStartBox] = await Promise.all([
    input.boundingBox(),
    inlineStart.boundingBox()
  ]);

  if (!inputBox || !inlineStartBox) {
    throw new Error('Input Group control and inline-start addon must render.');
  }

  await expect(inlineStart).toHaveCSS('order', '-9999');
  expect(inlineStartBox.x + inlineStartBox.width).toBeLessThanOrEqual(
    inputBox.x
  );

  if (!options.hasInlineEnd) return;

  const inlineEnd = inputGroup.locator('[data-align="inline-end"]');
  const inlineEndBox = await inlineEnd.boundingBox();
  if (!inlineEndBox) {
    throw new Error('Input Group inline-end addon must render.');
  }

  await expect(inlineEnd).toHaveCSS('order', '9999');
  expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(inlineEndBox.x);
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
  await mockGitHubApi(page);
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

test('keeps GitHub authentication optional and sends it only to GitHub', async ({
  page
}) => {
  const workerRepositoryRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/repos/')) {
      workerRepositoryRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.getByLabel('GitHub token')).toHaveCount(0);

  await page.getByRole('button', { name: /Use a GitHub token/ }).click();
  const tokenInput = page.getByLabel('GitHub token');
  await expect(tokenInput).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show token' }).click();
  await expect(tokenInput).toHaveAttribute('type', 'text');
  await tokenInput.fill('github_pat_e2e-token');
  await page.getByLabel('GitHub repository').fill('owner/repo');

  const requestPromises = [
    page.waitForRequest(
      (request) =>
        request.method() === 'GET' &&
        request.url() === 'https://api.github.com/repos/owner/repo'
    ),
    page.waitForRequest(
      (request) =>
        request.method() === 'GET' &&
        request.url() ===
          'https://api.github.com/repos/owner/repo/releases?per_page=100'
    )
  ];
  await page.getByRole('button', { name: 'Find assets' }).click();
  const requests = await Promise.all(requestPromises);

  for (const request of requests) {
    expect(request.headers().authorization).toBe('Bearer github_pat_e2e-token');
    expect(request.headers()['x-github-token']).toBeUndefined();
    expect(request.url()).not.toContain('github_pat_e2e-token');
  }
  expect(workerRepositoryRequests).toEqual([]);
  await expect(page).not.toHaveURL(/github_pat_e2e-token/);
  await expect(page).toHaveURL(/\/download\?repo=owner%2Frepo/);
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
});

test('returns a direct result error to a prefilled token retry form', async ({
  page
}) => {
  await page.unroute('https://api.github.com/repos/**');
  await page.route('https://api.github.com/repos/**', (route) => {
    const corsHeaders = {
      'access-control-allow-headers':
        'Accept, Authorization, X-GitHub-Api-Version',
      'access-control-allow-methods': 'GET',
      'access-control-allow-origin': '*'
    };

    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    return route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ message: 'GitHub rate limit reached.' })
    });
  });

  await page.goto('/download?repo=owner%2Frepo');
  await expect(page.getByRole('alert')).toContainText(
    'GitHub rate limit reached'
  );
  await page
    .getByRole('link', { name: 'Try again from the search page' })
    .click();

  await expect(page).toHaveURL(/\/?repo=owner%2Frepo/);
  await expect(page.getByLabel('GitHub repository')).toHaveValue('owner/repo');
  await expect(page.getByLabel('GitHub token')).toBeVisible();
});

test('queries, switches assets, copies and restores URL state', async ({
  page
}) => {
  test.setTimeout(60_000);
  await observeWebVitals(page);
  await page.goto('/');
  await page.getByLabel('GitHub repository').fill('owner/repo');
  await page.getByRole('button', { name: 'Find assets' }).click();

  await expect(page).toHaveURL(/\/download\?repo=owner%2Frepo/);
  await expect(page.getByRole('link', { name: 'owner/repo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  await expect(page).toHaveURL(/repo=owner%2Frepo/);
  await expect(page).toHaveURL(/release=v2\.0\.0/);

  await ensureAdvancedSelectionOpen(page);
  const assetInput = page.getByRole('combobox', {
    name: 'Asset',
    exact: true
  });
  await assetInput.fill('SourceCode-v2.0.0.zip');
  await page.getByRole('option', { name: /SourceCode-v2\.0\.0\.zip/ }).click();

  await expect(page.getByText('Manual selection')).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('asset'))
    .toBe('release-2:3:SourceCode-v2.0.0.zip');

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

test('starts the selected proxy download and keeps feedback outside the card', async ({
  page
}) => {
  await page.route('**/api/ghproxy/**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'content-disposition': `attachment; filename="app-download.zip"; filename*=UTF-8''app-%E6%B5%8B%E8%AF%95.zip`,
        'content-type': 'application/zip'
      },
      body: 'test download'
    })
  );
  await page.goto('/?repo=owner%2Frepo');
  await expect(page).toHaveURL(/\/download\?repo=owner%2Frepo/);
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('app-测试.zip');

  const feedback = page.getByText(
    'Download started. If it was blocked, try copying the link.'
  );
  await expect(feedback).toBeVisible();
  await expect(
    page.locator('[data-slot="card"]').first().locator('output')
  ).toHaveCount(0);

  const downloadBox = await page
    .getByRole('button', { name: 'Download' })
    .boundingBox();
  const feedbackBox = await feedback.boundingBox();
  if (!downloadBox || !feedbackBox) {
    throw new Error('Download action and feedback must have layout boxes.');
  }

  expect(feedbackBox.y).toBeGreaterThan(downloadBox.y + downloadBox.height - 1);
});

test('filters large release and asset collections without leaking search state', async ({
  page
}) => {
  await page.unroute('https://api.github.com/repos/**');
  await mockGitHubApi(page, createLargeRepositoryResponse());
  await page.goto('/download?repo=owner%2Frepo');
  await ensureAdvancedSelectionOpen(page);

  const releaseInput = page.getByRole('combobox', {
    name: 'Release',
    exact: true
  });
  await releaseInput.fill('Nightly Search Target');
  await expect(
    page.getByRole('option', { name: /Nightly Search Target/ })
  ).toBeVisible();
  await releaseInput.press('Enter');
  await expect(page).toHaveURL(/release=v17\.0\.0/);

  const assetInput = page.getByRole('combobox', {
    name: 'Asset',
    exact: true
  });
  await assetInput.fill('linux-arm64-search-target');
  await expect(
    page.getByRole('option', { name: /linux-arm64-search-target/ })
  ).toBeVisible();
  await assetInput.press('Enter');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('asset'))
    .toBe('release-17:asset-17-23:tool-v17-linux-arm64-search-target.tar.gz');
  const selectedSearchParams = new URL(page.url()).searchParams;
  expect(selectedSearchParams.has('search')).toBe(false);
  expect(selectedSearchParams.has('query')).toBe(false);

  const selectedUrl = page.url();
  await assetInput.fill('no-matching-asset');
  await expect(page.getByText('No assets match your search.')).toBeVisible();
  expect(page.url()).toBe(selectedUrl);
});

test('keeps both combobox popups within a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.unroute('https://api.github.com/repos/**');
  await mockGitHubApi(page, createLargeRepositoryResponse());
  await page.goto('/download?repo=owner%2Frepo');
  await ensureAdvancedSelectionOpen(page);

  for (const input of [
    page.getByRole('combobox', { name: 'Release', exact: true }),
    page.getByRole('combobox', { name: 'Asset', exact: true })
  ]) {
    await input.click();
    const popup = page.locator('[data-slot="combobox-content"][data-open]');
    await expect(popup).toBeVisible();
    const box = await popup.boundingBox();
    if (!box) throw new Error('Combobox popup must have a layout box.');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="combobox-content"]')).toHaveCount(0);
  }

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
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
    await page.goto('/');
    await page.getByRole('button', { name: /Use a GitHub token/ }).click();
    await expect(page.getByLabel('GitHub token')).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);

    await page.goto('/download?repo=owner%2Frepo');
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);

    const overviewBox = await page
      .locator('[data-slot="card-title"]')
      .first()
      .boundingBox();
    const attributeBox = await page
      .getByText('Platform', { exact: true })
      .boundingBox();
    if (!overviewBox || !attributeBox) {
      throw new Error(
        'Recommended asset overview and attributes must have layout.'
      );
    }

    if (viewport.width >= 1024) {
      expect(attributeBox.x).toBeGreaterThanOrEqual(
        overviewBox.x + overviewBox.width
      );
    } else {
      expect(attributeBox.x).toBeLessThanOrEqual(overviewBox.x + 1);
      expect(attributeBox.y).toBeGreaterThan(
        overviewBox.y + overviewBox.height - 1
      );
    }
  }
});

test('keeps advanced selectors side by side on desktop and stacked on mobile', async ({
  page
}) => {
  for (const viewport of [
    { width: 1024, height: 800 },
    { width: 320, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/download?repo=owner%2Frepo');
    await ensureAdvancedSelectionOpen(page);

    const releaseBox = await page
      .getByRole('combobox', { name: 'Release', exact: true })
      .boundingBox();
    const assetBox = await page
      .getByRole('combobox', { name: 'Asset', exact: true })
      .boundingBox();

    if (!releaseBox || !assetBox) {
      throw new Error('Release and Asset comboboxes must have layout boxes.');
    }

    if (viewport.width >= 1024) {
      expect(assetBox.x).toBeGreaterThanOrEqual(
        releaseBox.x + releaseBox.width - 1
      );
    } else {
      expect(assetBox.y).toBeGreaterThan(releaseBox.y + releaseBox.height - 1);
    }
  }
});

test('keeps input group addons on their declared inline edges', async ({
  page
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 320, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expectInlineAddonPlacement(page.getByLabel('GitHub repository'));

    await page.getByRole('button', { name: /Use a GitHub token/ }).click();
    await expectInlineAddonPlacement(page.getByLabel('GitHub token'), {
      hasInlineEnd: true
    });
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

  await expect(page).toHaveURL(/\/download\?repo=owner%2Frepo/);
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  const advancedTrigger = page.getByRole('button', {
    name: 'Choose another release or file'
  });
  await advancedTrigger.focus();
  await page.keyboard.press('Enter');

  const releaseInput = page.getByRole('combobox', {
    name: 'Release',
    exact: true
  });
  await expect(releaseInput).toBeVisible();
  await releaseInput.focus();
  await releaseInput.press('ControlOrMeta+A');
  await page.keyboard.type('v1.0.0');
  await expect(page.getByRole('option', { name: /Version 1/ })).toBeVisible();
  await releaseInput.press('Enter');
  await expect(page).toHaveURL(/release=v1\.0\.0/);

  const assetInput = page.getByRole('combobox', {
    name: 'Asset',
    exact: true
  });
  await assetInput.focus();
  await assetInput.press('ControlOrMeta+A');
  await page.keyboard.type('windows-x64-v1');
  await expect(
    page.getByRole('option', { name: /app-windows-x64-v1\.zip/ })
  ).toBeVisible();
  await assetInput.press('Enter');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('asset'))
    .toBe('release-1:asset-legacy:app-windows-x64-v1.zip');
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
  await expect(
    page.getByText('curl http://127.0.0.1:3000/api/ping')
  ).toBeVisible();
  await expect(page.getByText('[host]')).toHaveCount(0);
  expect(markdownRequests).toHaveLength(1);
});
