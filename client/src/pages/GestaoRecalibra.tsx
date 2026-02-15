import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Key, Copy, ArrowLeft, Store, Check } from 'lucide-react';

export default function GestaoRecalibra() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [lojasDialogOpen, setLojasDialogOpen] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<any>(null);
  const [selectedLojaIds, setSelectedLojaIds] = useState<number[]>([]);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [nome, setNome] = useState('');

  // Queries - como Volante
  const { data: unidades, isLoading, refetch } = trpc.gestaoRecalibra.listar.useQuery();
  const { data: minhasLojas } = trpc.lojas.listByGestor.useQuery();

  // Mutations
  const criarUnidade = trpc.gestaoRecalibra.criar.useMutation({
    onSuccess: () => {
      toast.success('Unidade criada com sucesso!');
      setDialogOpen(false);
      setNome('');
      refetch();
    },
    onError: (error: any) => {
      toast.error('Erro ao criar unidade', { description: error.message });
    },
  });

  const atualizarUnidade = trpc.gestaoRecalibra.atualizar.useMutation({
    onSuccess: () => {
      toast.success('Unidade atualizada com sucesso!');
      setDialogOpen(false);
      setEditingUnidade(null);
      setNome('');
      setLojasDialogOpen(false);
      setSelectedUnidade(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar', { description: error.message });
    },
  });

  const eliminarUnidade = trpc.gestaoRecalibra.eliminar.useMutation({
    onSuccess: () => {
      toast.success('Unidade eliminada!');
      refetch();
    },
    onError: (error: any) => {
      toast.error('Erro ao eliminar', { description: error.message });
    },
  });

  const gerarToken = trpc.gestaoRecalibra.gerarToken.useMutation({
    onSuccess: () => {
      toast.success('Token gerado com sucesso!');
      refetch();
    },
    onError: (error: any) => {
      toast.error('Erro ao gerar token', { description: error.message });
    },
  });

  const handleOpenDialog = (unidade?: any) => {
    if (unidade) {
      setEditingUnidade(unidade);
      setNome(unidade.nome);
    } else {
      setEditingUnidade(null);
      setNome('');
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!nome.trim()) {
      toast.error('Preencha o nome da unidade');
      return;
    }

    if (editingUnidade) {
      atualizarUnidade.mutate({ id: editingUnidade.id, nome });
    } else {
      criarUnidade.mutate({ nome });
    }
  };

  const handleOpenLojasDialog = (unidade: any) => {
    setSelectedUnidade(unidade);
    setSelectedLojaIds(unidade.lojas?.map((l: any) => l.id) || []);
    setLojasDialogOpen(true);
  };

  const handleSaveLojas = () => {
    if (selectedUnidade) {
      atualizarUnidade.mutate({
        id: selectedUnidade.id,
        lojasIds: selectedLojaIds,
      });
    }
  };

  const handleCopyToken = async (token: string, unidadeId: number) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/portal-recalibra?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(unidadeId);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão Recalibra</h1>
          <p className="text-muted-foreground">Gerir unidades de calibragem</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      {/* Dialog Criar/Editar - Apenas nome */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
            <DialogDescription>
              {editingUnidade ? 'Atualize o nome da unidade' : 'Crie uma nova unidade de calibragem. As suas lojas serão associadas automaticamente.'}
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
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleSubmit}
              disabled={!nome.trim() || criarUnidade.isPending || atualizarUnidade.isPending}
              className="w-full sm:w-auto"
            >
              {criarUnidade.isPending || atualizarUnidade.isPending ? 'A guardar...' : editingUnidade ? 'Guardar' : 'Criar'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Unidades */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : unidades && unidades.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {unidades.map((unidade: any) => (
            <Card key={unidade.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{unidade.nome}</CardTitle>
                <CardDescription>
                  {unidade.lojas?.length || 0} lojas associadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Lojas badges */}
                {unidade.lojas && unidade.lojas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {unidade.lojas.slice(0, 5).map((loja: any) => (
                      <Badge key={loja.id} variant="secondary" className="text-xs">
                        {loja.nome}
                      </Badge>
                    ))}
                    {unidade.lojas.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{unidade.lojas.length - 5}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Token / Link */}
                {unidade.token ? (
                  <div className="mb-3 p-2 bg-muted rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono truncate flex-1 mr-2">
                        {unidade.token.substring(0, 20)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(unidade.token, unidade.id)}
                      >
                        {copiedToken === unidade.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => gerarToken.mutate({ unidadeId: unidade.id })}
                      disabled={gerarToken.isPending}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      {gerarToken.isPending ? 'A gerar...' : 'Gerar Token de Acesso'}
                    </Button>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(unidade)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenLojasDialog(unidade)}>
                    <Store className="h-4 w-4 mr-1" />
                    Lojas
                  </Button>
                  {unidade.token && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToken(unidade.token, unidade.id)}
                    >
                      {copiedToken === unidade.id ? (
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copiar Link
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Tem a certeza que deseja eliminar esta unidade?')) {
                        eliminarUnidade.mutate({ id: unidade.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma unidade criada</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Crie a sua primeira unidade de calibragem para começar
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Unidade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Atribuir Lojas */}
      <Dialog open={lojasDialogOpen} onOpenChange={setLojasDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lojas Associadas</DialogTitle>
            <DialogDescription>
              Selecione as lojas para a unidade &quot;{selectedUnidade?.nome}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {minhasLojas && minhasLojas.length > 0 ? (
              minhasLojas.map((loja: any) => (
                <label
                  key={loja.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedLojaIds.includes(loja.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLojaIds([...selectedLojaIds, loja.id]);
                      } else {
                        setSelectedLojaIds(selectedLojaIds.filter((id) => id !== loja.id));
                      }
                    }}
                  />
                  <span className="text-sm">{loja.nome}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma loja disponível
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLojasDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLojas} disabled={atualizarUnidade.isPending}>
              {atualizarUnidade.isPending ? 'A guardar...' : 'Guardar Lojas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
