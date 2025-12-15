import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Building2, Edit, Plus, Trash2, User, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Gestores() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGestor, setSelectedGestor] = useState<any>(null);
  const [selectedLojas, setSelectedLojas] = useState<number[]>([]);
  const [formData, setFormData] = useState({ nome: "", email: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: 0, nome: "", email: "" });

  const utils = trpc.useUtils();
  const { data: gestores, isLoading } = trpc.gestores.list.useQuery();
  const { data: lojas } = trpc.lojas.list.useQuery();
  const { data: gestorLojas } = trpc.gestores.getLojas.useQuery(
    { gestorId: selectedGestor?.id },
    { enabled: !!selectedGestor }
  );

  const associateMutation = trpc.gestores.associateLoja.useMutation({
    onSuccess: () => {
      toast.success("Loja associada com sucesso");
      utils.gestores.getLojas.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = trpc.gestores.removeLoja.useMutation({
    onSuccess: () => {
      toast.success("Loja removida com sucesso");
      utils.gestores.getLojas.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createMutation = trpc.gestores.create.useMutation({
    onSuccess: () => {
      toast.success("Gestor criado com sucesso");
      utils.gestores.list.invalidate();
      setCreateDialogOpen(false);
      setFormData({ nome: "", email: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.gestores.delete.useMutation({
    onSuccess: () => {
      toast.success("Gestor eliminado com sucesso");
      utils.gestores.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const promoteMutation = trpc.gestores.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Gestor promovido a Admin com sucesso");
      utils.gestores.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.gestores.update.useMutation({
    onSuccess: () => {
      toast.success("Gestor atualizado com sucesso");
      utils.gestores.list.invalidate();
      setEditDialogOpen(false);
      setEditFormData({ id: 0, nome: "", email: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const handleOpenDialog = (gestor: any) => {
    setSelectedGestor(gestor);
    setDialogOpen(true);
  };

  const handleToggleLoja = (lojaId: number, isAssociated: boolean) => {
    if (!selectedGestor) return;

    if (isAssociated) {
      removeMutation.mutate({ gestorId: selectedGestor.id, lojaId });
    } else {
      associateMutation.mutate({ gestorId: selectedGestor.id, lojaId });
    }
  };

  const handleDelete = (id: number) => {
    if (
      confirm(
        "Tem a certeza que deseja eliminar este gestor? Todas as associações com lojas serão removidas."
      )
    ) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePromote = (gestorId: number, gestorName: string) => {
    if (
      confirm(
        `Tem a certeza que deseja promover ${gestorName} a Admin? Esta ação dará acesso total ao sistema.`
      )
    ) {
      promoteMutation.mutate({ gestorId });
    }
  };

  const handleEdit = (gestor: any) => {
    setEditFormData({
      id: gestor.id,
      nome: gestor.user.name || "",
      email: gestor.user.email || "",
    });
    setEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestores</h1>
            <p className="text-muted-foreground">
              Gerir gestores e associações com lojas
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Gestor
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestores && gestores.length > 0 ? (
                  gestores.map((gestor: any) => (
                    <TableRow key={gestor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {gestor.user.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{gestor.user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{gestor.user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(gestor)}
                            title="Editar gestor"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(gestor)}
                            title="Gerir lojas"
                          >
                            <Building2 className="h-4 w-4" />
                          </Button>
                          {gestor.user.role !== "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePromote(gestor.id, gestor.user.name)}
                              title="Promover a Admin"
                            >
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(gestor.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum gestor registado
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Gestor</DialogTitle>
            <DialogDescription>
              Criar um novo gestor. Após a criação, poderá associar lojas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerir Lojas - {selectedGestor?.user.name}</DialogTitle>
            <DialogDescription>
              Selecione as lojas que este gestor pode supervisionar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {lojas && lojas.length > 0 ? (
              lojas.map((loja: any) => {
                const isAssociated = gestorLojas?.some(
                  (gl: any) => gl.id === loja.id
                );
                return (
                  <div
                    key={loja.id}
                    className="flex items-center space-x-3 border-b pb-3 last:border-0"
                  >
                    <Checkbox
                      id={`loja-${loja.id}`}
                      checked={isAssociated}
                      onCheckedChange={() =>
                        handleToggleLoja(loja.id, !!isAssociated)
                      }
                      disabled={
                        associateMutation.isPending || removeMutation.isPending
                      }
                    />
                    <Label
                      htmlFor={`loja-${loja.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{loja.nome}</p>
                      </div>
                    </Label>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma loja disponível
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Gestor */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gestor</DialogTitle>
            <DialogDescription>
              Atualizar os dados do gestor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(editFormData);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  value={editFormData.nome}
                  onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
