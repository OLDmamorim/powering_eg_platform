import { useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail, 
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Calendar,
  Store,
  FileText,
  Send,
  History,
  RefreshCw
} from 'lucide-react';

export default function AnaliseFichas() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAnalise, setSelectedAnalise] = useState<number | null>(null);
  const [selectedRelatorio, setSelectedRelatorio] = useState<any>(null);
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Queries
  const { data: analises, refetch: refetchAnalises } = trpc.analiseFichas.listar.useQuery();
  const { data: detalhesAnalise, isLoading: loadingDetalhes } = trpc.analiseFichas.detalhes.useQuery(
    { analiseId: selectedAnalise! },
    { enabled: !!selectedAnalise }
  );
  
  // Mutations
  const analisarMutation = trpc.analiseFichas.analisar.useMutation({
    onSuccess: (data) => {
      toast.success(`Análise concluída! ${data.totalFichas} fichas analisadas em ${data.totalLojas} lojas.`);
      refetchAnalises();
      setSelectedAnalise(data.analiseId);
    },
    onError: (error) => {
      toast.error(`Erro na análise: ${error.message}`);
    },
  });
  
  const enviarEmailMutation = trpc.analiseFichas.enviarEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Relatório enviado para ${data.emailEnviado}`);
      if (selectedAnalise) {
        // Refetch detalhes para atualizar status de envio
      }
    },
    onError: (error) => {
      toast.error(`Erro ao enviar email: ${error.message}`);
    },
  });
  
  const enviarEmailsMutation = trpc.analiseFichas.enviarEmails.useMutation({
    onSuccess: (data) => {
      const sucessos = data.resultados.filter(r => r.sucesso).length;
      const erros = data.resultados.filter(r => !r.sucesso).length;
      if (erros > 0) {
        toast.warning(`${sucessos} emails enviados, ${erros} falharam`);
      } else {
        toast.success(`${sucessos} emails enviados com sucesso!`);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao enviar emails: ${error.message}`);
    },
  });
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xlsm') && !file.name.endsWith('.xls')) {
      toast.error('Por favor selecione um ficheiro Excel (.xlsx, .xlsm ou .xls)');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Converter ficheiro para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        
        await analisarMutation.mutateAsync({
          fileBase64: base64,
          nomeArquivo: file.name,
        });
        
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Erro ao ler o ficheiro');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
    }
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleEnviarTodos = () => {
    if (!detalhesAnalise?.relatorios) return;
    
    const relatoriosComEmail = detalhesAnalise.relatorios
      .filter(r => r.pertenceAoGestor && r.lojaId && !r.emailEnviado)
      .map(r => r.id);
    
    if (relatoriosComEmail.length === 0) {
      toast.info('Não há relatórios pendentes de envio');
      return;
    }
    
    enviarEmailsMutation.mutate({ relatorioIds: relatoriosComEmail });
  };
  
  const getEvolucaoIcon = (evolucao: string | null) => {
    if (!evolucao) return <Minus className="h-4 w-4 text-gray-400" />;
    switch (evolucao) {
      case 'melhorou':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'piorou':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getEvolucaoBadge = (evolucao: any) => {
    if (!evolucao) return null;
    
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      melhorou: 'default',
      piorou: 'destructive',
      estavel: 'secondary',
    };
    
    const labels: Record<string, string> = {
      melhorou: 'Melhorou',
      piorou: 'Piorou',
      estavel: 'Estável',
    };
    
    return (
      <Badge variant={variants[evolucao.evolucaoGeral] || 'secondary'}>
        {labels[evolucao.evolucaoGeral] || 'Sem dados'}
      </Badge>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Análise de Fichas de Serviço</h1>
            <p className="text-muted-foreground">
              Carregue o ficheiro de monitorização para gerar relatórios por loja
            </p>
          </div>
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || analisarMutation.isPending}
            >
              {isUploading || analisarMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Carregar Ficheiro
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="atual" className="space-y-4">
          <TabsList>
            <TabsTrigger value="atual">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Análise Atual
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History className="mr-2 h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          
          {/* Tab: Análise Atual */}
          <TabsContent value="atual" className="space-y-4">
            {selectedAnalise && detalhesAnalise ? (
              <>
                {/* Resumo da Análise */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5" />
                          {detalhesAnalise.analise.nomeArquivo}
                        </CardTitle>
                        <CardDescription>
                          Analisado em {new Date(detalhesAnalise.analise.dataUpload).toLocaleString('pt-PT')}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={handleEnviarTodos}
                        disabled={enviarEmailsMutation.isPending}
                      >
                        {enviarEmailsMutation.isPending ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar Todos
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold">{detalhesAnalise.analise.totalFichas}</div>
                        <div className="text-sm text-muted-foreground">Total de Fichas</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold">{detalhesAnalise.analise.totalLojas}</div>
                        <div className="text-sm text-muted-foreground">Lojas Analisadas</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold text-green-600">
                          {detalhesAnalise.relatorios.filter(r => r.pertenceAoGestor).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Suas Lojas</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold text-blue-600">
                          {detalhesAnalise.relatorios.filter(r => r.emailEnviado).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Emails Enviados</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Lista de Relatórios */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {detalhesAnalise.relatorios
                    .filter(r => r.pertenceAoGestor)
                    .map((relatorio) => (
                      <Card 
                        key={relatorio.id} 
                        className={`cursor-pointer transition-shadow hover:shadow-md ${
                          relatorio.pertenceAoGestor ? 'border-primary/20' : 'opacity-60'
                        }`}
                        onClick={() => {
                          setSelectedRelatorio(relatorio);
                          setShowRelatorioDialog(true);
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              {relatorio.nomeLoja}
                              {relatorio.numeroLoja && (
                                <Badge variant="outline" className="ml-1">
                                  #{relatorio.numeroLoja}
                                </Badge>
                              )}
                            </CardTitle>
                            {getEvolucaoBadge(relatorio.evolucao)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Fichas:</span>
                              <span className="font-medium">{relatorio.totalFichas}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Abertas +5 dias:
                              </span>
                              <span className={`font-medium ${relatorio.fichasAbertas5Dias > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {relatorio.fichasAbertas5Dias}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Status Alerta:
                              </span>
                              <span className={`font-medium ${relatorio.fichasStatusAlerta > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                                {relatorio.fichasStatusAlerta}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Sem Notas:
                              </span>
                              <span className={`font-medium ${relatorio.fichasSemNotas > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                                {relatorio.fichasSemNotas}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {relatorio.emailEnviado ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  Email enviado
                                </>
                              ) : (
                                <>
                                  <Mail className="h-3 w-3" />
                                  Pendente
                                </>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-1 h-3 w-3" />
                              Ver
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                
                {/* Lojas não atribuídas ao gestor */}
                {detalhesAnalise.relatorios.filter(r => !r.pertenceAoGestor).length > 0 && (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">Outras Lojas no Ficheiro</CardTitle>
                      <CardDescription>
                        Lojas que não estão atribuídas a si
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {detalhesAnalise.relatorios
                          .filter(r => !r.pertenceAoGestor)
                          .map((r) => (
                            <Badge key={r.id} variant="outline" className="cursor-pointer" onClick={() => {
                              setSelectedRelatorio(r);
                              setShowRelatorioDialog(true);
                            }}>
                              {r.nomeLoja} ({r.totalFichas})
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma análise selecionada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Carregue um ficheiro Excel de monitorização para começar a análise
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Carregar Ficheiro
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Tab: Histórico */}
          <TabsContent value="historico" className="space-y-4">
            {analises && analises.length > 0 ? (
              <div className="space-y-2">
                {analises.map((analise) => (
                  <Card 
                    key={analise.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                      selectedAnalise === analise.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedAnalise(analise.id)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{analise.nomeArquivo}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(analise.dataUpload).toLocaleString('pt-PT')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{analise.totalFichas} fichas</div>
                          <div className="text-xs text-muted-foreground">{analise.totalLojas} lojas</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sem histórico de análises</h3>
                  <p className="text-muted-foreground text-center">
                    As suas análises anteriores aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Dialog: Ver Relatório */}
        <Dialog open={showRelatorioDialog} onOpenChange={setShowRelatorioDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                {selectedRelatorio?.nomeLoja}
                {selectedRelatorio?.numeroLoja && (
                  <Badge variant="outline">#{selectedRelatorio.numeroLoja}</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Relatório detalhado da análise de fichas de serviço
              </DialogDescription>
            </DialogHeader>
            
            {selectedRelatorio && (
              <div className="space-y-4">
                {/* Evolução */}
                {selectedRelatorio.evolucao && (
                  <Card className={`${
                    selectedRelatorio.evolucao.evolucaoGeral === 'melhorou' ? 'border-green-200 bg-green-50' :
                    selectedRelatorio.evolucao.evolucaoGeral === 'piorou' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getEvolucaoIcon(selectedRelatorio.evolucao.evolucaoGeral)}
                        <span className="font-medium">Evolução desde última análise</span>
                        {getEvolucaoBadge(selectedRelatorio.evolucao)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRelatorio.evolucao.comentario}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Métricas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold">{selectedRelatorio.totalFichas}</div>
                    <div className="text-xs text-muted-foreground">Total Fichas</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className={`text-2xl font-bold ${selectedRelatorio.fichasAbertas5Dias > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {selectedRelatorio.fichasAbertas5Dias}
                    </div>
                    <div className="text-xs text-muted-foreground">Abertas +5 dias</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className={`text-2xl font-bold ${selectedRelatorio.fichasStatusAlerta > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {selectedRelatorio.fichasStatusAlerta}
                    </div>
                    <div className="text-xs text-muted-foreground">Status Alerta</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className={`text-2xl font-bold ${selectedRelatorio.fichasSemNotas > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {selectedRelatorio.fichasSemNotas}
                    </div>
                    <div className="text-xs text-muted-foreground">Sem Notas</div>
                  </div>
                </div>
                
                {/* Resumo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedRelatorio.resumo}</p>
                  </CardContent>
                </Card>
                
                {/* Conteúdo HTML do Relatório */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Relatório Completo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedRelatorio.conteudoRelatorio }}
                    />
                  </CardContent>
                </Card>
                
                {/* Ações */}
                <div className="flex justify-end gap-2">
                  {selectedRelatorio.pertenceAoGestor && !selectedRelatorio.emailEnviado && (
                    <Button 
                      onClick={() => {
                        enviarEmailMutation.mutate({ relatorioId: selectedRelatorio.id });
                      }}
                      disabled={enviarEmailMutation.isPending}
                    >
                      {enviarEmailMutation.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Enviar por Email
                    </Button>
                  )}
                  {selectedRelatorio.emailEnviado && (
                    <Badge variant="outline" className="py-2">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Email já enviado
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
