import { Suspense } from "react";
import OnboardingForm from "@/components/OnboardingForm";

export const metadata = {
  title: "Diagnóstico grátis | Sales Boost",
  description: "Conte sobre o seu negócio e receba um diagnóstico gratuito.",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-16">
      <Suspense fallback={<div className="text-slate-400">Carregando…</div>}>
        <OnboardingForm />
      </Suspense>
    </main>
  );
}
