"use client";

import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Compare", href: "#compare" },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(href: string) {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-approve-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-btn bg-approve-primary">
            <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-grey-700">ApproveSG</span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-medium text-approve-text-secondary transition-colors hover:text-approve-primary"
            >
              {link.label}
            </button>
          ))}
          <a
            href="#demo"
            className="rounded-btn bg-approve-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-approve-primary-dark"
          >
            Try Demo &rarr;
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-btn p-2 text-grey-500 hover:bg-grey-100 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-approve-border bg-white px-5 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="block w-full py-2 text-left text-sm font-medium text-approve-text-secondary hover:text-approve-primary"
            >
              {link.label}
            </button>
          ))}
          <a
            href="#demo"
            className="mt-2 block rounded-btn bg-approve-primary px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Try Demo &rarr;
          </a>
        </div>
      )}
    </nav>
  );
}
