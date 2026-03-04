import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Deal } from "@/lib/api/deals";

export function DealCard({
  deal,
  isOverlay = false
}: {
  deal: Deal;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: deal.id,
    data: { deal }
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const amount =
    deal.amount != null
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(deal.amount)
      : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        cursor-grab active:cursor-grabbing
        ${isDragging && !isOverlay ? "opacity-50" : ""}
        ${isOverlay ? "shadow-lg ring-2 ring-primary/20" : ""}
      `}
    >
      <CardHeader className="p-3 pb-1">
        <p className="font-medium text-sm truncate">{deal.title}</p>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        {deal.contact?.name && (
          <p className="text-xs text-muted-foreground truncate">
            {deal.contact.name}
          </p>
        )}
        {amount && (
          <p className="text-xs font-medium text-primary">{amount}</p>
        )}
      </CardContent>
    </Card>
  );
}
