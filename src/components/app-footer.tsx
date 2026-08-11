import { Blocks, Cloud, Component, Flame, Wind, Wrench } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-foreground/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" />
            <a
              href="https://hono.dev"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              Hono
            </a>
          </span>
          <span className="flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" />
            <a
              href="https://www.npmjs.com/package/wrangler"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              wrangler
            </a>
          </span>
          <span className="flex items-center gap-1">
            <Cloud className="h-3.5 w-3.5" />
            <a
              href="https://workers.cloudflare.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              Cloudflare Workers
            </a>
          </span>
          <span className="flex items-center gap-1">
            <Component className="h-3.5 w-3.5" />
            <a
              href="https://www.base-ui.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              Base UI
            </a>
          </span>
          <span className="flex items-center gap-1">
            <Blocks className="h-3.5 w-3.5" />
            <a
              href="https://ui.shadcn.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              shadcn/ui
            </a>
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3.5 w-3.5" />
            <a
              href="https://tailwindcss.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              Tailwind CSS
            </a>
          </span>
        </div>
        <p>
          © {new Date().getFullYear()}{' '}
          <a
            href="https://github.com/Craun718/ghproxy-plus"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            ghproxy plus
          </a>
        </p>
      </div>
    </footer>
  );
}
