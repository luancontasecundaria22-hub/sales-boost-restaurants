"use client";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Sales Boost trouxe de volta 40% dos nossos clientes inativos no primeiro mês. Nossa receita mensal subiu R$12.000.",
    name: "Marco Rossi",
    role: "Dono, Burger Lab",
    initials: "MR",
    color: "bg-orange-500",
  },
  {
    quote: "Fomos de 22% para 68% de retenção de clientes em 90 dias. O ROI desta ferramenta é absurdo.",
    name: "Ana Ferreira",
    role: "Gerente, Sushi Palace",
    initials: "AF",
    color: "bg-violet-500",
  },
  {
    quote: "Finalmente uma ferramenta que realmente move a agulha. Não é mais um dashboard para enfeitar.",
    name: "James Chen",
    role: "Dono, The Grill House",
    initials: "JC",
    color: "bg-sky-500",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-slate-900 tracking-tight">
            O Que Donos de Restaurantes Dizem
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all border-l-4 border-l-emerald-500"
            >
              <div className="flex mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6 text-sm">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-xs">{t.initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-slate-400 text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
