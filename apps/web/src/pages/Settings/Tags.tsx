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
import { tagsApi, type Tag } from "@/lib/api/tags";
import { useAuthMe } from "@/hooks/useAuthMe";
import { MoreHorizontal, Plus, Tag, Loader2, Pencil, Trash2 } from "lucide-react";

export default function SettingsTagsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useAuthMe();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsApi.list(),
    enabled: !!me?.currentWorkspaceId
  });

  const createMutation = useMutation({
    mutationFn: () => tagsApi.create({ name: name.trim(), color: color.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setDialogOpen(false);
      setName("");
      setColor("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      editing ? tagsApi.update(editing.id, { name: name.trim(), color: color.trim() || null }) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setDialogOpen(false);
      setEditing(null);
      setName("");
      setColor("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] })
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor("");
    setDialogOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color ?? "");
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
            <Tag className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Tags</h1>
          </div>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="w-4 h-4" /> Nova tag
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
                  <TableHead>Cor</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhuma tag. Clique em &quot;Nova tag&quot; para criar.
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        {tag.color && (
                          <span
                            className="inline-block w-4 h-4 rounded-full border"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tag.color || "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(tag)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Excluir a tag "${tag.name}"?`)) deleteMutation.mutate(tag.id);
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
              <DialogTitle>{editing ? "Editar tag" : "Nova tag"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: VIP" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cor (opcional)</label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3b82f6" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
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
