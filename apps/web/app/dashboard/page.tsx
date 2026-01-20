import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";

import { LogoutButton } from "./logout-button";

export default function DashboardPage() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
              CrmPexe
            </p>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="text-sm text-slate-300">
              Área reservada para métricas e visão consolidada do workspace.
            </p>
          </div>
          <LogoutButton />
        </header>

        <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-slate-100">
            Dashboard em construção
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Em breve, KPIs e painéis de atendimento aparecerão aqui.
          </p>
        </section>
      </div>
    </main>
  );
}
