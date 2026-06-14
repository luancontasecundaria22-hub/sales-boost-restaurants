import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Company = {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  website: string | null;
  email: string | null;
  created_at: string;
};

export default async function OwnerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirma role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") redirect("/dashboard");

  // Service role: vê TODAS as empresas, sem risco de perder dados
  const admin = createAdminClient();
  const { data: companies } = await admin
    .from("companies")
    .select("id, business_name, business_type, city, website, email, created_at")
    .order("created_at", { ascending: false });

  const list = (companies ?? []) as Company[];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">SB</span>
            </div>
            <span className="font-bold text-slate-900" style={{ fontFamily: "var(--font-inter-tight)" }}>
              Painel do Dono
            </span>
          </div>
          <span className="text-sm text-slate-500">{user.email}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-1">
          Empresas cadastradas
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {list.length} {list.length === 1 ? "empresa" : "empresas"} no total.
        </p>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
            Nenhuma empresa cadastrada ainda. Quando alguém preencher o onboarding,
            aparece aqui.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Negócio</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Cidade</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-900">{c.business_name}</td>
                    <td className="px-5 py-3 text-slate-600">{c.business_type ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{c.city ?? "—"}</td>
                    <td className="px-5 py-3 text-emerald-600">{c.website ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{c.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
