import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepositoryDownloadModel } from '@/models/repository-download-model';
import DownloadPage from './download-page';
import HomePage from './home-page';

const repository = {
  name: 'repo',
  full_name: 'owner/repo',
  owner: { login: 'owner', avatar_url: '' },
  default_branch: 'main',
  description: 'A test repository',
  html_url: 'https://github.com/owner/repo'
};

function mockGitHubRepository(
  releases: Array<{
    id: string;
    name: string;
    tag_name: string;
    assets: Array<{
      id: string;
      name: string;
      browser_download_url: string;
      size: number;
      download_count: number;
      content_type: string;
    }>;
  }>
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) =>
      Promise.resolve(
        Response.json(
          String(input).endsWith('/releases?per_page=100')
            ? releases
            : repository
        )
      )
    )
  );
}

function mockGitHubRateLimit() {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { message: 'GitHub rate limit reached.' },
          { status: 429, statusText: 'GitHub error' }
        )
      )
  );
}

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/download" element={<DownloadPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useRepositoryDownloadModel.getState().reset();
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DownloadPage', () => {
  it('loads a shared result URL directly', async () => {
    mockGitHubRepository([
      {
        id: 'release-1',
        name: 'Version 1',
        tag_name: 'v1.0.0',
        assets: [
          {
            id: 'asset-windows',
            name: 'app-windows-x64.zip',
            browser_download_url:
              'https://github.com/owner/repo/releases/download/v1.0.0/app-windows-x64.zip',
            size: 1024,
            download_count: 10,
            content_type: 'application/zip'
          }
        ]
      }
    ]);
    renderApp(
      '/download?repo=owner%2Frepo&release=v1.0.0&asset=release-1%3Aasset-windows%3Aapp-windows-x64.zip'
    );

    expect(await screen.findByText('app-windows-x64.zip')).toBeInTheDocument();
    const backLink = screen.getByRole('link', {
      name: 'Search another repository'
    });
    const heading = screen.getByRole('heading', { name: 'Release assets' });
    expect(
      backLink.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.getByRole('link', { name: 'owner/repo' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('returns to the search page when the result URL has no repository', async () => {
    renderApp('/download');

    expect(
      await screen.findByRole('heading', {
        name: 'Find the right GitHub Release asset'
      })
    ).toBeInTheDocument();
  });

  it('explains source-only results without offering an automatic download', async () => {
    mockGitHubRepository([
      {
        id: 'release-1',
        name: 'Version 1',
        tag_name: 'v1.0.0',
        assets: []
      }
    ]);
    renderApp('/download?repo=owner%2Frepo');

    expect(
      await screen.findByText('Only source code is available')
    ).toBeInTheDocument();
    expect(screen.getByText('No automatic match')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download' })
    ).not.toBeInTheDocument();
  });

  it('returns a rate-limited result to a prefilled token retry form', async () => {
    mockGitHubRateLimit();
    renderApp('/download?repo=owner%2Frepo');
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'GitHub rate limit reached'
    );
    await user.click(
      screen.getByRole('link', { name: 'Try again from the search page' })
    );

    expect(screen.getByLabelText('GitHub repository')).toHaveValue(
      'owner/repo'
    );
    expect(await screen.findByLabelText('GitHub token')).toBeVisible();
  });
});
