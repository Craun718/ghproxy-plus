import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepositoryDownloadModel } from '@/models/repository-download-model';
import type {
  RepositoryAsset,
  RepositoryRelease,
  RepositoryResponse
} from '@/models/repository-download-types';
import HomePage from './home-page';

function createAsset(
  id: string,
  name: string,
  kind: RepositoryAsset['kind'] = 'binary'
): RepositoryAsset {
  return {
    id,
    name,
    downloadUrl: `https://github.com/owner/repo/releases/download/v1/${name}`,
    size: 1024,
    downloadCount: 4,
    contentType: 'application/octet-stream',
    kind,
    format: 'zip',
    platform: kind === 'binary' ? 'windows' : null,
    architecture: kind === 'binary' ? 'x64' : null
  };
}

function createRelease(
  id: string,
  tagName: string,
  assets: RepositoryAsset[]
): RepositoryRelease {
  return {
    id,
    name: `Release ${tagName}`,
    tagName,
    publishedAt: '2026-01-01T00:00:00Z',
    prerelease: false,
    assets
  };
}

function createResponse(releases: RepositoryRelease[]): RepositoryResponse {
  return {
    repository: {
      owner: 'owner',
      name: 'repo',
      fullName: 'owner/repo',
      description: 'A test repository',
      url: 'https://github.com/owner/repo',
      defaultBranch: 'main'
    },
    releases
  };
}

function mockRepositoryResponse(response: RepositoryResponse) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
  );
}

function mockRepositoryError(status: number, code: string, message: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code, message } }), {
        status,
        headers: { 'content-type': 'application/json' }
      })
    )
  );
}

async function submitRepository() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('GitHub repository'), 'owner/repo');
  await user.click(screen.getByRole('button', { name: 'Find assets' }));
  return user;
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

describe('HomePage release states', () => {
  it('fills the Semifold repository from the idle example', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('button', { name: 'noctisynth/semifold' })
    );

    expect(screen.getByLabelText('GitHub repository')).toHaveValue(
      'noctisynth/semifold'
    );
  });

  it('reveals and masks the optional GitHub token on demand', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('button', { name: /Use a GitHub token/ })
    );
    const tokenInput = screen.getByLabelText('GitHub token');
    await user.type(tokenInput, 'github_pat_test-token');

    expect(tokenInput).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show token' }));
    expect(tokenInput).toHaveAttribute('type', 'text');
    expect(tokenInput).toHaveValue('github_pat_test-token');
    await user.click(screen.getByRole('button', { name: 'Hide token' }));
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('keeps one release actionable', async () => {
    mockRepositoryResponse(
      createResponse([
        createRelease('release-1', 'v1.0.0', [
          createAsset('asset-1', 'tool-windows-x64.zip')
        ])
      ])
    );
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await submitRepository();

    expect(await screen.findByText('tool-windows-x64.zip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('shows a dedicated state when no releases exist', async () => {
    mockRepositoryResponse(createResponse([]));
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await submitRepository();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No releases found'
    );
  });

  it('makes every release available in advanced selection', async () => {
    mockRepositoryResponse(
      createResponse([
        createRelease('release-2', 'v2.0.0', [
          createAsset('asset-2', 'tool-windows-x64.zip')
        ]),
        createRelease('release-1', 'v1.0.0', [
          createAsset('asset-1', 'tool-windows-x64.zip')
        ])
      ])
    );
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const user = await submitRepository();
    await screen.findByRole('button', { name: 'Download' });
    await user.click(
      screen.getByRole('button', { name: 'Choose another release or file' })
    );

    expect(
      await screen.findByText(/All 2 releases are available/)
    ).toBeInTheDocument();
  });

  it('explains source-only releases without auto-selecting a file', async () => {
    mockRepositoryResponse(
      createResponse([
        createRelease('release-1', 'main', [
          createAsset('source-1', 'SourceCode-main.zip', 'source')
        ])
      ])
    );
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await submitRepository();

    expect(
      await screen.findByText('Only source code is available')
    ).toBeInTheDocument();
    expect(screen.getByText('No automatic match')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download' })
    ).not.toBeInTheDocument();
  });

  it('shows a dedicated empty-asset state', async () => {
    mockRepositoryResponse(
      createResponse([createRelease('release-1', 'v1.0.0', [])])
    );
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await submitRepository();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No assets in this release'
    );
  });

  it('keeps authentication optional until GitHub rate limits a query', async () => {
    mockRepositoryError(
      429,
      'rate-limit',
      'GitHub rate limit reached. Add a token and retry.'
    );
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.queryByLabelText('GitHub token')).not.toBeInTheDocument();
    await submitRepository();

    expect(await screen.findByLabelText('GitHub token')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'GitHub rate limit reached'
    );
  });
});
