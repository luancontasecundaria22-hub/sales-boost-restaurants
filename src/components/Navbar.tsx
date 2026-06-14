"use client";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" aria-label="Sales Boost — início" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xs tracking-tight">SB</span>
          </div>
          <span
            className="font-bold text-slate-900 text-lg tracking-tight"
            style={{ fontFamily: "var(--font-inter-tight)" }}
          >
            Sales Boost
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {[
            ["Como Funciona", "#process"],
            ["Resultados", "#results"],
            ["Depoimentos", "#testimonials"],
            ["Preços", "#pricing"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              {label}
            </a>
          ))}
        </div>

        <a
          href="/onboarding"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-sm"
        >
          Diagnóstico grátis
        </a>
      </div>
    </nav>
  );
}
