"use client";
const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Powered by{" "}
              <span className="font-medium text-foreground">
                <a
                  href="https://hono.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hono
                </a>
              </span>
              <span className="text-xs text-foreground"> and </span>
              <span className="font-medium text-foreground">
                <a
                  href="https://www.npmjs.com/package/wrangler"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  wrangler
                </a>
              </span>{" "}
              and deployed on{" "}
              <span className="font-medium text-foreground">
                Cloudflare Workers
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              UI components built with{" "}
              <span className="font-medium text-foreground">shadcn/ui</span>
            </p>
            <p className="text-sm text-muted-foreground">
              © 2025 ghproxy-plus. Built with modern web technologies.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
