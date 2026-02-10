const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type WorkspaceMemberSummary = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

export async function fetchWorkspaceMembers(
  workspaceId: string,
  signal?: AbortSignal
) {
  const response = await fetch(
    `${apiUrl}/api/support/workspaces/${workspaceId}/members`,
    {
      credentials: "include",
      signal
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar os membros do workspace.");
  }

  return (await response.json()) as WorkspaceMemberSummary[];
}
