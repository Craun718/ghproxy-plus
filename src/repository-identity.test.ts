import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const canonicalRepository = 'https://github.com/Craun718/ghproxy-plus';
const legacyRepository = 'https://github.com/NtskwK/ghproxy-plus';
const repositorySurfaces = [
  'README.md',
  'src/components/app-header.tsx',
  'src/components/app-footer.tsx'
];

describe('canonical repository identity', () => {
  it.each(repositorySurfaces)('%s points to the current repository', (file) => {
    const contents = readFileSync(join(process.cwd(), file), 'utf8');

    expect(contents).toContain(canonicalRepository);
    expect(contents).not.toContain(legacyRepository);
  });

  it('uses the canonical repository in the Cloudflare deployment entry', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');

    expect(readme).toContain(
      `https://deploy.workers.cloudflare.com/?url=${canonicalRepository}.git`
    );
  });
});
