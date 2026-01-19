import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CrmPexe",
  description: "CRM de atendimento e automações"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
