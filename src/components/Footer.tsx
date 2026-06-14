import { Twitter, Linkedin, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] border-t border-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">SB</span>
            </div>
            <span className="font-[family-name:var(--font-inter-tight)] font-bold text-white">
              Sales Boost
            </span>
          </div>

          <div className="flex items-center gap-8">
            {[
              { label: "Produto", href: "#services" },
              { label: "Como funciona", href: "#process" },
              { label: "Depoimentos", href: "#testimonials" },
            ].map((link) => (
              <a key={link.label} href={link.href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {[
              { Icon: Twitter, label: "Twitter", href: "https://twitter.com" },
              { Icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
              { Icon: Instagram, label: "Instagram", href: "https://instagram.com" },
            ].map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-slate-600 hover:text-emerald-400 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Sales Boost. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
