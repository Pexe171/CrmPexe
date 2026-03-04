import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

function ActionNodeComponent({ data }: NodeProps<{ label?: string }>) {
  return (
    <Card className="min-w-[180px] shadow-md">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <CardHeader className="py-2 px-3 flex flex-row items-center gap-2">
        <div className="rounded bg-muted p-1">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-sm">{data?.label ?? "Ação"}</span>
      </CardHeader>
      <CardContent className="py-1 px-3 pb-2 text-xs text-muted-foreground">
        Enviar mensagem ou ação
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </Card>
  );
}

export const ActionNode = memo(ActionNodeComponent);
