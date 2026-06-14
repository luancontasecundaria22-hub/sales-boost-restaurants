"use client";
import { motion } from "framer-motion";

const brands = ["Burger Lab", "Studio Bella", "Clínica Vita", "Moda Urbana", "Pet & Cia", "Academia Forte"];

export default function Trust() {
  return (
    <section className="bg-slate-50 border-y border-slate-100 py-14">
      <div className="max-w-7xl mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-8"
        >
          Confiado por estabelecimentos de todos os setores
        </motion.p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-5">
          {brands.map((brand, i) => (
            <motion.span
              key={brand}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="font-[family-name:var(--font-inter-tight)] font-bold text-slate-300 hover:text-slate-500 text-base tracking-tight transition-colors cursor-default select-none"
            >
              {brand}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
