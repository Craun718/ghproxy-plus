import { BrowserRouter } from "react-router-dom";

import "./globals.css";

import { Suspense } from "react";
import { Toaster } from "sonner";
import Footer from "./components/footer";
import Header from "./components/header";
import Homepage from "./pages";

export function Main() {
  return (
    <div className="relative font-sans antialiased min-h-screen flex flex-col overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <Header />
      <BrowserRouter>
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 flex flex-col items-center justify-center">
          <Toaster position="top-center" />
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-40">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <Homepage />
          </Suspense>
        </main>
      </BrowserRouter>
      <Footer />
    </div>
  );
}
