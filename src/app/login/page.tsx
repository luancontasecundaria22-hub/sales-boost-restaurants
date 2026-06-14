"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      // Descobre o role para redirecionar
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      router.push(profile?.role === "owner" ? "/owner" : "/dashboard");
      router.refresh();
    } catch {
      setError("Algo deu errado. Verifique a configuração do Supabase.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 lg:p-10 max-w-sm w-full">
        <a href="/" className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">SB</span>
          </div>
          <span className="font-bold text-slate-900 text-lg" style={{ fontFamily: "var(--font-inter-tight)" }}>
            Sales Boost
          </span>
        </a>

        <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl text-slate-900 mb-1">
          Entrar
        </h1>
        <p className="text-slate-500 text-sm mb-6">Acesse seu painel.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
          >
            {loading ? "Entrando…" : "Entrar"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </main>
  );
}
