"use client";
import { motion } from "framer-motion";
import { Search, Zap, Gauge, LineChart } from "lucide-react";

const checks = [
  { icon: Gauge, label: "Performance e velocidade" },
  { icon: Search, label: "SEO técnico e indexação" },
  { icon: LineChart, label: "Experiência e conversão (UX)" },
  { icon: Zap, label: "Pontos fracos de backend" },
];

export default function Diagnostic() {
  return (
    <section id="diagnostico" className="py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 lg:p-14 text-center"
        >
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            Grátis · Sem cadastro complicado
          </span>
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-3xl lg:text-4xl text-slate-900 tracking-tight mb-4">
            Cole o link do seu site e receba um diagnóstico gratuito
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Em minutos você recebe um relatório com os pontos fracos do seu site —
            performance, SEO, experiência e backend. E se precisar, a gente refaz sua
            landing page.
          </p>

          <form action="/onboarding" method="get" className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-10">
            <input
              type="url"
              name="site"
              required
              placeholder="https://seusite.com.br"
              aria-label="URL do seu site"
              className="flex-1 px-5 py-3.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg whitespace-nowrap"
            >
              Analisar grátis
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {checks.map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <c.icon className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-slate-600 text-xs font-medium leading-snug">{c.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
