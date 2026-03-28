"use client";
const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Built with{" "}
              <a
                href="https://hono.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                Hono
              </a>
              {" + "}
              <a
                href="https://tailwindcss.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                Tailwind CSS
              </a>
              {" + "}
              <span className="font-medium text-foreground">shadcn/ui</span>
              {" | Deployed on "}
              <span className="font-medium text-foreground">
                Cloudflare Workers
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              © 2025 ghproxy-plus. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
