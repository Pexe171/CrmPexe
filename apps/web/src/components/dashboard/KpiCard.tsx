import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
  title: string;
  value?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  isLoading?: boolean;
}

export function KpiCard({ title, value, change, changeType = "neutral", icon: Icon, delay = 0, isLoading }: KpiCardProps) {
  const changeColor = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  }[changeType];

  return (
    <div
      className="glass-card rounded-xl p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {isLoading ? (
          <Skeleton className="h-4 w-12" />
        ) : change ? (
          <span className={`text-xs font-medium ${changeColor}`}>{change}</span>
        ) : null}
      </div>
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-28" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-foreground">{value ?? "—"}</p>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </>
      )}
    </div>
  );
}
