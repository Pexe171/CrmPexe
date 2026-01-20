import { Button } from "@/components/ui/button";

const workspaces = [
  {
    id: "ws-1",
    name: "Equipe Comercial",
    members: 12,
    current: true
  },
  {
    id: "ws-2",
    name: "Atendimento Norte",
    members: 8,
    current: false
  },
  {
    id: "ws-3",
    name: "Marketing & Growth",
    members: 5,
    current: false
  }
];

export default function WorkspacesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Workspaces</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Selecione o workspace para continuar
          </h1>
          <p className="text-sm text-gray-500">
            Gerencie ou crie um novo workspace para sua equipe.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Seus workspaces
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {workspace.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {workspace.members} membros ativos
                    </p>
                  </div>
                  {workspace.current && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Atual
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={workspace.current}
                  >
                    {workspace.current ? "Em uso" : "Selecionar"}
                  </Button>
                  <Button variant="outline">Configurar</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            Criar novo workspace
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Defina um nome e comece a organizar seu time.
          </p>
          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium text-gray-700" htmlFor="workspace-name">
              Nome do workspace
            </label>
            <input
              id="workspace-name"
              type="text"
              placeholder="Ex: Operações Brasil"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Criar workspace
            </Button>
            <p className="text-xs text-gray-400">
              As permissões e equipes podem ser configuradas depois.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
