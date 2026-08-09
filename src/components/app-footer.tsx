export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-foreground/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>GitHub downloads through your own proxy.</p>
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
