import { describe, expect, it } from 'vitest';
import { parseExpandedAssets, parseReleasePage } from './release-page-parser';

const tagName = '@scope/cli-v0.3.4';
const encodedTagName = '%40scope%2Fcli-v0.3.4';

describe('release-page-parser', () => {
  it('parses the latest tag and expanded-assets fragment URL', () => {
    const page = parseReleasePage(
      `<html><body>
        <include-fragment src="https://github.com/owner/repo/releases/expanded_assets/${encodedTagName}"></include-fragment>
      </body></html>`,
      'owner',
      'repo'
    );

    expect(page.tagName).toBe(tagName);
    expect(page.expandedAssetsUrl).toBe(
      `https://github.com/owner/repo/releases/expanded_assets/${encodedTagName}`
    );
  });

  it('keeps slash-separated tag names intact', () => {
    const page = parseReleasePage(
      '<include-fragment src="https://github.com/owner/repo/releases/expanded_assets/@scope/cli-v0.3.4"></include-fragment>',
      'owner',
      'repo'
    );

    expect(page.tagName).toBe('@scope/cli-v0.3.4');
    expect(page.expandedAssetsUrl).toBe(
      'https://github.com/owner/repo/releases/expanded_assets/@scope/cli-v0.3.4'
    );
  });

  it('parses asset metadata and rejects links outside the repository', () => {
    const result = parseExpandedAssets(
      `<html><body><ul>
        <li class="Box-row">
          <a href="/owner/repo/releases/download/${encodedTagName}/tool%20windows.zip">tool windows.zip</a>
          <span>2.5 MB</span>
          <relative-time datetime="2026-09-30T08:00:00Z"></relative-time>
        </li>
        <li class="Box-row">
          <a href="https://github.com/other/repo/releases/download/v1/tool.zip">other tool</a>
        </li>
        <li class="Box-row">
          <a href="https://evil.example.test/github.com/owner/repo/releases/download/v1/tool.zip">evil tool</a>
        </li>
      </ul></body></html>`,
      'owner',
      'repo'
    );

    expect(result.publishedAt).toBe('2026-09-30T08:00:00Z');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toEqual({
      name: 'tool windows.zip',
      browser_download_url: `https://github.com/owner/repo/releases/download/${encodedTagName}/tool%20windows.zip`,
      size: 2_621_440
    });
  });

  it('accepts a source-only expanded-assets fragment', () => {
    const result = parseExpandedAssets(
      `<html><body><ul>
        <li>
          <a href="/owner/repo/archive/refs/tags/${encodedTagName}.zip">Source code (zip)</a>
          <relative-time datetime="2026-09-09T18:49:11Z"></relative-time>
        </li>
      </ul></body></html>`,
      'owner',
      'repo'
    );

    expect(result.assets).toEqual([]);
    expect(result.publishedAt).toBe('2026-09-09T18:49:11Z');
  });

  it('rejects a latest page belonging to another repository', () => {
    expect(() =>
      parseReleasePage(
        '<include-fragment src="https://github.com/other/repo/releases/expanded_assets/v1"></include-fragment>',
        'owner',
        'repo'
      )
    ).toThrow('The GitHub release page could not be parsed.');
  });
});
