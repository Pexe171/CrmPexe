import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";
import { OpenAINode } from "./OpenAINode";

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  openai: OpenAINode
};

export { TriggerNode, ActionNode, OpenAINode };
