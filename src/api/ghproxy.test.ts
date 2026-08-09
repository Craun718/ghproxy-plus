import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDownloadContentDisposition, ghproxy } from './ghproxy';

function createApp() {
  const app = new Hono();
  app.on(['GET', 'HEAD'], '/api/ghproxy/*', ghproxy);
  return app;
}

function requestProxy(target: string, init?: RequestInit) {
  return createApp().request(`/api/ghproxy/${target}`, init);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHub proxy downloads', () => {
  it('forces a direct range response to use the original encoded filename', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('partial', {
        status: 206,
        headers: {
          'cache-control': 'public, max-age=60',
          'content-length': '7',
          'content-range': 'bytes 0-6/20',
          'content-type': 'application/octet-stream',
          etag: 'asset-etag'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestProxy(
      'https://github.com/owner/repo/releases/download/v1/release%20notes.zip',
      { headers: { Range: 'bytes=0-6' } }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="release notes.zip"; filename*=UTF-8''release%20notes.zip`
    );
    expect(response.headers.get('content-type')).toBe(
      'application/octet-stream'
    );
    expect(response.headers.get('content-length')).toBe('7');
    expect(response.headers.get('content-range')).toBe('bytes 0-6/20');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(response.headers.get('etag')).toBe('asset-etag');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      range: 'bytes=0-6'
    });
  });

  it('keeps the original Unicode filename across multiple CDN redirects', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: 'https://objects.githubusercontent.com/internal-object'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 307,
          headers: { location: 'https://cdn.example.test/generated-name' }
        })
      )
      .mockResolvedValueOnce(
        new Response('archive', {
          headers: { 'content-type': 'application/zip' }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestProxy(
      'https://github.com/owner/repo/releases/download/v1/artifact-%E6%B5%8B%E8%AF%95.zip'
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="artifact-__.zip"; filename*=UTF-8''artifact-%E6%B5%8B%E8%AF%95.zip`
    );
  });

  it('supports HEAD while preserving upstream download headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: {
          'content-length': '4096',
          'content-type': 'application/gzip'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestProxy(
      'https://github.com/owner/repo/archive/refs/tags/v1.0.0.tar.gz',
      { method: 'HEAD' }
    );

    expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('4096');
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="v1.0.0.tar.gz"; filename*=UTF-8''v1.0.0.tar.gz`
    );
    expect(await response.text()).toBe('');
  });

  it('sanitizes path separators, quotes, and header control characters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('asset', {
          headers: { 'content-type': 'application/octet-stream' }
        })
      )
    );

    const response = await requestProxy(
      'https://github.com/owner/repo/releases/download/v1/evil%22X-Test%3A%20owned..%5Cpayload.zip'
    );
    const disposition = response.headers.get('content-disposition');

    expect(disposition).toBe(
      `attachment; filename="evilX-Test_ owned.._payload.zip"; filename*=UTF-8''evilX-Test_%20owned.._payload.zip`
    );
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(response.headers.has('x-test')).toBe(false);
  });

  it('removes response-splitting characters from decoded filenames', () => {
    const disposition = createDownloadContentDisposition(
      'evil"\r\nX-Injected: yes.zip'
    );

    expect(disposition).toBe(
      `attachment; filename="evilX-Injected_ yes.zip"; filename*=UTF-8''evilX-Injected_%20yes.zip`
    );
    expect(disposition).not.toMatch(/[\r\n]/);
  });

  it('falls back safely when the original percent encoding is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('asset', {
          headers: { 'content-type': 'application/octet-stream' }
        })
      )
    );

    const response = await requestProxy(
      'https://github.com/owner/repo/releases/download/v1/broken%ZZ.zip'
    );

    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="download"; filename*=UTF-8''download`
    );
  });

  it('does not turn an upstream error into a download', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('missing', { status: 404 }))
    );

    const response = await requestProxy(
      'https://github.com/owner/repo/releases/download/v1/missing.zip'
    );

    expect(response.status).toBe(404);
    expect(response.headers.has('content-disposition')).toBe(false);
  });
});
