import { MessageSquare, Instagram, Mail, Phone, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChannelData } from "@/lib/api/types";

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  email: Mail,
  voip: Phone,
  messenger: Globe,
};

const channelColors: Record<string, string> = {
  whatsapp: "bg-success",
  instagram: "bg-info",
  email: "bg-warning",
  voip: "bg-destructive",
  messenger: "bg-primary",
};

interface ChannelDistributionProps {
  data?: ChannelData[];
  isLoading?: boolean;
}

export function ChannelDistribution({ data, isLoading }: ChannelDistributionProps) {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <h3 className="text-foreground font-semibold mb-1">Canais</h3>
      <p className="text-sm text-muted-foreground mb-6">Distribuição de atendimentos</p>
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          ))
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis</p>
        ) : (
          data.map((ch) => {
            const key = ch.canal.toLowerCase();
            const Icon = channelIcons[key] || Globe;
            const color = channelColors[key] || "bg-muted-foreground";
            return (
              <div key={ch.canal} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground capitalize">{ch.canal}</span>
                    <span className="text-muted-foreground">{ch.percentual}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${ch.percentual}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
