import { describe, expect, it } from 'vitest';
import apiRouter from './route';

describe('retired GitHub query routes', () => {
  it.each(['/repos/owner/repo/releases', '/download/github.com/owner/repo'])(
    'does not expose %s',
    async (path) => {
      const response = await apiRouter.request(path);

      expect(response.status).toBe(404);
    }
  );
});
