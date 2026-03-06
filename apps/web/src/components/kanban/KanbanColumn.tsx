import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DealCard } from "./DealCard";
import type { Deal } from "@/lib/api/deals";

export function KanbanColumn({
  id,
  title,
  deals
}: {
  id: string;
  title: string;
  deals: Deal[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      ref={setNodeRef}
      className={`w-72 min-w-[260px] shrink-0 flex flex-col max-h-[70vh] md:max-h-[70vh] ${
        isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}
    >
      <CardHeader className="p-3 border-b">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-1 overflow-auto space-y-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </CardContent>
    </Card>
  );
}
