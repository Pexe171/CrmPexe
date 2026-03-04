import { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node
} from "reactflow";
import "reactflow/dist/style.css";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { automationsApi } from "@/lib/api/automations";
import { nodeTypes } from "@/components/flow-nodes";
import { Save, Zap, MessageSquare, Bot } from "lucide-react";

const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 250, y: 0 },
    data: { label: "Início" }
  }
];

const initialEdges: Edge[] = [];

export default function FlowBuilderPage() {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flowName, setFlowName] = useState("Meu fluxo");

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (type: "trigger" | "action" | "openai") => {
      const id = `${type}-${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position: { x: 250 + (nds.length * 20) % 300, y: 100 + nds.length * 120 },
          data: { label: type === "trigger" ? "Gatilho" : type === "action" ? "Ação" : "OpenAI" }
        }
      ]);
    },
    [setNodes]
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      automationsApi.saveFlow({
        name: flowName.trim() || "Meu fluxo",
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle
        }))
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-templates"] });
    }
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-0px)]">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="w-48"
              placeholder="Nome do fluxo"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addNode("trigger")}
                className="gap-1"
              >
                <Zap className="w-4 h-4" />
                Gatilho
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addNode("action")}
                className="gap-1"
              >
                <MessageSquare className="w-4 h-4" />
                Ação
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addNode("openai")}
                className="gap-1"
              >
                <Bot className="w-4 h-4" />
                OpenAI
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </DashboardLayout>
  );
}
