import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <div className="fixed inset-0 grid-background pointer-events-none" />
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent-dark flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:shadow-brand-primary/40 transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Sales Co-Pilot</h1>
          </Link>
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-xs tracking-wide rounded-full bg-brand-primary/[0.08] px-3 py-1.5 font-semibold text-brand-primary-light border border-brand-primary/20">
              Demo Mode
            </span>
          </nav>
        </div>
      </header>
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
