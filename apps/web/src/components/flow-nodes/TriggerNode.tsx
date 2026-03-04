import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Zap } from "lucide-react";

function TriggerNodeComponent({ data }: NodeProps<{ label?: string }>) {
  return (
    <Card className="min-w-[180px] shadow-md border-primary/30">
      <CardHeader className="py-2 px-3 flex flex-row items-center gap-2">
        <div className="rounded bg-primary/10 p-1">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium text-sm">{data?.label ?? "Gatilho"}</span>
      </CardHeader>
      <CardContent className="py-1 px-3 pb-2 text-xs text-muted-foreground">
        Início do fluxo
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary" />
    </Card>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
