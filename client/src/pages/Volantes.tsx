import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Mail, 
  Phone, 
  Store, 
  Key,
  Send,
  Copy,
  Check,
  Car,
  Calendar
} from "lucide-react";

export default function Volantes() {
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVolante, setEditingVolante] = useState<any>(null);
  const [lojasDialogOpen, setLojasDialogOpen] = useState(false);
  const [selectedVolanteForLojas, setSelectedVolanteForLojas] = useState<any>(null);
  const [selectedLojaIds, setSelectedLojaIds] = useState<number[]>([]);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  
  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  
  // Queries
  const { data: volantes, isLoading, refetch } = trpc.volantes.listar.useQuery();
  const { data: lojasDisponiveis } = trpc.volantes.lojasDisponiveis.useQuery();
  
  // Mutations
  const criarVolante = trpc.volantes.criar.useMutation({
    onSuccess: () => {
      toast.success("Volante criado com sucesso!");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar volante", { description: error.message });
    },
  });
  
  const atualizarVolante = trpc.volantes.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Volante atualizado com sucesso!");
      setDialogOpen(false);
      setEditingVolante(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar volante", { description: error.message });
    },
  });
  
  const eliminarVolante = trpc.volantes.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Volante eliminado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao eliminar volante", { description: error.message });
    },
  });
  
  const atribuirLojas = trpc.volantes.atribuirLojas.useMutation({
    onSuccess: () => {
      toast.success("Lojas atribuídas com sucesso!");
      setLojasDialogOpen(false);
      setSelectedVolanteForLojas(null);
      setSelectedLojaIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atribuir lojas", { description: error.message });
    },
  });
  
  const criarToken = trpc.volantes.criarToken.useMutation({
    onSuccess: () => {
      toast.success("Token criado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar token", { description: error.message });
    },
  });
  
  const enviarTokenEmail = trpc.volantes.enviarTokenEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao enviar email", { description: error.message });
    },
  });
  
  const resetForm = () => {
    setNome("");
    setEmail("");
    setTelefone("");
  };
  
  const handleOpenDialog = (volante?: any) => {
    if (volante) {
      setEditingVolante(volante);
      setNome(volante.nome);
      setEmail(volante.email || "");
      setTelefone(volante.telefone || "");
    } else {
      setEditingVolante(null);
      resetForm();
    }
    setDialogOpen(true);
  };
  
  const handleSubmit = () => {
    if (editingVolante) {
      atualizarVolante.mutate({
        id: editingVolante.id,
        nome,
        email: email || null,
        telefone: telefone || null,
      });
    } else {
      criarVolante.mutate({
        nome,
        email: email || undefined,
        telefone: telefone || undefined,
      });
    }
  };
  
  const handleOpenLojasDialog = (volante: any) => {
    setSelectedVolanteForLojas(volante);
    setSelectedLojaIds(volante.lojas?.map((l: any) => l.id) || []);
    setLojasDialogOpen(true);
  };
  
  const handleAtribuirLojas = () => {
    if (selectedVolanteForLojas) {
      atribuirLojas.mutate({
        volanteId: selectedVolanteForLojas.id,
        lojaIds: selectedLojaIds,
      });
    }
  };
  
  const handleCopyToken = async (token: string, volanteId: number) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/portal-loja?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(volanteId);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedToken(null), 2000);
  };
  
  const toggleLojaSelection = (lojaId: number) => {
    setSelectedLojaIds(prev => 
      prev.includes(lojaId) 
        ? prev.filter(id => id !== lojaId)
        : [...prev, lojaId]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Car className="h-7 w-7 text-emerald-600" />
              Gestão de Volantes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gerir volantes e atribuir lojas para apoio
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Volante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVolante ? "Editar Volante" : "Novo Volante"}</DialogTitle>
                <DialogDescription>
                  {editingVolante ? "Atualize os dados do volante" : "Preencha os dados do novo volante"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Volante Minho"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="volante@expressglass.pt"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!nome || criarVolante.isPending || atualizarVolante.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {editingVolante ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Lista de Volantes */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : volantes && volantes.length > 0 ? (
          <div className="grid gap-4">
            {volantes.map((volante) => (
              <Card key={volante.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                        <Car className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{volante.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          {volante.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {volante.email}
                            </span>
                          )}
                          {volante.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {volante.telefone}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={volante.ativo ? "default" : "secondary"}>
                        {volante.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      {volante.token && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const portalUrl = `${window.location.origin}/portal-loja?token=${volante.token?.token}`;
                            window.open(portalUrl, '_blank');
                          }}
                          title="Ver Calendário do Volante"
                        >
                          <Calendar className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(volante)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Tem a certeza que deseja eliminar este volante?")) {
                            eliminarVolante.mutate({ id: volante.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Lojas Atribuídas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-500" />
                          Lojas Atribuídas
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLojasDialog(volante)}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Gerir
                        </Button>
                      </div>
                      
                      {volante.lojas && volante.lojas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {volante.lojas.map((loja: any) => (
                            <Badge key={loja.id} variant="outline" className="text-xs">
                              {loja.nome}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhuma loja atribuída</p>
                      )}
                    </div>
                    
                    {/* Token de Acesso */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Key className="h-4 w-4 text-amber-500" />
                        Token de Acesso
                      </h4>
                      
                      {volante.token ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1 truncate">
                            {volante.token?.token?.substring(0, 20)}...
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => volante.token && handleCopyToken(volante.token.token, volante.id)}
                          >
                            {copiedToken === volante.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          {volante.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => enviarTokenEmail.mutate({ volanteId: volante.id })}
                              disabled={enviarTokenEmail.isPending}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => criarToken.mutate({ volanteId: volante.id })}
                          disabled={criarToken.isPending}
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Criar Token
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                <Car className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum volante criado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                Crie um volante para começar a gerir os apoios às lojas da sua região.
              </p>
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Volante
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Dialog para atribuir lojas */}
        <Dialog open={lojasDialogOpen} onOpenChange={setLojasDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Atribuir Lojas</DialogTitle>
              <DialogDescription>
                Selecione as lojas que o volante "{selectedVolanteForLojas?.nome}" irá apoiar
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
              {lojasDisponiveis?.map((loja) => (
                <div
                  key={loja.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => toggleLojaSelection(loja.id)}
                >
                  <Checkbox
                    checked={selectedLojaIds.includes(loja.id)}
                    onCheckedChange={() => toggleLojaSelection(loja.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{loja.nome}</p>
                    {loja.email && (
                      <p className="text-xs text-gray-500">{loja.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setLojasDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAtribuirLojas}
                disabled={atribuirLojas.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Guardar ({selectedLojaIds.length} lojas)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
