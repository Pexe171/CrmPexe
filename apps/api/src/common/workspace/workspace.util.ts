/**
 * Normaliza o workspaceId (trim). Retorna undefined se ausente ou string vazia após trim.
 */
export function normalizeWorkspaceId(workspaceId?: string | null): string | undefined {
  if (workspaceId == null) return undefined;
  const trimmed = workspaceId.trim();
  return trimmed === "" ? undefined : trimmed;
}
