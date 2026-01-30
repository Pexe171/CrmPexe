import "./globals.css";
import type { Metadata } from "next";
import { GlobalFeedbackProvider } from "@/components/global-feedback";
import { SupportModeBanner } from "@/components/support-mode-banner";

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
        <GlobalFeedbackProvider>
          <SupportModeBanner />
          {children}
        </GlobalFeedbackProvider>
      </body>
    </html>
  );
}
