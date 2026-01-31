"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";

type ExecutionStatus = "Sucesso" | "Erro";

type ExecutionRecord = {
  id: string;
  date: string;
  duration: string;
  status: ExecutionStatus;
  input: string;
  output: string;
};

const executionData: ExecutionRecord[] = [
  {
    id: "exec-9042",
    date: "2024-09-18T15:42:10.000Z",
    duration: "2m 14s",
    status: "Sucesso",
    input: `{"trigger":"novo_lead","origem":"landing-page","contato":{"nome":"Mariana Souza","email":"mariana@empresa.com"}}`,
    output: `{"resultado":"lead_qualificado","pipeline":"Pré-vendas","responsavel":"Camila Ramos","sla":"dentro_do_prazo"}`
  },
  {
    id: "exec-9037",
    date: "2024-09-18T13:11:45.000Z",
    duration: "48s",
    status: "Erro",
    input: `{"trigger":"webhook","origem":"integração-hubspot","payload":{"id":"hs_1182","evento":"deal_created"}}`,
    output: `{"erro":"Falha ao sincronizar com o CRM externo","detalhe":"Token expirado","acao_recomendada":"Renovar credenciais"}`
  },
  {
    id: "exec-9029",
    date: "2024-09-18T11:05:02.000Z",
    duration: "1m 05s",
    status: "Sucesso",
    input: `{"trigger":"formulario","campanha":"Outbound 09/2024","lead":{"nome":"André Lima","telefone":"+55 11 99999-0000"}}`,
    output: `{"resultado":"lead_enriquecido","telefone_validado":true,"mensagem":"Lead encaminhado ao SDR"}`
  },
  {
    id: "exec-9001",
    date: "2024-09-17T19:27:31.000Z",
    duration: "3m 32s",
    status: "Erro",
    input: `{"trigger":"importacao_manual","arquivo":"leads_q3.csv","total_registros":120}`,
    output: `{"erro":"Tempo limite ao processar lote","detalhe":"Timeout na fila de enriquecimento","reprocessar":true}`
  }
];

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  });

const statusStyles: Record<ExecutionStatus, string> = {
  Sucesso: "bg-emerald-500/10 text-emerald-500",
  Erro: "bg-red-500/10 text-red-500"
};

export default function AutomationHistoryPage() {
  const params = useParams<{ automationId: string }>();
  const automationId = params?.automationId ?? "";
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);

  const executions = useMemo(
    () => [...executionData].sort((a, b) => b.date.localeCompare(a.date)),
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-emerald-400">Automações</p>
          <h1 className="text-2xl font-semibold text-white">Histórico de execuções</h1>
          <p className="text-sm text-slate-300">
            Automação <span className="font-medium text-slate-100">{automationId}</span>
          </p>
        </header>

        <section className="rounded-2xl border border-blue-500/20 bg-slate-900 shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_24px_60px_-32px_rgba(59,130,246,0.45)]">
          <div className="border-b border-blue-500/10 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-100">Execuções recentes</h2>
            <p className="text-sm text-slate-400">
              Lista cronológica de execuções com detalhes de input e output.
            </p>
          </div>
          <div className="divide-y divide-blue-500/10">
            <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.5fr] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>ID</span>
              <span>Data</span>
              <span>Duração</span>
              <span>Status</span>
              <span className="text-right">Ação</span>
            </div>
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.5fr] items-center gap-4 px-6 py-4 text-sm text-slate-200 hover:bg-slate-800/60"
              >
                <span className="font-medium text-white">{execution.id}</span>
                <span>{formatDate(execution.date)}</span>
                <span>{execution.duration}</span>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[execution.status]}`}>
                  {execution.status}
                </span>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedExecution(execution)}
                  >
                    Ver detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Sheet open={Boolean(selectedExecution)} onOpenChange={(open) => !open && setSelectedExecution(null)}>
          <SheetContent side="right" className="gap-6 border-blue-500/20 bg-slate-950 text-slate-100">
            <SheetHeader>
              <SheetTitle>Detalhes da execução</SheetTitle>
              <SheetDescription>
                {selectedExecution
                  ? `Execução ${selectedExecution.id} • ${formatDate(selectedExecution.date)}`
                  : ""}
              </SheetDescription>
            </SheetHeader>

            {selectedExecution ? (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedExecution.status]}`}>
                    {selectedExecution.status}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                    Duração {selectedExecution.duration}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">Input (gatilho)</h3>
                  <pre className="whitespace-pre-wrap rounded-lg border border-blue-500/20 bg-slate-900/70 p-4 text-xs font-mono text-slate-200">
                    {selectedExecution.input}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">Output (resultado)</h3>
                  <pre className="whitespace-pre-wrap rounded-lg border border-blue-500/20 bg-slate-900/70 p-4 text-xs font-mono text-slate-200">
                    {selectedExecution.output}
                  </pre>
                </div>
              </div>
            ) : null}

            <SheetClose asChild>
              <Button variant="outline">Fechar</Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
