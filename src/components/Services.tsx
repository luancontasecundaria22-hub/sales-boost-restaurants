"use client";
import { motion } from "framer-motion";
import { Users, Heart, TrendingUp, ArrowRight } from "lucide-react";

const services = [
  {
    icon: Users,
    title: "Reativação de Clientes",
    desc: "Traga de volta clientes que não pedem há meses com campanhas automatizadas de reconquista.",
  },
  {
    icon: Heart,
    title: "Fidelidade e Retenção",
    desc: "Aumente compras recorrentes automaticamente com fluxos de fidelidade e ofertas personalizadas.",
  },
  {
    icon: TrendingUp,
    title: "Campanhas de Crescimento",
    desc: "Campanhas direcionadas para aumentar o ticket médio e gerar mais pedidos todo mês.",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            O Que Fazemos
          </span>
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-slate-900 tracking-tight">
            Tudo o Que Seu Negócio<br />Precisa Para Crescer
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-8 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-default"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-5 group-hover:bg-emerald-500 transition-colors">
                <s.icon className="w-5 h-5 text-emerald-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-slate-900 mb-3">
                {s.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm mb-5">{s.desc}</p>
              <a
                href="/onboarding"
                className="inline-flex items-center gap-1 text-emerald-600 text-sm font-semibold group-hover:gap-2 transition-all"
              >
                Saiba mais <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
