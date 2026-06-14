"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Essencial",
    price: "R$ 197",
    period: "/mês",
    desc: "Para quem está começando a conhecer o cliente.",
    features: [
      "Diagnóstico de site completo",
      "Análise de reviews do Google",
      "Relatório mensal de insights",
      "Suporte por e-mail",
    ],
    cta: "Começar agora",
    highlight: false,
  },
  {
    name: "Crescimento",
    price: "R$ 397",
    period: "/mês",
    desc: "Para negócios que querem crescer com previsibilidade.",
    features: [
      "Tudo do Essencial",
      "Varredura de redes sociais e Maps",
      "Campanhas de reativação e fidelidade",
      "Perfil completo do cliente",
      "Suporte prioritário",
    ],
    cta: "Falar com especialista",
    highlight: true,
  },
  {
    name: "Performance",
    price: "Sob consulta",
    period: "",
    desc: "Para redes e franquias com múltiplas unidades.",
    features: [
      "Tudo do Crescimento",
      "Multi-unidades e franquias",
      "Landing pages sob medida",
      "Automação de posts semanais",
      "Gerente de conta dedicado",
    ],
    cta: "Solicitar proposta",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            Preços
          </span>
          <h2 className="font-[family-name:var(--font-inter-tight)] font-black text-4xl lg:text-5xl text-slate-900 tracking-tight mb-4">
            Preço claro, em reais, para o seu negócio
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Sem dólar, sem preço escondido. Planos acessíveis para qualquer estabelecimento brasileiro.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-2xl p-8 border transition-all ${
                plan.highlight
                  ? "border-emerald-500 shadow-xl shadow-emerald-500/10 lg:-translate-y-3 bg-white"
                  : "border-slate-100 hover:border-emerald-200 hover:shadow-lg"
              }`}
            >
              {plan.highlight && (
                <span className="inline-block bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  Mais popular
                </span>
              )}
              <h3 className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-slate-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-slate-500 text-sm mb-5">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-[family-name:var(--font-inter-tight)] font-black text-4xl text-slate-900">
                  {plan.price}
                </span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/onboarding"
                className={`block text-center font-semibold text-sm px-6 py-3 rounded-xl transition-all ${
                  plan.highlight
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                    : "border border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
