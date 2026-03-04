import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Bot } from "lucide-react";

function OpenAINodeComponent({ data }: NodeProps<{ label?: string }>) {
  return (
    <Card className="min-w-[180px] shadow-md border-amber-500/30">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <CardHeader className="py-2 px-3 flex flex-row items-center gap-2">
        <div className="rounded bg-amber-500/10 p-1">
          <Bot className="w-4 h-4 text-amber-600" />
        </div>
        <span className="font-medium text-sm">{data?.label ?? "OpenAI"}</span>
      </CardHeader>
      <CardContent className="py-1 px-3 pb-2 text-xs text-muted-foreground">
        Resposta com IA
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-500" />
    </Card>
  );
}

export const OpenAINode = memo(OpenAINodeComponent);
