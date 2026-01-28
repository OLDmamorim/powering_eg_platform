import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Edit, Shield, UserCog, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function GestaoUtilizadores() {
  const { language, t } = useLanguage();
  const [criandoUser, setCriandoUser] = useState(false);
  const [editandoUser, setEditandoUser] = useState<any | null>(null);
  const [eliminandoUser, setEliminandoUser] = useState<any | null>(null);
  const [eliminandoEmLote, setEliminandoEmLote] = useState(false);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [formData, setFormData] = useState<{ name: string; email: string; role: 'user' | 'admin' | 'gestor' }>({ name: "", email: "", role: "gestor" });
  const [novoUserData, setNovoUserData] = useState<{ name: string; email: string; role: 'user' | 'admin' | 'gestor' }>({ name: "", email: "", role: "gestor" });

  const { data: utilizadores, isLoading, refetch } = trpc.utilizadores.getAll.useQuery();
  
  const createMutation = trpc.utilizadores.create.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Utilizador criado com sucesso' : 'User created successfully');
      setCriandoUser(false);
      setNovoUserData({ name: "", email: "", role: "gestor" });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    },
  });

  const updateMutation = trpc.utilizadores.update.useMutation({
    onSuccess: () => {
      toast.success(t('common.sucesso'));
      setEditandoUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    },
  });

  const deleteMutation = trpc.utilizadores.delete.useMutation({
    onSuccess: () => {
      toast.success(t('common.sucesso'));
      setEliminandoUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    },
  });

  const deleteBatchMutation = trpc.utilizadores.deleteInBatch.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === 'pt' 
          ? `${data.deleted} utilizador(es) eliminado(s) com sucesso` 
          : `${data.deleted} user(s) deleted successfully`
      );
      setEliminandoEmLote(false);
      setSelecionados([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    },
  });

  const handleCreate = () => {
    if (!novoUserData.name || !novoUserData.email || !novoUserData.role) {
      toast.error(language === 'pt' ? 'Preencha todos os campos' : 'Fill all fields');
      return;
    }
    createMutation.mutate(novoUserData);
  };

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

  const handleDelete = () => {
    if (!eliminandoUser) return;
    deleteMutation.mutate({ userId: eliminandoUser.id });
  };

  const handleDeleteBatch = () => {
    if (selecionados.length === 0) return;
    deleteBatchMutation.mutate({ userIds: selecionados });
  };

  const handleToggleSelect = (userId: number) => {
    setSelecionados(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (!utilizadores) return;
    
    if (selecionados.length === utilizadores.length) {
      setSelecionados([]);
    } else {
      setSelecionados(utilizadores.map(u => u.id));
    }
  };

  const todosSeleccionados = useMemo(() => {
    return utilizadores && utilizadores.length > 0 && selecionados.length === utilizadores.length;
  }, [utilizadores, selecionados]);

  const algunsSeleccionados = useMemo(() => {
    return selecionados.length > 0 && (!utilizadores || selecionados.length < utilizadores.length);
  }, [utilizadores, selecionados]);

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      gestor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      user: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    const labels = {
      admin: "Admin",
      gestor: language === 'pt' ? "Gestor" : "Manager",
      user: language === 'pt' ? "Utilizador" : "User",
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
            {t('utilizadores.title') || (language === 'pt' ? "Gestão de Utilizadores" : "User Management")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('utilizadores.subtitle') || (language === 'pt' ? "Gerir utilizadores da plataforma" : "Manage platform users")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('utilizadores.title') || (language === 'pt' ? "Utilizadores" : "Users")}
                </CardTitle>
                <CardDescription>
                  {utilizadores?.length || 0} {language === 'pt' ? "utilizadores registados na plataforma" : "users registered on the platform"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCriandoUser(true)}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {language === 'pt' ? 'Novo Utilizador' : 'New User'}
                </Button>
                {selecionados.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setEliminandoEmLote(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {language === 'pt' 
                    ? `Eliminar ${selecionados.length} selecionado(s)` 
                    : `Delete ${selecionados.length} selected`}
                </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">{t('common.carregando')}</p>
            ) : !utilizadores || utilizadores.length === 0 ? (
              <p className="text-muted-foreground">{t('utilizadores.semUtilizadores') || (language === 'pt' ? "Nenhum utilizador encontrado" : "No users found")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium w-12">
                        <Checkbox
                          checked={todosSeleccionados}
                          onCheckedChange={handleSelectAll}
                          aria-label={language === 'pt' ? "Selecionar todos" : "Select all"}
                          className={algunsSeleccionados ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                      </th>
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">{t('utilizadores.nome') || (language === 'pt' ? "Nome" : "Name")}</th>
                      <th className="text-left p-3 font-medium">{t('utilizadores.email') || "Email"}</th>
                      <th className="text-left p-3 font-medium">{t('utilizadores.role') || "Role"}</th>
                      <th className="text-left p-3 font-medium">{language === 'pt' ? "Criado em" : "Created at"}</th>
                      <th className="text-left p-3 font-medium">{language === 'pt' ? "Último Login" : "Last Login"}</th>
                      <th className="text-right p-3 font-medium">{t('common.acoes') || (language === 'pt' ? "Ações" : "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilizadores.map((user) => (
                      <tr key={user.id} className={`border-b hover:bg-muted/50 ${selecionados.includes(user.id) ? 'bg-muted/30' : ''}`}>
                        <td className="p-3">
                          <Checkbox
                            checked={selecionados.includes(user.id)}
                            onCheckedChange={() => handleToggleSelect(user.id)}
                            aria-label={language === 'pt' ? `Selecionar ${user.name || user.email}` : `Select ${user.name || user.email}`}
                          />
                        </td>
                        <td className="p-3">{user.id}</td>
                        <td className="p-3 font-medium">{user.name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                        <td className="p-3">{getRoleBadge(user.role)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US')}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.lastSignedIn).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {t('common.editar') || (language === 'pt' ? "Editar" : "Edit")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEliminandoUser(user)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t('common.eliminar') || (language === 'pt' ? "Eliminar" : "Delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criação */}
        <Dialog open={criandoUser} onOpenChange={setCriandoUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {language === 'pt' ? 'Criar Novo Utilizador' : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {language === 'pt' ? "Adicionar um novo utilizador à plataforma" : "Add a new user to the platform"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="novo-name">{language === 'pt' ? "Nome" : "Name"}</Label>
                <Input
                  id="novo-name"
                  value={novoUserData.name}
                  onChange={(e) => setNovoUserData({ ...novoUserData, name: e.target.value })}
                  placeholder={language === 'pt' ? "Nome completo" : "Full name"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="novo-email">{language === 'pt' ? "Email" : "Email"}</Label>
                <Input
                  id="novo-email"
                  type="email"
                  value={novoUserData.email}
                  onChange={(e) => setNovoUserData({ ...novoUserData, email: e.target.value })}
                  placeholder={language === 'pt' ? "email@exemplo.com" : "email@example.com"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="novo-role">{language === 'pt' ? "Role / Permissões" : "Role / Permissions"}</Label>
                <Select
                  value={novoUserData.role}
                  onValueChange={(value) => setNovoUserData({ ...novoUserData, role: value as 'user' | 'admin' | 'gestor' })}
                >
                  <SelectTrigger id="novo-role">
                    <SelectValue placeholder={language === 'pt' ? "Selecionar role" : "Select role"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{language === 'pt' ? "Utilizador (User)" : "User"}</SelectItem>
                    <SelectItem value="gestor">{language === 'pt' ? "Gestor" : "Manager"}</SelectItem>
                    <SelectItem value="admin">{language === 'pt' ? "Administrador (Admin)" : "Administrator (Admin)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCriandoUser(false)}>
                {t('common.cancelar')}
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? (language === 'pt' ? 'A criar...' : 'Creating...')
                  : (language === 'pt' ? 'Criar Utilizador' : 'Create User')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={!!editandoUser} onOpenChange={(open) => !open && setEditandoUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                {language === 'pt' ? `Editar Utilizador #${editandoUser?.id}` : `Edit User #${editandoUser?.id}`}
              </DialogTitle>
              <DialogDescription>
                {language === 'pt' ? "Alterar nome, email ou role do utilizador" : "Change user name, email or role"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{language === 'pt' ? "Nome" : "Name"}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={language === 'pt' ? "Nome completo" : "Full name"}
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
                <Label htmlFor="role">{language === 'pt' ? "Role / Permissões" : "Role / Permissions"}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as 'user' | 'admin' | 'gestor' })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder={language === 'pt' ? "Selecionar role" : "Select role"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{language === 'pt' ? "Utilizador (User)" : "User"}</SelectItem>
                    <SelectItem value="gestor">{language === 'pt' ? "Gestor" : "Manager"}</SelectItem>
                    <SelectItem value="admin">{language === 'pt' ? "Administrador (Admin)" : "Administrator (Admin)"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {language === 'pt' 
                    ? "Admin: acesso total | Gestor: gestão de lojas | User: acesso básico"
                    : "Admin: full access | Manager: store management | User: basic access"}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoUser(null)}>
                {t('common.cancelar') || (language === 'pt' ? "Cancelar" : "Cancel")}
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending 
                  ? (language === 'pt' ? "A guardar..." : "Saving...") 
                  : (t('common.guardar') || (language === 'pt' ? "Guardar Alterações" : "Save Changes"))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Eliminação Individual */}
        <Dialog open={!!eliminandoUser} onOpenChange={(open) => !open && setEliminandoUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                {language === 'pt' ? "Eliminar Utilizador?" : "Delete User?"}
              </DialogTitle>
              <DialogDescription>
                {language === 'pt' 
                  ? <>Tem a certeza que pretende eliminar permanentemente o utilizador <strong>{eliminandoUser?.name || eliminandoUser?.email || `#${eliminandoUser?.id}`}</strong>?<br /><span className="text-red-600 font-medium">Esta ação não pode ser revertida.</span></>
                  : <>Are you sure you want to permanently delete user <strong>{eliminandoUser?.name || eliminandoUser?.email || `#${eliminandoUser?.id}`}</strong>?<br /><span className="text-red-600 font-medium">This action cannot be undone.</span></>}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEliminandoUser(null)}>
                {t('common.cancelar') || (language === 'pt' ? "Cancelar" : "Cancel")}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending 
                  ? (language === 'pt' ? "A eliminar..." : "Deleting...") 
                  : (language === 'pt' ? "Eliminar Definitivamente" : "Delete Permanently")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Eliminação em Lote */}
        <Dialog open={eliminandoEmLote} onOpenChange={setEliminandoEmLote}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                {language === 'pt' ? "Eliminar Utilizadores em Lote?" : "Delete Users in Batch?"}
              </DialogTitle>
              <DialogDescription>
                {language === 'pt' 
                  ? <>Tem a certeza que pretende eliminar permanentemente <strong>{selecionados.length} utilizador(es)</strong>?<br /><span className="text-red-600 font-medium">Esta ação não pode ser revertida.</span></>
                  : <>Are you sure you want to permanently delete <strong>{selecionados.length} user(s)</strong>?<br /><span className="text-red-600 font-medium">This action cannot be undone.</span></>}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'pt' ? "Utilizadores selecionados:" : "Selected users:"}
              </p>
              <div className="max-h-40 overflow-y-auto bg-muted/50 rounded-md p-2">
                {utilizadores?.filter(u => selecionados.includes(u.id)).map(user => (
                  <div key={user.id} className="text-sm py-1">
                    <span className="font-medium">{user.name || user.email || `#${user.id}`}</span>
                    {user.name && user.email && <span className="text-muted-foreground ml-2">({user.email})</span>}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEliminandoEmLote(false)}>
                {t('common.cancelar') || (language === 'pt' ? "Cancelar" : "Cancel")}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteBatch} 
                disabled={deleteBatchMutation.isPending}
              >
                {deleteBatchMutation.isPending 
                  ? (language === 'pt' ? "A eliminar..." : "Deleting...") 
                  : (language === 'pt' ? `Eliminar ${selecionados.length} Utilizador(es)` : `Delete ${selecionados.length} User(s)`)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
