import { DashboardLayout } from "@/components/DashboardLayout";
import { Clock } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageNames: Record<string, string> = {
  "/contacts": "Contatos",
  "/sales": "Vendas",
  "/support": "Atendimento",
  "/settings": "Configuracoes",
};

export default function ComingSoon() {
  const location = useLocation();
  const pageName = pageNames[location.pathname] ?? "Pagina";

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[calc(100vh-0px)]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{pageName}</h1>
            <p className="text-muted-foreground mt-2">
              Esta funcionalidade esta em desenvolvimento.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Em breve estara disponivel.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
