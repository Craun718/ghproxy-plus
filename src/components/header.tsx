"use client";
import { Download, Github } from "lucide-react";

const Header = () => {
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-primary-foreground">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-white blur-3xl" />
      </div>

      <div className="container mx-auto relative flex justify-center items-center py-6 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            ghproxy plus
          </h1>
        </div>

        <a
          href="https://github.com/Craun718/ghproxy-plus"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-110"
          aria-label="View on GitHub"
        >
          <Github className="w-5 h-5" />
        </a>
      </div>
    </header>
  );
};

export default Header;
