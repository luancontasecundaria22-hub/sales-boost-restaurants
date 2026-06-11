"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const metrics = [
  { value: "+300", label: "Restaurantes Atendidos" },
  { value: "+27%", label: "Crescimento Médio de Receita" },
  { value: "92%", label: "Taxa de Retenção de Clientes" },
  { value: "R$15M", label: "Receita Adicional Gerada" },
];

export default function About() {
  return (
    <section id="about" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — image placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/5] bg-slate-200 rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Sales Boost</p>
                <p className="text-white font-[family-name:var(--font-inter-tight)] font-bold text-lg">
                  Equipes de restaurantes<br />que trabalhamos
                </p>
              </div>
              {/* Decorative grid inside */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="grid grid-cols-6 gap-3 w-full h-full p-8">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="bg-slate-500 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5">
              Sobre Nós
            </span>
            <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-slate-900 tracking-tight mb-6">
              Crescimento de Restaurantes Construído em Dados
            </h2>
            <p className="text-slate-500 leading-relaxed mb-8">
              Combinamos análise de comportamento do cliente, marketing automatizado e playbooks comprovados de crescimento para ajudar donos de restaurantes a construir receita previsível e escalável.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {metrics.map((m) => (
                <div key={m.label} className="bg-white rounded-xl p-4 border border-slate-100">
                  <p className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-emerald-500 mb-1">
                    {m.value}
                  </p>
                  <p className="text-slate-500 text-sm leading-snug">{m.label}</p>
                </div>
              ))}
            </div>

            <a
              href="#process"
              className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200 hover:border-slate-300 px-5 py-2.5 rounded-lg transition-all"
            >
              Ver Como Funciona <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
