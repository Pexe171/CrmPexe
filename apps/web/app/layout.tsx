import "./globals.css";
import type { Metadata } from "next";
import { GlobalFeedbackProvider } from "@/components/global-feedback";
import { SupportModeBanner } from "@/components/support-mode-banner";
import { BrandingProvider } from "@/components/branding/branding-provider";

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
        <BrandingProvider>
          <GlobalFeedbackProvider>
            <SupportModeBanner />
            {children}
          </GlobalFeedbackProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
