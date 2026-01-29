import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { normalizeSupportModeFlag, SUPPORT_MODE_COOKIE } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "CrmPexe",
  description: "CRM de atendimento e automações"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const isSupportMode = normalizeSupportModeFlag(
    cookieStore.get(SUPPORT_MODE_COOKIE)?.value
  );

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {isSupportMode ? (
          <div className="w-full bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-amber-900">
            Modo suporte ativo: você está navegando como membro do workspace.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
