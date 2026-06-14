import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Empresa(s) do próprio cliente (RLS garante que só vê a dele)
  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, business_type, city, website, goal, created_at")
    .order("created_at", { ascending: false });

  const company = companies?.[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">SB</span>
            </div>
            <span className="font-bold text-slate-900" style={{ fontFamily: "var(--font-inter-tight)" }}>
              Meu Painel
            </span>
          </div>
          <span className="text-sm text-slate-500">{user.email}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-6">
          Bem-vindo de volta
        </h1>

        {company ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-slate-900 mb-4">
              {company.business_name}
            </h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400">Tipo</dt>
                <dd className="text-slate-900 font-medium">{company.business_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Cidade</dt>
                <dd className="text-slate-900 font-medium">{company.city ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Site</dt>
                <dd className="text-emerald-600 font-medium">{company.website ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Objetivo</dt>
                <dd className="text-slate-900 font-medium">{company.goal ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <p className="text-slate-500 mb-6">
              Você ainda não cadastrou seu negócio.
            </p>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
            >
              Fazer meu diagnóstico
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
