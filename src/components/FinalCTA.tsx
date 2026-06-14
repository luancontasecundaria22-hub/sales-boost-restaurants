"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section id="cta" className="py-24 bg-[#0F172A]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            30 minutos. Sem compromisso.
          </div>

          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-6xl text-white tracking-tight mb-6">
            Pronto Para Conhecer<br />Seu Cliente de Verdade?
          </h2>

          <p className="text-slate-400 text-lg mb-10">
            Comece com um diagnóstico gratuito do seu site e descubra o que<br />seus clientes já dizem sobre você na internet.
          </p>

          <a
            href="/onboarding"
            className="inline-flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base px-9 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
          >
            Quero meu diagnóstico gratuito
            <ArrowRight className="w-5 h-5" />
          </a>

          <p className="mt-5 text-slate-600 text-xs">
            Sem cartão de crédito · Cancele quando quiser · Resultados em 30 dias
          </p>
        </motion.div>
      </div>
    </section>
  );
}
