import { Skeleton } from "@/components/ui/skeleton";
import type { UserProductivity } from "@/lib/api/types";

interface ProductivityTableProps {
  data?: UserProductivity[];
  isLoading?: boolean;
}

export function ProductivityTable({ data, isLoading }: ProductivityTableProps) {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "600ms" }}>
      <h3 className="text-foreground font-semibold mb-1">Produtividade</h3>
      <p className="text-sm text-muted-foreground mb-4">Desempenho dos vendedores</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th className="text-left py-2 font-medium">Vendedor</th>
              <th className="text-right py-2 font-medium">Fechados</th>
              <th className="text-right py-2 font-medium">Mensagens</th>
              <th className="text-right py-2 font-medium">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                </tr>
              ))
            ) : !data?.length ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  Sem dados disponíveis
                </td>
              </tr>
            ) : (
              data.map((u) => (
                <tr key={u.nome} className="border-t border-border">
                  <td className="py-3 text-foreground font-medium">{u.nome}</td>
                  <td className="py-3 text-right text-foreground">{u.conversasFechadas}</td>
                  <td className="py-3 text-right text-muted-foreground">{u.mensagensEnviadas}</td>
                  <td className="py-3 text-right">
                    <span className="text-primary font-medium">{u.taxaFechamento}%</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
