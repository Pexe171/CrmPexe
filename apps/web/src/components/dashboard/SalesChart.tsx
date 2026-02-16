import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailySales } from "@/lib/api/types";

interface SalesChartProps {
  data?: DailySales[];
  isLoading?: boolean;
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
      <h3 className="text-foreground font-semibold mb-1">Vendas & Conversas</h3>
      <p className="text-sm text-muted-foreground mb-6">Últimos 7 dias</p>
      <div className="h-64">
        {isLoading ? (
          <div className="flex items-end gap-2 h-full pb-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${30 + Math.random() * 60}%` }} />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sem dados disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="vendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(174 72% 51%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(174 72% 51%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="conversas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis dataKey="data" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(222 41% 10%)",
                  border: "1px solid hsl(222 30% 22%)",
                  borderRadius: "8px",
                  color: "hsl(210 40% 96%)",
                  fontSize: "13px",
                }}
              />
              <Area type="monotone" dataKey="vendas" stroke="hsl(174 72% 51%)" fill="url(#vendas)" strokeWidth={2} />
              <Area type="monotone" dataKey="conversas" stroke="hsl(217 91% 60%)" fill="url(#conversas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
