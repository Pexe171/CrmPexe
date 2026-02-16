import { Skeleton } from "@/components/ui/skeleton";
import type { FunnelStage } from "@/lib/api/types";

interface ConversionFunnelProps {
  data?: FunnelStage[];
  isLoading?: boolean;
}

export function ConversionFunnel({ data, isLoading }: ConversionFunnelProps) {
  const maxCount = data?.[0]?.quantidade ?? 1;

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
      <h3 className="text-foreground font-semibold mb-1">Funil de Conversão</h3>
      <p className="text-sm text-muted-foreground mb-6">Etapas do pipeline</p>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis</p>
        ) : (
          data.map((stage, i) => (
            <div key={stage.etapa}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-foreground">{stage.etapa}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stage.quantidade}</span>
                  {stage.taxaConversao != null && (
                    <span className="text-xs text-primary font-medium">{stage.taxaConversao}%</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-secondary rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-1000"
                  style={{
                    width: `${(stage.quantidade / maxCount) * 100}%`,
                    background: `linear-gradient(90deg, hsl(174 72% 51% / ${0.8 - i * 0.12}), hsl(190 80% 45% / ${0.6 - i * 0.1}))`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
