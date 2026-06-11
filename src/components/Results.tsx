"use client";
import { motion } from "framer-motion";

const stats = [
  { value: "300+", label: "Restaurantes crescendo com Sales Boost" },
  { value: "27%", label: "Aumento médio de receita mensal" },
  { value: "R$15M", label: "Receita adicional gerada" },
  { value: "92%", label: "Retenção de clientes após 12 meses" },
];

export default function Results() {
  return (
    <section id="results" className="py-24 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-white tracking-tight">
            Resultados Reais para<br />Restaurantes Reais
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800 rounded-2xl overflow-hidden">
          {stats.map((s, i) => (
            <motion.div
              key={s.value}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#0F172A] p-10 text-center hover:bg-slate-800/50 transition-colors"
            >
              <p className="font-[family-name:var(--font-inter-tight)] font-black text-5xl text-emerald-400 mb-3">
                {s.value}
              </p>
              <p className="text-slate-400 text-sm leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
