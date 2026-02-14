import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Key, Copy } from 'lucide-react';

export default function GestaoRecalibra() {

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tokensDialogOpen, setTokensDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<number | null>(null);
  
  const [nome, setNome] = useState('');
  const [gestorId, setGestorId] = useState<number | null>(null);
  const [lojasIds, setLojasIds] = useState<number[]>([]);

  // Queries
  const { data: unidades, refetch: refetchUnidades } = trpc.gestaoRecalibra.listar.useQuery();
  const { data: gestores } = trpc.gestores.listar.useQuery();
  const { data: lojas } = trpc.lojas.listar.useQuery();
  const { data: tokens } = trpc.gestaoRecalibra.listarTokens.useQuery(
    { unidadeId: selectedUnidadeId! },
    { enabled: !!selectedUnidadeId }
  );

  // Mutations
  const criarMutation = trpc.gestaoRecalibra.criar.useMutation({
    onSuccess: () => {
      toast({ title: 'Unidade criada com sucesso!' });
      refetchUnidades();
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar unidade', description: error.message, variant: 'destructive' });
    },
  });

  const atualizarMutation = trpc.gestaoRecalibra.atualizar.useMutation({
    onSuccess: () => {
      toast({ title: 'Unidade atualizada com sucesso!' });
      refetchUnidades();
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar unidade', description: error.message, variant: 'destructive' });
    },
  });

  const eliminarMutation = trpc.gestaoRecalibra.eliminar.useMutation({
    onSuccess: () => {
      toast({ title: 'Unidade eliminada com sucesso!' });
      refetchUnidades();
    },
    onError: (error) => {
      toast({ title: 'Erro ao eliminar unidade', description: error.message, variant: 'destructive' });
    },
  });

  const gerarTokenMutation = trpc.gestaoRecalibra.gerarToken.useMutation({
    onSuccess: (token) => {
      toast({ title: 'Token gerado com sucesso!' });
      // Copiar token para clipboard
      navigator.clipboard.writeText(token.token);
      refetchUnidades();
    },
    onError: (error) => {
      toast({ title: 'Erro ao gerar token', description: error.message, variant: 'destructive' });
    },
  });

  const revogarTokenMutation = trpc.gestaoRecalibra.revogarToken.useMutation({
    onSuccess: () => {
      toast({ title: 'Token revogado com sucesso!' });
      refetchUnidades();
    },
    onError: (error) => {
      toast({ title: 'Erro ao revogar token', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setNome('');
    setGestorId(null);
    setLojasIds([]);
    setEditingUnidade(null);
  };

  const handleOpenDialog = (unidade?: any) => {
    if (unidade) {
      setEditingUnidade(unidade);
      setNome(unidade.nome);
      setGestorId(unidade.gestorId);
      // TODO: Carregar lojas associadas
      setLojasIds([]);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!nome || !gestorId || lojasIds.length === 0) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (editingUnidade) {
      atualizarMutation.mutate({
        id: editingUnidade.id,
        nome,
        gestorId,
        lojasIds,
      });
    } else {
      criarMutation.mutate({
        nome,
        gestorId,
        lojasIds,
      });
    }
  };

  const handleEliminar = (id: number) => {
    if (confirm('Tem a certeza que deseja eliminar esta unidade?')) {
      eliminarMutation.mutate({ id });
    }
  };

  const handleGerarToken = (unidadeId: number) => {
    gerarTokenMutation.mutate({ unidadeId });
  };

  const handleVerTokens = (unidadeId: number) => {
    setSelectedUnidadeId(unidadeId);
    setTokensDialogOpen(true);
  };

  const handleRevogarToken = (tokenId: number) => {
    if (confirm('Tem a certeza que deseja revogar este token?')) {
      revogarTokenMutation.mutate({ tokenId });
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Token copiado para a área de transferência!' });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão Recalibra</h1>
          <p className="text-muted-foreground">Gerir unidades de calibragem e gestores responsáveis</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      {/* Lista de Unidades */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {unidades?.map((unidade) => {
          const gestor = gestores?.find((g) => g.id === unidade.gestorId);
          
          return (
            <Card key={unidade.id}>
              <CardHeader>
                <CardTitle>{unidade.nome}</CardTitle>
                <CardDescription>
                  Gestor: {gestor?.nome || 'Não atribuído'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(unidade)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEliminar(unidade.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleGerarToken(unidade.id)}>
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleVerTokens(unidade.id)}>
                    Tokens
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog Criar/Editar Unidade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
            <DialogDescription>
              Configure a unidade de calibragem e atribua um gestor responsável
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Unidade</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Recalibra Minho"
              />
            </div>

            <div>
              <Label htmlFor="gestor">Gestor Responsável</Label>
              <Select value={gestorId?.toString()} onValueChange={(v) => setGestorId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um gestor" />
                </SelectTrigger>
                <SelectContent>
                  {gestores?.map((gestor) => (
                    <SelectItem key={gestor.id} value={gestor.id.toString()}>
                      {gestor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Lojas Associadas</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                {lojas?.map((loja) => (
                  <label key={loja.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={lojasIds.includes(loja.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLojasIds([...lojasIds, loja.id]);
                        } else {
                          setLojasIds(lojasIds.filter((id) => id !== loja.id));
                        }
                      }}
                    />
                    <span>{loja.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={criarMutation.isPending || atualizarMutation.isPending}>
              {(criarMutation.isPending || atualizarMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingUnidade ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tokens */}
      <Dialog open={tokensDialogOpen} onOpenChange={setTokensDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tokens de Acesso</DialogTitle>
            <DialogDescription>
              Tokens ativos para acesso ao Portal Recalibra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {tokens?.map((token) => (
              <Card key={token.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 font-mono text-sm truncate mr-4">
                      {token.token}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopyToken(token.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRevogarToken(token.id)}>
                        Revogar
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Criado: {new Date(token.createdAt).toLocaleString('pt-PT')}
                  </div>
                </CardContent>
              </Card>
            ))}
            {tokens?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum token ativo
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setTokensDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
