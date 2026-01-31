"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { formatCurrencyBRL, formatRelativeTime } from "./formatters";

const pipelineStages = [
  {
    id: "NEW",
    label: "Novo",
    description: "Leads recém capturados"
  },
  {
    id: "CONTACTED",
    label: "Contato",
    description: "Primeiro contato realizado"
  },
  {
    id: "PROPOSAL",
    label: "Proposta",
    description: "Em negociação comercial"
  },
  {
    id: "CLOSED",
    label: "Fechado",
    description: "Negócio concluído"
  }
] as const;

type PipelineStage = (typeof pipelineStages)[number]["id"];

type LeadCard = {
  id: string;
  name: string;
  value: number;
  lastInteractionLabel: string;
  status: PipelineStage;
};

type SalesFunnelBoardProps = {
  conversations: Array<{
    id: string;
    status?: string | null;
    lastMessageAt?: string | null;
    createdAt: string;
    contact?: {
      name?: string | null;
      leadScore?: number | null;
    } | null;
  }>;
  loading: boolean;
  apiUrl: string;
};

const normalizeStatus = (status?: string | null): PipelineStage => {
  switch (status) {
    case "CONTACTED":
      return "CONTACTED";
    case "PROPOSAL":
      return "PROPOSAL";
    case "CLOSED":
      return "CLOSED";
    case "NEW":
    case "OPEN":
    default:
      return "NEW";
  }
};

const buildLeadCards = (conversations: SalesFunnelBoardProps["conversations"]): LeadCard[] => {
  return conversations.map((conversation) => {
    const leadScore = conversation.contact?.leadScore ?? 0;
    const name = conversation.contact?.name?.trim() || "Lead sem nome";
    const lastInteractionAt = conversation.lastMessageAt ?? conversation.createdAt;

    return {
      id: conversation.id,
      name,
      value: leadScore > 0 ? leadScore * 1000 : 0,
      lastInteractionLabel: formatRelativeTime(lastInteractionAt),
      status: normalizeStatus(conversation.status)
    };
  });
};

const FunnelColumn = ({
  stage,
  leads,
  isOver
}: {
  stage: (typeof pipelineStages)[number];
  leads: LeadCard[];
  isOver: boolean;
}) => {
  return (
    <div
      className={`flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors ${
        isOver ? "bg-white/10" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{stage.label}</h4>
          <p className="text-xs text-slate-400">{stage.description}</p>
        </div>
        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-200">
          {leads.length}
        </span>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <SortableContext items={leads.map((lead) => lead.id)}>
          {leads.map((lead) => (
            <LeadCardItem key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
            Arraste um lead para esta etapa.
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FunnelColumnDroppable = ({
  stage,
  leads
}: {
  stage: (typeof pipelineStages)[number];
  leads: LeadCard[];
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column", status: stage.id }
  });

  return (
    <div ref={setNodeRef} className="h-full">
      <FunnelColumn stage={stage} leads={leads} isOver={isOver} />
    </div>
  );
};

const LeadCardItem = ({ lead }: { lead: LeadCard }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: {
      type: "card",
      status: lead.status
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-100 shadow-sm transition ${
        isDragging ? "opacity-60" : "hover:border-blue-500/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold">{lead.name}</p>
        <span className="text-xs font-semibold text-emerald-300">
          {formatCurrencyBRL(lead.value)}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Última interação: {lead.lastInteractionLabel || "sem atividade"}
      </p>
    </div>
  );
};

export const SalesFunnelBoard = ({ conversations, loading, apiUrl }: SalesFunnelBoardProps) => {
  const [leadCards, setLeadCards] = useState<LeadCard[]>(() => buildLeadCards(conversations));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    setLeadCards(buildLeadCards(conversations));
  }, [conversations]);

  const leadsByStage = useMemo(() => {
    return pipelineStages.map((stage) => ({
      stage,
      leads: leadCards.filter((lead) => lead.status === stage.id)
    }));
  }, [leadCards]);

  const activeLead = useMemo(() => leadCards.find((lead) => lead.id === activeId) ?? null, [leadCards, activeId]);

  const updateLeadStatus = async (leadId: string, nextStatus: PipelineStage) => {
    const response = await fetch(`${apiUrl}/api/conversations/${leadId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ status: nextStatus })
    });

    if (!response.ok) {
      throw new Error("Não foi possível atualizar o status do lead.");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeLeadId = active.id as string;
    const overData = over.data.current as { type?: string; status?: PipelineStage } | undefined;

    const targetStatus = overData?.status;
    if (!targetStatus) return;

    const previousStatus = leadCards.find((lead) => lead.id === activeLeadId)?.status;
    if (!previousStatus || previousStatus === targetStatus) return;

    setLeadCards((prev) =>
      prev.map((lead) => (lead.id === activeLeadId ? { ...lead, status: targetStatus } : lead))
    );

    setBoardError(null);
    void (async () => {
      try {
        await updateLeadStatus(activeLeadId, targetStatus);
      } catch (error) {
        setLeadCards((prev) =>
          prev.map((lead) => (lead.id === activeLeadId ? { ...lead, status: previousStatus } : lead))
        );
        setBoardError(error instanceof Error ? error.message : "Erro ao atualizar o lead.");
      }
    })();
  };

  const handleDragStart = (event: { active: { id: string } }) => {
    setActiveId(event.active.id as string);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-900 bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-medium text-slate-100">Funil de vendas</h3>
        <p className="text-sm text-slate-400">Carregando leads...</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-100">Funil de vendas</h3>
          <p className="text-sm text-slate-400">
            Arraste os cards entre as etapas para atualizar o status em tempo real.
          </p>
        </div>
      </div>

      {boardError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {boardError}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {leadsByStage.map(({ stage, leads }) => (
            <FunnelColumnDroppable key={stage.id} stage={stage} leads={leads} />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/90 p-4 text-sm text-slate-100 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{activeLead.name}</p>
                <span className="text-xs font-semibold text-emerald-300">
                  {formatCurrencyBRL(activeLead.value)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Última interação: {activeLead.lastInteractionLabel || "sem atividade"}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
};
