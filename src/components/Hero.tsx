"use client";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

import type { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const bars = [55, 72, 48, 85, 68, 91, 78];

function DashboardCard() {
  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">
            Junho 2026
          </p>
          <p
            className="text-white font-bold text-lg"
            style={{ fontFamily: "var(--font-inter-tight)" }}
          >
            Sales Dashboard
          </p>
        </div>
        <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="bg-slate-800/60 rounded-xl p-4 mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-slate-400 text-xs mb-1">Receita Mensal</p>
            <p
              className="text-white font-black text-3xl"
              style={{ fontFamily: "var(--font-inter-tight)" }}
            >
              R$ 48.230
            </p>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            <ArrowRight className="w-3.5 h-3.5 -rotate-45" />
            +23%
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-slate-400 text-xs mb-3 uppercase tracking-widest">
          Receita Semanal
        </p>
        <div className="flex items-end gap-1.5 h-16">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex items-end h-full">
              <div
                className="w-full rounded-t-sm bg-emerald-500/70 hover:bg-emerald-400 transition-colors"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Recorrentes", value: "68%" },
          { label: "Ticket Médio", value: "R$42" },
          { label: "Campanhas", value: "4 ativas" },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-slate-800/60 rounded-lg p-2.5 text-center"
          >
            <p
              className="text-white font-bold text-sm"
              style={{ fontFamily: "var(--font-inter-tight)" }}
            >
              {m.value}
            </p>
            <p className="text-slate-500 text-[10px] leading-tight mt-0.5">
              {m.label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/60 rounded-xl p-3">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-400">Retenção de Clientes</span>
          <span className="text-emerald-400 font-semibold">91%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full">
          <div className="h-full w-[91%] bg-emerald-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="min-h-screen bg-white pt-16 flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Plataforma de Crescimento para Restaurantes
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-black text-5xl lg:text-[3.6rem] leading-[1.08] tracking-tight text-slate-900 mb-6"
              style={{ fontFamily: "var(--font-inter-tight)" }}
            >
              Transforme Mais Visitas ao Restaurante em{" "}
              <span className="text-emerald-500">Receita</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-slate-500 text-lg leading-relaxed mb-10 max-w-lg"
            >
              Sales Boost ajuda restaurantes a aumentar clientes recorrentes,
              recuperar clientes inativos e gerar crescimento mensal previsível.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 mb-12"
            >
              <a
                href="#cta"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base px-7 py-3.5 rounded-xl transition-all shadow-lg"
              >
                Agendar Conversa Gratuita
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#testimonials"
                className="inline-flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 font-semibold text-base px-7 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Ver Casos de Sucesso
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-x-8 gap-y-3"
            >
              {[
                ["300+", "Restaurantes"],
                ["+27%", "Crescimento Médio"],
                ["R$15M", "Receita Gerada"],
              ].map(([val, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span
                    className="font-black text-xl text-slate-900"
                    style={{ fontFamily: "var(--font-inter-tight)" }}
                  >
                    {val}
                  </span>
                  <span className="text-sm text-slate-400">{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-emerald-500/5 rounded-3xl blur-2xl" />
            <div className="relative">
              <DashboardCard />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
