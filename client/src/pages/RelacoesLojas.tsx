import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Link2, Unlink, Plus, Store, ArrowRight, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface GrupoLojas {
  lojaPrincipalId: number;
  lojaPrincipalNome: string;
  lojasRelacionadas: Array<{
    relacaoId: number;
    lojaId: number;
    lojaNome: string;
  }>;
}

export default function RelacoesLojas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lojaPrincipalId, setLojaPrincipalId] = useState<string>('');
  const [lojaRelacionadaId, setLojaRelacionadaId] = useState<string>('');
  // Estado para adicionar loja a um grupo existente
  const [addToGroupDialogOpen, setAddToGroupDialogOpen] = useState(false);
  const [selectedGroupPrincipalId, setSelectedGroupPrincipalId] = useState<number | null>(null);
  const [novaLojaParaGrupo, setNovaLojaParaGrupo] = useState<string>('');

  // Queries
  const { data: relacoes, isLoading: loadingRelacoes, refetch: refetchRelacoes } = trpc.lojas.listarRelacoes.useQuery();
  const { data: lojas, isLoading: loadingLojas } = trpc.lojas.getByGestor.useQuery();

  // Agrupar relações por loja principal
  const grupos = useMemo<GrupoLojas[]>(() => {
    if (!relacoes) return [];
    
    const gruposMap = new Map<number, GrupoLojas>();
    
    relacoes.forEach((relacao) => {
      const grupoExistente = gruposMap.get(relacao.lojaPrincipalId);
      
      if (grupoExistente) {
        grupoExistente.lojasRelacionadas.push({
          relacaoId: relacao.relacaoId,
          lojaId: relacao.lojaRelacionadaId,
          lojaNome: relacao.lojaRelacionadaNome,
        });
      } else {
        gruposMap.set(relacao.lojaPrincipalId, {
          lojaPrincipalId: relacao.lojaPrincipalId,
          lojaPrincipalNome: relacao.lojaPrincipalNome,
          lojasRelacionadas: [{
            relacaoId: relacao.relacaoId,
            lojaId: relacao.lojaRelacionadaId,
            lojaNome: relacao.lojaRelacionadaNome,
          }],
        });
      }
    });
    
    return Array.from(gruposMap.values());
  }, [relacoes]);

  // Mutations
  const criarRelacaoMutation = trpc.lojas.criarRelacao.useMutation({
    onSuccess: () => {
      toast.success('Relação criada com sucesso!');
      setDialogOpen(false);
      setAddToGroupDialogOpen(false);
      setLojaPrincipalId('');
      setLojaRelacionadaId('');
      setNovaLojaParaGrupo('');
      setSelectedGroupPrincipalId(null);
      refetchRelacoes();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const removerRelacaoMutation = trpc.lojas.removerRelacao.useMutation({
    onSuccess: () => {
      toast.success('Relação removida com sucesso!');
      refetchRelacoes();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCriarRelacao = () => {
    if (!lojaPrincipalId || !lojaRelacionadaId) {
      toast.error('Selecione as duas lojas para criar a relação.');
      return;
    }
    criarRelacaoMutation.mutate({
      lojaPrincipalId: parseInt(lojaPrincipalId),
      lojaRelacionadaId: parseInt(lojaRelacionadaId),
    });
  };

  const handleAdicionarAoGrupo = () => {
    if (!selectedGroupPrincipalId || !novaLojaParaGrupo) {
      toast.error('Selecione a loja para adicionar ao grupo.');
      return;
    }
    criarRelacaoMutation.mutate({
      lojaPrincipalId: selectedGroupPrincipalId,
      lojaRelacionadaId: parseInt(novaLojaParaGrupo),
    });
  };

  const handleRemoverRelacao = (relacaoId: number) => {
    if (confirm('Tem a certeza que deseja remover esta relação?')) {
      removerRelacaoMutation.mutate({ relacaoId });
    }
  };

  const openAddToGroupDialog = (grupo: GrupoLojas) => {
    setSelectedGroupPrincipalId(grupo.lojaPrincipalId);
    setNovaLojaParaGrupo('');
    setAddToGroupDialogOpen(true);
  };

  // Filtrar lojas disponíveis para seleção (excluir a já selecionada)
  const lojasDisponiveis = lojas?.filter(l => l.id.toString() !== lojaPrincipalId) || [];
  const lojasPrincipaisDisponiveis = lojas?.filter(l => l.id.toString() !== lojaRelacionadaId) || [];

  // Lojas disponíveis para adicionar a um grupo (excluir a principal e as já relacionadas)
  const lojasDisponiveisParaGrupo = useMemo(() => {
    if (!lojas || !selectedGroupPrincipalId) return [];
    
    const grupo = grupos.find(g => g.lojaPrincipalId === selectedGroupPrincipalId);
    if (!grupo) return lojas;
    
    const idsNoGrupo = new Set([
      grupo.lojaPrincipalId,
      ...grupo.lojasRelacionadas.map(l => l.lojaId)
    ]);
    
    return lojas.filter(l => !idsNoGrupo.has(l.id));
  }, [lojas, selectedGroupPrincipalId, grupos]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Link2 className="h-6 w-6 text-purple-600" />
              Relações entre Lojas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Relacione lojas para partilharem o mesmo acesso ao Portal da Loja
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Relação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Relação entre Lojas</DialogTitle>
                <DialogDescription>
                  Selecione a loja principal (que tem o token) e a loja relacionada (que poderá aceder com o mesmo token).
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loja Principal (com token)</label>
                  <Select value={lojaPrincipalId} onValueChange={setLojaPrincipalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojasPrincipaisDisponiveis.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id.toString()}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loja Relacionada</label>
                  <Select value={lojaRelacionadaId} onValueChange={setLojaRelacionadaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja relacionada" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojasDisponiveis.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id.toString()}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCriarRelacao}
                  disabled={criarRelacaoMutation.isPending || !lojaPrincipalId || !lojaRelacionadaId}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {criarRelacaoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Relação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <strong>Como funciona:</strong> Quando duas lojas estão relacionadas, o token de acesso da loja principal 
                  permite visualizar os dados de ambas as lojas no Portal da Loja. Útil para lojas que partilham a mesma equipa 
                  ou gestão (ex: Braga Minho Center e Braga SM).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Grupos */}
        <Card>
          <CardHeader>
            <CardTitle>Grupos de Lojas</CardTitle>
            <CardDescription>
              Lojas agrupadas que partilham o mesmo token de acesso ao Portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRelacoes || loadingLojas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : grupos && grupos.length > 0 ? (
              <div className="space-y-4">
                {grupos.map((grupo) => (
                  <div 
                    key={grupo.lojaPrincipalId}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* Cabeçalho do grupo */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Grupo: {grupo.lojaPrincipalNome}
                        </span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {grupo.lojasRelacionadas.length + 1} lojas
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddToGroupDialog(grupo)}
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Loja
                      </Button>
                    </div>
                    
                    {/* Lojas do grupo */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Loja principal */}
                      <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/50 px-3 py-2 rounded-md border border-purple-300 dark:border-purple-700">
                        <Store className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="font-medium text-sm text-purple-800 dark:text-purple-200">
                          {grupo.lojaPrincipalNome}
                        </span>
                        <Badge variant="outline" className="text-xs border-purple-400 text-purple-600">
                          Principal
                        </Badge>
                      </div>
                      
                      {/* Lojas relacionadas */}
                      {grupo.lojasRelacionadas.map((loja) => (
                        <div 
                          key={loja.relacaoId}
                          className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 group"
                        >
                          <Store className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-sm">{loja.lojaNome}</span>
                          <button
                            onClick={() => handleRemoverRelacao(loja.relacaoId)}
                            disabled={removerRelacaoMutation.isPending}
                            className="text-gray-400 hover:text-red-600 transition-colors ml-1"
                            title="Remover do grupo"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Link2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma relação entre lojas configurada.</p>
                <p className="text-sm mt-1">Clique em "Nova Relação" para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para adicionar loja a grupo existente */}
        <Dialog open={addToGroupDialogOpen} onOpenChange={setAddToGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Loja ao Grupo</DialogTitle>
              <DialogDescription>
                Selecione a loja que pretende adicionar ao grupo "{grupos.find(g => g.lojaPrincipalId === selectedGroupPrincipalId)?.lojaPrincipalNome}".
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Loja a Adicionar</label>
                <Select value={novaLojaParaGrupo} onValueChange={setNovaLojaParaGrupo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojasDisponiveisParaGrupo.map((loja) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lojasDisponiveisParaGrupo.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Todas as lojas já estão neste grupo ou noutros grupos.
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddToGroupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAdicionarAoGrupo}
                disabled={criarRelacaoMutation.isPending || !novaLojaParaGrupo}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {criarRelacaoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar ao Grupo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
