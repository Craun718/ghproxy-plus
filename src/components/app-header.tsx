import { Github, PackageOpen } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium transition-colors',
    isActive
      ? 'bg-secondary text-secondary-foreground'
      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
  );

export function AppHeader() {
  return (
    <header className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="mr-auto inline-flex min-h-11 items-center gap-2 rounded-full font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="ghproxy plus home"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PackageOpen className="size-4" aria-hidden="true" />
          </span>
          <span>ghproxy plus</span>
        </Link>
        <nav
          className="flex items-center gap-1"
          aria-label="Primary navigation"
        >
          <NavLink to="/docs" className={navLinkClassName}>
            API Docs
          </NavLink>
          <a
            href="https://github.com/Craun718/ghproxy-plus"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-11 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            aria-label="View ghproxy plus on GitHub"
          >
            <Github className="size-5" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}
