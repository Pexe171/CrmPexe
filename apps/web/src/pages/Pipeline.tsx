import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsApi, type Deal } from "@/lib/api/deals";
import { useAuthMe } from "@/hooks/useAuthMe";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { DealCard } from "@/components/kanban/DealCard";
import { LayoutGrid, Loader2, Plus } from "lucide-react";

const DEFAULT_STAGES = [
  { id: "leads", label: "Leads" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" }
];

function normalizeStage(stage: string | null): string {
  if (!stage?.trim()) return "";
  const s = stage.trim().toLowerCase();
  if (s === "outros") return "_other";
  const found = DEFAULT_STAGES.find(
    (st) => st.id === s || st.label.toLowerCase() === s
  );
  return found ? found.id : "_other";
}

function groupDealsByStage(deals: Deal[]) {
  const map: Record<string, Deal[]> = {};
  for (const stage of DEFAULT_STAGES) {
    map[stage.id] = [];
  }
  map[""] = [];
  map["_other"] = [];
  for (const deal of deals) {
    const key = normalizeStage(deal.stage);
    if (!map[key]) map["_other"] = [...(map["_other"] ?? []), deal];
    else map[key].push(deal);
  }
  return map;
}

export default function PipelinePage() {
  const { data: me } = useAuthMe();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsApi.list(),
    enabled: !!me?.currentWorkspaceId
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ dealId, stage }: { dealId: string; stage: string }) =>
      dealsApi.updateStage(dealId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    }
  });

  const byStage = useMemo(() => groupDealsByStage(deals), [deals]);
  const activeDeal = useMemo(
    () => (activeId ? deals.find((d) => d.id === activeId) : null),
    [activeId, deals]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id as string;
    const newStageId = over.id as string;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStageId) return;
    const stageValue =
      newStageId === ""
        ? ""
        : newStageId === "_other"
          ? "Outros"
          : DEFAULT_STAGES.find((s) => s.id === newStageId)?.label ?? newStageId;
    updateStageMutation.mutate({ dealId, stage: stageValue });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Pipeline</h1>
          </div>
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="w-4 h-4" />
            Novo negócio
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
              {DEFAULT_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  id={stage.id}
                  title={stage.label}
                  deals={byStage[stage.id] ?? []}
                />
              ))}
              {(byStage[""]?.length ?? 0) > 0 && (
                <KanbanColumn
                  id=""
                  title="Sem estágio"
                  deals={byStage[""] ?? []}
                />
              )}
              {(byStage["_other"]?.length ?? 0) > 0 && (
                <KanbanColumn
                  id="_other"
                  title="Outros"
                  deals={byStage["_other"] ?? []}
                />
              )}
            </div>

            <DragOverlay>
              {activeDeal ? (
                <DealCard deal={activeDeal} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </DashboardLayout>
  );
}
