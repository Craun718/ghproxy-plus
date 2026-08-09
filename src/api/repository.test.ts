import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { repositoryApi } from './repository';

function createApp() {
  const app = new Hono();
  app.get('/api/repos/:owner/:repo/releases', repositoryApi);
  return app;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('repository API', () => {
  it('falls back to source archives from the default branch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith('/releases?per_page=100')) {
          return Promise.resolve(Response.json([]));
        }
        return Promise.resolve(
          Response.json({
            name: 'fallback-repo',
            full_name: 'fallback-owner/fallback-repo',
            owner: { login: 'fallback-owner', avatar_url: '' },
            default_branch: 'main',
            description: null,
            html_url: 'https://github.com/fallback-owner/fallback-repo'
          })
        );
      })
    );

    const response = await createApp().request(
      '/api/repos/fallback-owner/fallback-repo/releases'
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.releases).toHaveLength(1);
    expect(payload.releases[0].tagName).toBe('main');
    expect(
      payload.releases[0].assets.map((asset: { kind: string }) => asset.kind)
    ).toEqual(['source', 'source']);
  });

  it('maps a missing GitHub repository to a stable error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: 'Not Found' },
            { status: 404, statusText: 'Not Found' }
          )
        )
    );

    const response = await createApp().request(
      '/api/repos/missing-owner/missing-repo/releases'
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe('not-found');
  });

  it('forwards a temporary token without using the shared GitHub cache', async () => {
    const fetchMock = vi.fn(
      (input: string | URL | Request, _requestInit?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/releases?per_page=100')) {
          return Promise.resolve(Response.json([]));
        }
        return Promise.resolve(
          Response.json({
            name: 'token-repo',
            full_name: 'token-owner/token-repo',
            owner: { login: 'token-owner', avatar_url: '' },
            default_branch: 'main',
            description: null,
            html_url: 'https://github.com/token-owner/token-repo'
          })
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = () =>
      createApp().request('/api/repos/token-owner/token-repo/releases', {
        headers: { 'X-GitHub-Token': 'github_pat_test-token' }
      });
    const firstResponse = await request();
    await request();

    expect(firstResponse.headers.get('cache-control')).toBe(
      'private, no-store'
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, requestInit] of fetchMock.mock.calls) {
      expect(new Headers(requestInit?.headers).get('authorization')).toBe(
        'Bearer github_pat_test-token'
      );
    }
  });

  it('maps rejected credentials without exposing the token', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: 'Bad credentials' },
            { status: 401, statusText: 'Unauthorized' }
          )
        )
    );

    const response = await createApp().request(
      '/api/repos/rejected-owner/rejected-repo/releases',
      { headers: { 'X-GitHub-Token': 'github_pat_secret-value' } }
    );
    const responseText = await response.text();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(JSON.parse(responseText).error.code).toBe('invalid-token');
    expect(responseText).not.toContain('github_pat_secret-value');
  });
});
