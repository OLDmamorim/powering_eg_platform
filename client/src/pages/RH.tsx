import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, UserPlus, Store, Car, Pencil, Trash2, Search } from "lucide-react";

export default function RH() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLoja, setFilterLoja] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  
  // Form state
  const [formData, setFormData] = useState({
    id: 0,
    nome: "",
    codigoColaborador: "",
    lojaId: null as number | null,
    isVolante: false,
  });

  // Queries
  const { data: colaboradores, isLoading, refetch } = trpc.colaboradores.list.useQuery();
  const { data: lojas } = trpc.lojas.list.useQuery();
  
  // Mutations
  const createMutation = trpc.colaboradores.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar colaborador: ${error.message}`);
    },
  });

  const updateMutation = trpc.colaboradores.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar colaborador: ${error.message}`);
    },
  });

  const deleteMutation = trpc.colaboradores.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador removido com sucesso!");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover colaborador: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      id: 0,
      nome: "",
      codigoColaborador: "",
      lojaId: null,
      isVolante: false,
    });
  };

  const handleCreate = () => {
    if (!formData.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    if (!formData.isVolante && !formData.lojaId) {
      toast.error("Selecione uma loja ou marque como volante");
      return;
    }
    
    createMutation.mutate({
      nome: formData.nome.trim(),
      codigoColaborador: formData.codigoColaborador.trim() || null,
      lojaId: formData.isVolante ? null : formData.lojaId,
      isVolante: formData.isVolante,
    });
  };

  const handleUpdate = () => {
    if (!formData.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    
    updateMutation.mutate({
      id: formData.id,
      nome: formData.nome.trim(),
      codigoColaborador: formData.codigoColaborador.trim() || null,
      lojaId: formData.isVolante ? null : formData.lojaId,
      isVolante: formData.isVolante,
    });
  };

  const openEditDialog = (colaborador: any) => {
    setFormData({
      id: colaborador.id,
      nome: colaborador.nome,
      codigoColaborador: colaborador.codigoColaborador || "",
      lojaId: colaborador.lojaId,
      isVolante: colaborador.isVolante,
    });
    setIsEditOpen(true);
  };

  // Filter colaboradores
  const filteredColaboradores = colaboradores?.filter((c) => {
    const matchesSearch = 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.codigoColaborador?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLoja = filterLoja === "all" || 
      (filterLoja === "volante" && c.isVolante) ||
      (c.lojaId?.toString() === filterLoja);
    
    const matchesTipo = filterTipo === "all" ||
      (filterTipo === "loja" && !c.isVolante) ||
      (filterTipo === "volante" && c.isVolante);
    
    return matchesSearch && matchesLoja && matchesTipo;
  }) || [];

  // Stats
  const totalColaboradores = colaboradores?.length || 0;
  const totalVolantes = colaboradores?.filter(c => c.isVolante).length || 0;
  const totalLojas = colaboradores?.filter(c => !c.isVolante).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground">
            Gestão de colaboradores das lojas e volantes
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Colaborador</DialogTitle>
              <DialogDescription>
                Adicione um novo colaborador a uma loja ou como volante da zona
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do colaborador"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="codigo">Código do Colaborador</Label>
                <Input
                  id="codigo"
                  value={formData.codigoColaborador}
                  onChange={(e) => setFormData({ ...formData, codigoColaborador: e.target.value })}
                  placeholder="Código (opcional)"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Tabs 
                  value={formData.isVolante ? "volante" : "loja"} 
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    isVolante: v === "volante",
                    lojaId: v === "volante" ? null : formData.lojaId
                  })}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="loja">
                      <Store className="mr-2 h-4 w-4" />
                      Loja
                    </TabsTrigger>
                    <TabsTrigger value="volante">
                      <Car className="mr-2 h-4 w-4" />
                      Volante
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {!formData.isVolante && (
                <div className="grid gap-2">
                  <Label htmlFor="loja">Loja *</Label>
                  <Select
                    value={formData.lojaId?.toString() || ""}
                    onValueChange={(v) => setFormData({ ...formData, lojaId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas?.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id.toString()}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.isVolante && (
                <p className="text-sm text-muted-foreground">
                  O colaborador volante ficará associado à sua zona de gestão e poderá ser alocado a qualquer loja conforme necessário.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "A criar..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalColaboradores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Lojas</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLojas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volantes</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolantes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
          <CardDescription>Lista de todos os colaboradores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="loja">Em Loja</SelectItem>
                <SelectItem value="volante">Volantes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLoja} onValueChange={setFilterLoja}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                <SelectItem value="volante">Volantes</SelectItem>
                {lojas?.map((loja) => (
                  <SelectItem key={loja.id} value={loja.id.toString()}>
                    {loja.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredColaboradores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {colaboradores?.length === 0 
                ? "Nenhum colaborador registado. Clique em 'Novo Colaborador' para adicionar."
                : "Nenhum colaborador encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Loja / Zona</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores.map((colaborador) => (
                    <TableRow key={colaborador.id}>
                      <TableCell className="font-medium">{colaborador.nome}</TableCell>
                      <TableCell>{colaborador.codigoColaborador || "-"}</TableCell>
                      <TableCell>
                        {colaborador.isVolante ? (
                          <Badge variant="secondary">
                            <Car className="mr-1 h-3 w-3" />
                            Volante
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Store className="mr-1 h-3 w-3" />
                            Loja
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {colaborador.isVolante 
                          ? (colaborador as any).gestorNome || "Zona do Gestor"
                          : (colaborador as any).lojaNome || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(colaborador)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(colaborador.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Atualize os dados do colaborador
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do colaborador"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-codigo">Código do Colaborador</Label>
              <Input
                id="edit-codigo"
                value={formData.codigoColaborador}
                onChange={(e) => setFormData({ ...formData, codigoColaborador: e.target.value })}
                placeholder="Código (opcional)"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Tabs 
                value={formData.isVolante ? "volante" : "loja"} 
                onValueChange={(v) => setFormData({ 
                  ...formData, 
                  isVolante: v === "volante",
                  lojaId: v === "volante" ? null : formData.lojaId
                })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="loja">
                    <Store className="mr-2 h-4 w-4" />
                    Loja
                  </TabsTrigger>
                  <TabsTrigger value="volante">
                    <Car className="mr-2 h-4 w-4" />
                    Volante
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {!formData.isVolante && (
              <div className="grid gap-2">
                <Label htmlFor="edit-loja">Loja *</Label>
                <Select
                  value={formData.lojaId?.toString() || ""}
                  onValueChange={(v) => setFormData({ ...formData, lojaId: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas?.map((loja) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover este colaborador? Esta ação pode ser revertida mais tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
