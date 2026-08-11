import { Blocks, Cloud, Flame, Wind, Wrench } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-foreground/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <Flame className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          Powered by{' '}
          <a
            href="https://hono.dev"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            Hono
          </a>
          , <Wrench className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          <a
            href="https://www.npmjs.com/package/wrangler"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            wrangler
          </a>
          , <Cloud className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          deployed on Cloudflare Workers, UI built with{' '}
          <a
            href="https://www.base-ui.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            Base UI
          </a>
          , <Blocks className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            shadcn/ui
          </a>
          , <Wind className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          <a
            href="https://tailwindcss.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            Tailwind CSS
          </a>
        </p>
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
