import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Edit, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";

export default function GestaoUtilizadores() {
  const [editandoUser, setEditandoUser] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "" });

  const { data: utilizadores, isLoading, refetch } = trpc.utilizadores.getAll.useQuery();
  const updateMutation = trpc.utilizadores.update.useMutation({
    onSuccess: () => {
      toast.success("Utilizador atualizado com sucesso!");
      setEditandoUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleEdit = (user: any) => {
    setEditandoUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "gestor",
    });
  };

  const handleSave = () => {
    if (!editandoUser) return;

    updateMutation.mutate({
      userId: editandoUser.id,
      name: formData.name,
      email: formData.email,
      role: formData.role as 'user' | 'admin' | 'gestor',
    });
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      gestor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      user: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    const labels = {
      admin: "Admin",
      gestor: "Gestor",
      user: "Utilizador",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestão de Utilizadores
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerir utilizadores, roles e permissões da plataforma
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Todos os Utilizadores
            </CardTitle>
            <CardDescription>
              {utilizadores?.length || 0} utilizadores registados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">A carregar utilizadores...</p>
            ) : !utilizadores || utilizadores.length === 0 ? (
              <p className="text-muted-foreground">Nenhum utilizador encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Criado em</th>
                      <th className="text-left p-3 font-medium">Último Login</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilizadores.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">{user.id}</td>
                        <td className="p-3 font-medium">{user.name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                        <td className="p-3">{getRoleBadge(user.role)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.lastSignedIn).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={!!editandoUser} onOpenChange={(open) => !open && setEditandoUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Editar Utilizador #{editandoUser?.id}
              </DialogTitle>
              <DialogDescription>
                Alterar nome, email ou role do utilizador
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role / Permissões</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecionar role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilizador (User)</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador (Admin)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admin: acesso total | Gestor: gestão de lojas | User: acesso básico
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "A guardar..." : "Guardar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
