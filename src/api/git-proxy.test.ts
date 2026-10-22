import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../api';

const repositoryUrl = 'https://github.com/owner/repo.git';
const proxyUrl = `/api/ghproxy/${repositoryUrl}`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Git Smart HTTP proxy', () => {
  it.each([undefined, 'version=2'])(
    'forwards ref discovery with protocol %s and preserves the advertisement',
    async (protocol) => {
      const advertisement = '001e# service=git-upload-pack\n0000';
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(advertisement, {
          headers: {
            'content-type': 'application/x-git-upload-pack-advertisement',
            'cache-control': 'no-cache'
          }
        })
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = await app.request(
        `${proxyUrl}/info/refs?service=git-upload-pack`,
        { headers: protocol ? { 'Git-Protocol': protocol } : {} }
      );

      expect(fetchMock).toHaveBeenCalledWith(
        `${repositoryUrl}/info/refs?service=git-upload-pack`,
        expect.objectContaining({
          method: 'GET',
          body: null,
          headers: protocol ? { 'git-protocol': protocol } : {}
        })
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/x-git-upload-pack-advertisement'
      );
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.has('content-disposition')).toBe(false);
      expect(await response.text()).toBe(advertisement);
    }
  );

  it.each([undefined, 'application/x-git-upload-pack-request'])(
    'forwards binary request and pack bytes unchanged with content type %s',
    async (contentType) => {
      const requestBytes = new Uint8Array([0x30, 0x00, 0x80, 0xff, 0x0a]);
      const packBytes = new Uint8Array([0x50, 0x41, 0x43, 0x4b, 0x00, 0xff]);
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(packBytes, {
          headers: { 'content-type': 'application/x-git-upload-pack-result' }
        })
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = await app.request(`${proxyUrl}/git-upload-pack`, {
        method: 'POST',
        headers: {
          'Git-Protocol': 'version=2',
          ...(contentType ? { 'Content-Type': contentType } : {})
        },
        body: requestBytes.buffer
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [target, init] = fetchMock.mock.calls[0];
      expect(target).toBe(`${repositoryUrl}/git-upload-pack`);
      expect(init.method).toBe('POST');
      expect(init.headers['git-protocol']).toBe('version=2');
      expect(init.headers['content-type']).toBe(contentType);
      expect(init.body).toBeInstanceOf(ArrayBuffer);
      expect(new Uint8Array(init.body)).toEqual(requestBytes);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/x-git-upload-pack-result'
      );
      expect(response.headers.has('content-disposition')).toBe(false);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(packBytes);
    }
  );

  it('removes proxy host and connection headers while preserving compressed Git requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('0000'));
    vi.stubGlobal('fetch', fetchMock);

    await app.request(`${proxyUrl}/git-upload-pack`, {
      method: 'POST',
      headers: {
        Host: 'proxy.example.com',
        Connection: 'keep-alive, X-Connection-Only',
        'X-Connection-Only': 'local',
        'Keep-Alive': 'timeout=5',
        'Transfer-Encoding': 'chunked',
        'Content-Length': '4',
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/x-git-upload-pack-request',
        'Git-Protocol': 'version=2'
      },
      body: new Uint8Array([0x1f, 0x8b, 0x80, 0xff]).buffer
    });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'content-encoding': 'gzip',
      'content-type': 'application/x-git-upload-pack-request',
      'git-protocol': 'version=2'
    });
  });

  it.each(['GET', 'HEAD'])(
    'does not attach a body to %s even with a content type header',
    async (method) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null));
      vi.stubGlobal('fetch', fetchMock);

      const response = await app.request(
        `${proxyUrl}/info/refs?service=git-upload-pack`,
        {
          method,
          headers: { 'Content-Type': 'application/x-git-upload-pack-request' }
        }
      );

      expect(response.status).toBe(200);
      expect(fetchMock.mock.calls[0][1].body).toBeNull();
    }
  );

  it.each([
    ['GET', '/info/refs?service=git-upload-pack'],
    ['POST', '/git-upload-pack']
  ])(
    'does not treat Git traffic under an archive owner as a file: %s',
    async (method, path) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('0000')));

      const response = await app.request(
        `/api/ghproxy/https://github.com/archive/repo.git${path}`,
        { method }
      );

      expect(response.status).toBe(200);
      expect(response.headers.has('content-disposition')).toBe(false);
    }
  );

  it.each([
    ['/git-receive-pack', 'POST', 400],
    ['/info/refs?service=git-receive-pack', 'GET', 403],
    ['/info/refs?service=git-upload-pack', 'POST', 405],
    ['/git-upload-pack/extra', 'POST', 400],
    ['/releases/download/v1/asset.zip', 'POST', 405],
    ['/archive/refs/heads/main.zip', 'POST', 405],
    ['/raw/main/file.txt', 'POST', 405],
    ['/git-upload-pack', 'PUT', 404]
  ])('rejects %s via %s', async (path, method, status) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await app.request(`${proxyUrl}${path}`, { method });

    expect(response.status).toBe(status);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects upload-pack on other hosts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await app.request(
      '/api/ghproxy/https://example.com/owner/repo.git/git-upload-pack',
      { method: 'POST' }
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    'https://github.com/new-owner/repo.git/info/refs?service=git-upload-pack',
    '/new-owner/repo.git/info/refs?service=git-upload-pack'
  ])('keeps a canonical Git redirect on the proxy: %s', async (location) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 301, headers: { location } })
      );
    vi.stubGlobal('fetch', fetchMock);

    const response = await app.request(
      `${proxyUrl}/info/refs?service=git-upload-pack`
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(
      '/api/ghproxy/https://github.com/new-owner/repo.git/info/refs?service=git-upload-pack'
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects Git redirects outside supported Git endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { location: 'https://example.com/git-upload-pack' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await app.request(`${proxyUrl}/git-upload-pack`, {
      method: 'POST',
      body: '0000'
    });

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([403, 404, 429, 500])(
    'preserves upstream error %s',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('upstream error', { status }))
      );

      const response = await app.request(`${proxyUrl}/git-upload-pack`, {
        method: 'POST',
        body: '0000'
      });

      expect(response.status).toBe(status);
      expect(await response.text()).toBe('upstream error');
      expect(response.headers.has('content-disposition')).toBe(false);
    }
  );
});
