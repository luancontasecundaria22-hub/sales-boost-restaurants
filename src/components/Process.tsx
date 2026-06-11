"use client";
import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Auditoria de Crescimento",
    desc: "Analisamos seus dados de clientes, histórico de pedidos e presença online para identificar lacunas de receita.",
  },
  {
    n: "02",
    title: "Desenvolvimento de Estratégia",
    desc: "Plano de crescimento personalizado para os objetivos e perfil de clientes do seu restaurante.",
  },
  {
    n: "03",
    title: "Lançamento de Campanhas",
    desc: "Implantamos campanhas automatizadas por e-mail, SMS e canais de fidelidade.",
  },
  {
    n: "04",
    title: "Otimização de Receita",
    desc: "Testes A/B contínuos e otimização para maximizar cada campanha.",
  },
];

export default function Process() {
  return (
    <section id="process" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            Como Funciona
          </span>
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-slate-900 tracking-tight">
            Da Auditoria à Receita em 30 Dias
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-px bg-slate-100" style={{ left: "12.5%", right: "12.5%" }} />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative text-center lg:text-left"
              >
                <div className="relative inline-flex lg:flex items-center justify-center lg:justify-start mb-6">
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center relative z-10">
                    <span className="font-[family-name:var(--font-inter-tight)] font-bold text-emerald-600 text-xs">
                      {s.n}
                    </span>
                  </div>
                </div>
                <h3 className="font-[family-name:var(--font-inter-tight)] font-bold text-lg text-slate-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
