"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

type OnboardingData = {
  businessName: string;
  businessType: string;
  city: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  googleMaps: string;
  phone: string;
  goal: string;
  email: string;
};

const businessTypes = [
  "Restaurante / Food",
  "Varejo / E-commerce",
  "Serviços",
  "Beleza / Estética",
  "Saúde",
  "Academia / Fitness",
  "Outro",
];

const goals = [
  "Conhecer melhor meus clientes",
  "Recuperar clientes inativos",
  "Aumentar clientes recorrentes",
  "Aumentar o ticket médio",
  "Melhorar meu site / landing page",
];

const STEPS = ["Negócio", "Presença digital", "Objetivo"];

export default function OnboardingForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    businessType: "",
    city: "",
    website: searchParams.get("site") || "",
    instagram: "",
    facebook: "",
    tiktok: "",
    googleMaps: "",
    phone: "",
    goal: "",
    email: "",
  });

  const update = (field: keyof OnboardingData, value: string) =>
    setData((d) => ({ ...d, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return data.businessName && data.businessType && data.city;
    if (step === 1) return data.website;
    if (step === 2) return data.goal && data.email;
    return false;
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // backend ainda pode não estar configurado — seguimos para a tela de sucesso
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 placeholder:text-slate-400";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 max-w-lg w-full text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-3">
          Recebemos seus dados!
        </h1>
        <p className="text-slate-500 mb-8">
          Vamos varrer a internet sobre o seu negócio e preparar seu diagnóstico.
          Em breve você recebe tudo no e-mail <strong>{data.email}</strong>.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm"
        >
          Voltar ao início
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 lg:p-10 max-w-lg w-full">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />
            <span
              className={`text-xs mt-1.5 block ${
                i <= step ? "text-emerald-600 font-medium" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-1">
                Sobre o seu negócio
              </h1>
              <p className="text-slate-500 text-sm mb-4">
                Atendemos qualquer tipo de estabelecimento.
              </p>
              <div>
                <label className={labelClass}>Nome do negócio</label>
                <input
                  className={inputClass}
                  value={data.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  placeholder="Ex: Burger Lab"
                />
              </div>
              <div>
                <label className={labelClass}>Tipo de estabelecimento</label>
                <select
                  className={inputClass}
                  value={data.businessType}
                  onChange={(e) => update("businessType", e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {businessTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Cidade / UF</label>
                <input
                  className={inputClass}
                  value={data.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Ex: São Paulo / SP"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-1">
                Sua presença digital
              </h1>
              <p className="text-slate-500 text-sm mb-4">
                Quanto mais você informar, mais completo fica o diagnóstico.
              </p>
              <div>
                <label className={labelClass}>Website *</label>
                <input
                  type="url"
                  className={inputClass}
                  value={data.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://seusite.com.br"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Instagram</label>
                  <input className={inputClass} value={data.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="@seu_negocio" />
                </div>
                <div>
                  <label className={labelClass}>Facebook</label>
                  <input className={inputClass} value={data.facebook} onChange={(e) => update("facebook", e.target.value)} placeholder="/seunegocio" />
                </div>
                <div>
                  <label className={labelClass}>TikTok</label>
                  <input className={inputClass} value={data.tiktok} onChange={(e) => update("tiktok", e.target.value)} placeholder="@seu_negocio" />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp / Telefone</label>
                  <input className={inputClass} value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Link do Google Maps</label>
                <input className={inputClass} value={data.googleMaps} onChange={(e) => update("googleMaps", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-1">
                Seu objetivo
              </h1>
              <p className="text-slate-500 text-sm mb-4">
                O que você mais quer alcançar agora?
              </p>
              <div>
                <label className={labelClass}>Objetivo principal</label>
                <select
                  className={inputClass}
                  value={data.goal}
                  onChange={(e) => update("goal", e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {goals.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Seu melhor e-mail</label>
                <input
                  type="email"
                  className={inputClass}
                  value={data.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <button
            onClick={back}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        ) : (
          <span />
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            disabled={!canAdvance()}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canAdvance() || submitting}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
          >
            {submitting ? "Enviando…" : "Receber diagnóstico"}
            {!submitting && <Check className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
