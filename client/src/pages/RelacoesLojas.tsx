import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Link2, Unlink, Plus, Store, ArrowRight, Loader2 } from 'lucide-react';
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

export default function RelacoesLojas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lojaPrincipalId, setLojaPrincipalId] = useState<string>('');
  const [lojaRelacionadaId, setLojaRelacionadaId] = useState<string>('');

  // Queries
  const { data: relacoes, isLoading: loadingRelacoes, refetch: refetchRelacoes } = trpc.lojas.listarRelacoes.useQuery();
  const { data: lojas, isLoading: loadingLojas } = trpc.lojas.getByGestor.useQuery();

  // Mutations
  const criarRelacaoMutation = trpc.lojas.criarRelacao.useMutation({
    onSuccess: () => {
      toast.success('Relação criada com sucesso!');
      setDialogOpen(false);
      setLojaPrincipalId('');
      setLojaRelacionadaId('');
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

  const handleRemoverRelacao = (relacaoId: number) => {
    if (confirm('Tem a certeza que deseja remover esta relação?')) {
      removerRelacaoMutation.mutate({ relacaoId });
    }
  };

  // Filtrar lojas disponíveis para seleção (excluir a já selecionada)
  const lojasDisponiveis = lojas?.filter(l => l.id.toString() !== lojaPrincipalId) || [];
  const lojasPrincipaisDisponiveis = lojas?.filter(l => l.id.toString() !== lojaRelacionadaId) || [];

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

        {/* Lista de Relações */}
        <Card>
          <CardHeader>
            <CardTitle>Relações Ativas</CardTitle>
            <CardDescription>
              Lista de lojas relacionadas que partilham acesso ao Portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRelacoes || loadingLojas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : relacoes && relacoes.length > 0 ? (
              <div className="space-y-3">
                {relacoes.map((relacao) => (
                  <div 
                    key={relacao.relacaoId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg gap-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-md border w-full sm:w-auto">
                        <Store className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="font-medium text-sm">{relacao.lojaPrincipalNome}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 hidden sm:block" />
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-md border w-full sm:w-auto">
                        <Store className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-sm">{relacao.lojaRelacionadaNome}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoverRelacao(relacao.relacaoId)}
                      disabled={removerRelacaoMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 self-end sm:self-auto"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
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
      </div>
    </DashboardLayout>
  );
}
