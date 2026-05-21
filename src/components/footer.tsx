"use client";

import {
  IconBrandCloudflare,
  IconBrandTailwind,
  IconFlame
} from "@tabler/icons-react";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <IconFlame stroke={1} />
              <a
                href="https://hono.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Hono
              </a>
            </span>
            <span>+</span>
            <span className="flex items-center gap-1">
              <IconBrandTailwind stroke={1} />
              <a
                href="https://tailwindcss.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Tailwind CSS
              </a>
            </span>
            <span>+</span>
            <span>shadcn/ui</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconBrandCloudflare stroke={1} />
            <span>Deployed on Cloudflare Workers</span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            © 2025 ghproxy-plus
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
