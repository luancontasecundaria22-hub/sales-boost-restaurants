"use client";
import { motion } from "framer-motion";
import { Globe, Star, MapPin, MessageCircle } from "lucide-react";

const sources = [
  { icon: Star, title: "Reviews do Google", desc: "Lemos o que seus clientes já dizem em avaliações públicas." },
  { icon: MapPin, title: "Google Maps", desc: "Analisamos sua presença local e a dos seus concorrentes." },
  { icon: MessageCircle, title: "Redes sociais", desc: "Capturamos comentários, engajamento e sentimento sobre sua marca." },
  { icon: Globe, title: "Toda a internet", desc: "Varremos a web para montar um perfil real do seu cliente." },
];

export default function DataIntelligence() {
  return (
    <section id="dados" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            Inteligência de dados
          </span>
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-slate-900 tracking-tight mb-4">
            Conhecemos seu cliente com dados reais da internet
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Enquanto outras ferramentas usam só dados internos, o Sales Boost vai além:
            varremos a internet para descobrir quem é o seu cliente, o que ele valoriza e
            por que ele escolhe (ou não) o seu negócio.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sources.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-[family-name:var(--font-inter-tight)] font-bold text-lg text-slate-900 mb-2">
                {s.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
