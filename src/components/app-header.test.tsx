import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AppHeader } from './app-header';

afterEach(cleanup);

describe('AppHeader', () => {
  it('uses GitHub Mark icons for the brand and repository links', () => {
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    );
    const icons = Array.from(
      container.querySelectorAll<SVGElement>('[data-icon="github-mark"]')
    );
    const homeLink = screen.getByRole('link', {
      name: 'ghproxy plus home'
    });
    const repositoryLink = screen.getByRole('link', {
      name: 'View ghproxy plus on GitHub'
    });

    expect(icons).toHaveLength(2);
    expect(
      icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')
    ).toBe(true);
    expect(homeLink.contains(icons[0])).toBe(true);
    expect(repositoryLink.contains(icons[1])).toBe(true);
  });
});
