"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELED";

type Task = {
  id: string;
  title: string;
  dueAt?: string | null;
  status: TaskStatus;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  relatedType?: string | null;
  relatedId?: string | null;
  createdAt: string;
};

const statusLabel: Record<TaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELED: "Cancelada"
};

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  CANCELED: "bg-gray-100 text-gray-600"
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Sem prazo";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Prazo inválido";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

export function TaskOverview() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar as tarefas.");
      }

      const data = (await response.json()) as Task[];
      setTasks(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar tarefas."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks();
  }, []);

  const reminders = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const isOpen = (task: Task) =>
      task.status !== "DONE" && task.status !== "CANCELED";

    const overdue = tasks.filter((task) => {
      if (!isOpen(task) || !task.dueAt) {
        return false;
      }
      return new Date(task.dueAt) < now;
    });

    const dueSoon = tasks.filter((task) => {
      if (!isOpen(task) || !task.dueAt) {
        return false;
      }
      const dueDate = new Date(task.dueAt);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    });

    return { overdue, dueSoon };
  }, [tasks]);

  return (
    <div className="grid gap-4 md:grid-cols-7">
      <div className="col-span-4 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Tarefas do Workspace
            </h3>
            <p className="text-sm text-gray-500">
              Acompanhe o que precisa ser entregue.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasks}
            disabled={loading}
          >
            Atualizar
          </Button>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">
              Carregando tarefas...
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              Nenhuma tarefa cadastrada ainda.
            </div>
          ) : (
            tasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {task.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[task.status]}`}
                    >
                      {statusLabel[task.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {task.assignedTo
                      ? `Responsável: ${task.assignedTo.name}`
                      : "Sem responsável"}
                  </div>
                  {task.relatedType && task.relatedId ? (
                    <div className="text-xs text-gray-400">
                      Relacionado: {task.relatedType} · {task.relatedId}
                    </div>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500">
                  Prazo: {formatDate(task.dueAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-3 rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Lembretes</h3>
          <p className="text-sm text-gray-500">Prazos críticos da semana.</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-xs uppercase text-red-500">Atrasadas</p>
            <p className="text-2xl font-semibold text-red-600">
              {reminders.overdue.length}
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs uppercase text-blue-500">Próximos 7 dias</p>
            <p className="text-2xl font-semibold text-blue-600">
              {reminders.dueSoon.length}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Próximas entregas
            </p>
            {reminders.dueSoon.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                Nenhum prazo crítico nos próximos dias.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs text-gray-600">
                {reminders.dueSoon.slice(0, 3).map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="text-gray-500">
                      {formatDate(task.dueAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
