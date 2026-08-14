import { describe, expect, it } from 'vitest';
import { resolveApiDocumentationContent } from './api-documentation';

describe('resolveApiDocumentationContent', () => {
  it('replaces the API docs host placeholder with the current origin', () => {
    expect(
      resolveApiDocumentationContent(
        'curl https://[host]/api/ping',
        'https://downloads.example.com'
      )
    ).toBe('curl https://downloads.example.com/api/ping');
  });

  it('uses the current origin protocol and port', () => {
    expect(
      resolveApiDocumentationContent(
        '# API\n\ncurl https://[host]/api/ping',
        'http://127.0.0.1:3000'
      )
    ).toBe('# API\n\ncurl http://127.0.0.1:3000/api/ping');
  });
});
