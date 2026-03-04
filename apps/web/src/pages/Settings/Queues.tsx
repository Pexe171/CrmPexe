import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queuesApi, type Queue } from "@/lib/api/queues";
import { useAuthMe } from "@/hooks/useAuthMe";
import { MoreHorizontal, Plus, ListOrdered, Loader2, Pencil, Trash2 } from "lucide-react";

export default function SettingsQueuesPage() {
  const queryClient = useQueryClient();
  const { data: me } = useAuthMe();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Queue | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [teamId, setTeamId] = useState("");

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ["queues"],
    queryFn: () => queuesApi.list(),
    enabled: !!me?.currentWorkspaceId
  });

  const createMutation = useMutation({
    mutationFn: () =>
      queuesApi.create({
        name: name.trim(),
        channel: channel.trim(),
        teamId: teamId.trim()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      editing
        ? queuesApi.update(editing.id, {
            name: name.trim(),
            channel: channel.trim(),
            teamId: teamId.trim()
          })
        : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => queuesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queues"] })
  });

  function resetForm() {
    setName("");
    setChannel("whatsapp");
    setTeamId("");
  }

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (q: Queue) => {
    setEditing(q);
    setName(q.name);
    setChannel(q.channel);
    setTeamId(q.teamId);
    setDialogOpen(true);
  };

  const submit = () => {
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Filas</h1>
          </div>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="w-4 h-4" /> Nova fila
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Time ID</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma fila. Crie um time antes e depois adicione filas.
                    </TableCell>
                  </TableRow>
                ) : (
                  queues.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell>{q.channel}</TableCell>
                      <TableCell>{q.teamId}</TableCell>
                      <TableCell>{q.isActive ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(q)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Excluir a fila "${q.name}"?`)) deleteMutation.mutate(q.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar fila" : "Nova fila"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Suporte" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="whatsapp" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ID do time</label>
                <Input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="UUID do time" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={
                  !name.trim() || !channel.trim() || !teamId.trim() || createMutation.isPending || updateMutation.isPending
                }
              >
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
