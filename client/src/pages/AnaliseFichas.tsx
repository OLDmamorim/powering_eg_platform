import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RefreshCw,
  Download,
  Activity
} from 'lucide-react';

export default function AnaliseFichas() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const utils = trpc.useUtils();
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAnalise, setSelectedAnalise] = useState<number | null>(null);
  const [selectedRelatorio, setSelectedRelatorio] = useState<any>(null);
  const [showGestorDialog, setShowGestorDialog] = useState(false);
  const [selectedGestorId, setSelectedGestorId] = useState<number | null>(null);
  const [filtroGestorId, setFiltroGestorId] = useState<number | null>(null); // Filtro de gestor para visualização (Admin)
  const [pendingFileBase64, setPendingFileBase64] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Queries
  const { data: analises, refetch: refetchAnalises } = trpc.analiseFichas.listar.useQuery();
  const { data: detalhesAnalise, isLoading: loadingDetalhes, error: detalhesError } = trpc.analiseFichas.detalhes.useQuery(
    { 
      analiseId: selectedAnalise!, 
      gestorIdFiltro: isAdmin ? (filtroGestorId ?? undefined) : undefined 
    },
    { enabled: !!selectedAnalise }
  );
  
  // Query de gestores (apenas para Admin)
  const { data: gestores } = trpc.gestores.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  // Debug: log quando selectedAnalise muda
  useEffect(() => {
    if (selectedAnalise) {
      console.log('[AnaliseFichas] selectedAnalise:', selectedAnalise);
    }
  }, [selectedAnalise]);
  
  useEffect(() => {
    if (detalhesError) {
      console.error('[AnaliseFichas] Erro ao carregar detalhes:', detalhesError);
    }
  }, [detalhesError]);
  
  // Mutations
  const analisarMutation = trpc.analiseFichas.analisar.useMutation({
    onSuccess: (data) => {
      toast.success(`Análise concluída! ${data.totalFichas} fichas analisadas em ${data.totalLojas} lojas.`);
      refetchAnalises();
      setSelectedAnalise(data.analiseId);
    },
    onError: (error) => {
      // Truncar mensagem de erro para evitar toasts enormes com HTML
      const msg = error.message?.substring(0, 200) || 'Erro desconhecido';
      toast.error(`Erro na análise: ${msg}`);
      console.error('[AnaliseFichas] Erro completo:', error);
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
    
    // Converter ficheiro para base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      
      if (isAdmin) {
        // Admin: guardar ficheiro e mostrar dialog para selecionar gestor
        setPendingFileBase64(base64);
        setPendingFileName(file.name);
        setShowGestorDialog(true);
      } else {
        // Gestor: processar diretamente
        setIsUploading(true);
        try {
          await analisarMutation.mutateAsync({
            fileBase64: base64,
            nomeArquivo: file.name,
          });
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o ficheiro');
    };
    reader.readAsDataURL(file);
    
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
  
  // Função para Admin confirmar seleção de gestor e processar análise
  const handleConfirmGestor = async () => {
    if (!selectedGestorId || !pendingFileBase64 || !pendingFileName) {
      toast.error('Por favor selecione um gestor');
      return;
    }
    
    setShowGestorDialog(false);
    setIsUploading(true);
    
    try {
      await analisarMutation.mutateAsync({
        fileBase64: pendingFileBase64,
        nomeArquivo: pendingFileName,
        gestorIdSelecionado: selectedGestorId,
      });
    } finally {
      setIsUploading(false);
      setPendingFileBase64(null);
      setPendingFileName(null);
      setSelectedGestorId(null);
    }
  };
  
  const handleCancelGestor = () => {
    setShowGestorDialog(false);
    setPendingFileBase64(null);
    setPendingFileName(null);
    setSelectedGestorId(null);
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
      <div className="space-y-6 overflow-hidden">
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
            {isAdmin && (
              <TabsTrigger value="diagnostico">
                <Activity className="mr-2 h-4 w-4" />
                Diagnóstico
              </TabsTrigger>
            )}
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
                          {isAdmin && detalhesAnalise.gestorFiltrado && (
                            <span className="ml-2 text-primary font-medium">
                              • A ver lojas de: {detalhesAnalise.gestorFiltrado.nome}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Seletor de Gestor para Admin */}
                        {isAdmin && gestores && gestores.length > 0 && (
                          <Select
                            value={filtroGestorId?.toString() || 'todos'}
                            onValueChange={(value) => {
                              setFiltroGestorId(value === 'todos' ? null : parseInt(value));
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Filtrar por gestor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos os Gestores</SelectItem>
                              {gestores
                                .sort((a, b) => a.nome.localeCompare(b.nome))
                                .map((gestor) => (
                                  <SelectItem key={gestor.id} value={gestor.id.toString()}>
                                    {gestor.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button 
                          onClick={handleEnviarTodos}
                          disabled={enviarEmailsMutation.isPending}
                          title="Envia relatórios apenas para as lojas visíveis"
                        >
                          {enviarEmailsMutation.isPending ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          {isAdmin && filtroGestorId ? 'Enviar às Lojas' : 'Enviar às Minhas Lojas'}
                        </Button>
                      </div>
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
            {/* Lista de Análises */}
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
            
            {/* Indicador de carregamento */}
            {selectedAnalise && loadingDetalhes && (
              <Card className="mt-6">
                <CardContent className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">A carregar detalhes...</span>
                </CardContent>
              </Card>
            )}
            
            {/* Erro ao carregar */}
            {selectedAnalise && detalhesError && (
              <Card className="mt-6 border-red-200 bg-red-50">
                <CardContent className="flex items-center justify-center py-8">
                  <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
                  <span className="text-red-600">Erro ao carregar detalhes da análise</span>
                </CardContent>
              </Card>
            )}
            
            {/* Detalhes da Análise Selecionada no Histórico */}
            {selectedAnalise && detalhesAnalise && !loadingDetalhes && (
              <div className="mt-6 space-y-4">
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
                
                {/* Lista de Relatórios do Histórico */}
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
                
                {/* Lojas não atribuídas ao gestor (histórico) */}
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
              </div>
            )}
          </TabsContent>
          
          {/* Tab: Diagnóstico (apenas Admin) */}
          {isAdmin && (
            <TabsContent value="diagnostico" className="space-y-4">
              <DiagnosticoPanel analises={analises || []} />
            </TabsContent>
          )}
        </Tabs>
        
        {/* Dialog: Ver Relatório */}
        <Dialog open={showRelatorioDialog} onOpenChange={setShowRelatorioDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                
                {/* Resumo da Análise - Instruções e ações */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumo da Análise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedRelatorio.resumo }}
                    />
                  </CardContent>
                </Card>
                
                {/* Fichas a Intervir - Detalhe discriminado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Fichas a Intervir (Detalhe)</CardTitle>
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
                  {/* Botão Download PDF */}
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        toast.info('A gerar PDF...');
                        const result = await utils.analiseFichas.downloadPDF.fetch({ relatorioId: selectedRelatorio.id });
                        
                        // Converter base64 para blob e fazer download
                        const byteCharacters = atob(result.pdfBase64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: 'application/pdf' });
                        
                        // Criar link de download
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = result.filename;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        toast.success('PDF descarregado com sucesso!');
                      } catch (error) {
                        console.error('Erro ao gerar PDF:', error);
                        toast.error('Erro ao gerar PDF');
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  
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
      
      {/* Dialog para Admin selecionar gestor */}
      <Dialog open={showGestorDialog} onOpenChange={setShowGestorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Gestor</DialogTitle>
            <DialogDescription>
              Selecione o gestor cujas lojas pretende ver nos relatórios.
              A análise irá mostrar apenas os relatórios das lojas associadas ao gestor selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="gestor-select" className="mb-2 block">Gestor</Label>
            <Select
              value={selectedGestorId?.toString() || ''}
              onValueChange={(value) => setSelectedGestorId(parseInt(value))}
            >
              <SelectTrigger id="gestor-select">
                <SelectValue placeholder="Selecione um gestor..." />
              </SelectTrigger>
              <SelectContent>
                {gestores?.sort((a, b) => a.nome.localeCompare(b.nome)).map((gestor) => (
                  <SelectItem key={gestor.id} value={gestor.id.toString()}>
                    {gestor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelGestor}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmGestor} disabled={!selectedGestorId}>
              Analisar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Componente de Diagnóstico (apenas Admin)
function DiagnosticoPanel({ analises }: { analises: Array<{ id: number; nomeArquivo: string; dataUpload: Date; totalFichas: number; totalLojas: number }> }) {
  const [selectedDiagAnalise, setSelectedDiagAnalise] = useState<number | null>(
    analises.length > 0 ? analises[0].id : null
  );
  
  const { data: diagnostico, isLoading, error } = trpc.analiseFichas.diagnostico.useQuery(
    { analiseId: selectedDiagAnalise! },
    { enabled: !!selectedDiagAnalise }
  );
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Diagnóstico de Fichas Identificadas
          </CardTitle>
          <CardDescription>
            Verifica se as fichas individuais estão a ser guardadas corretamente na base de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de análise */}
          <div className="flex items-center gap-4">
            <Label>Análise:</Label>
            <Select
              value={selectedDiagAnalise?.toString() || ''}
              onValueChange={(v) => setSelectedDiagAnalise(parseInt(v))}
            >
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="Selecione uma análise..." />
              </SelectTrigger>
              <SelectContent>
                {analises.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.nomeArquivo} - {new Date(a.dataUpload).toLocaleString('pt-PT')} ({a.totalFichas} fichas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">A carregar diagnóstico...</span>
            </div>
          )}
          
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar diagnóstico</span>
              </div>
              <p className="mt-1 text-sm text-red-500">{error.message}</p>
            </div>
          )}
          
          {diagnostico && (
            <div className="space-y-4">
              {/* Resumo geral */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{diagnostico.totalRelatorios}</div>
                  <div className="text-sm text-muted-foreground">Relatórios Guardados</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{diagnostico.totalFichasEsperadas}</div>
                  <div className="text-sm text-muted-foreground">Fichas Esperadas (soma categorias)</div>
                </div>
                <div className={`rounded-lg border p-3 ${diagnostico.totalFichasGuardadas === 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${diagnostico.totalFichasGuardadas === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {diagnostico.totalFichasGuardadas}
                  </div>
                  <div className="text-sm text-muted-foreground">Fichas Guardadas na BD</div>
                </div>
                <div className={`rounded-lg border p-3 ${diagnostico.percentagemGuardada < 50 ? 'border-red-300 bg-red-50' : diagnostico.percentagemGuardada < 90 ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${diagnostico.percentagemGuardada < 50 ? 'text-red-600' : diagnostico.percentagemGuardada < 90 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {diagnostico.percentagemGuardada}%
                  </div>
                  <div className="text-sm text-muted-foreground">Taxa de Salvamento</div>
                </div>
              </div>
              
              {/* Alerta se 0 fichas */}
              {diagnostico.totalFichasGuardadas === 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <AlertTriangle className="h-5 w-5" />
                    PROBLEMA: Nenhuma ficha individual foi guardada!
                  </div>
                  <p className="mt-2 text-sm text-red-600">
                    Os relatórios por loja foram criados ({diagnostico.totalRelatorios}), mas as fichas individuais 
                    não foram guardadas na tabela <code>fichas_identificadas_analise</code>. 
                    Isto impede a comparação entre análises (processos repetidos).
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    Possíveis causas: obrano=0 (filtrado), erro SQL silencioso, ou código antigo sem esta funcionalidade.
                  </p>
                </div>
              )}
              
              {/* Detalhes por loja */}
              {diagnostico.fichasPorLoja.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Fichas guardadas por loja:</h3>
                  <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Loja</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Abertas 5d</th>
                          <th className="text-right p-2">Após Agend.</th>
                          <th className="text-right p-2">Alerta</th>
                          <th className="text-right p-2">Sem Notas</th>
                          <th className="text-right p-2">Notas Ant.</th>
                          <th className="text-right p-2">Dev. Vidro</th>
                          <th className="text-right p-2">Sem Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostico.fichasPorLoja.map((loja, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="p-2 font-medium">{loja.nomeLoja}</td>
                            <td className="text-right p-2">{loja.totalFichas}</td>
                            <td className="text-right p-2">{loja.categorias['abertas5Dias'] || 0}</td>
                            <td className="text-right p-2">{loja.categorias['aposAgendamento'] || 0}</td>
                            <td className="text-right p-2">{loja.categorias['statusAlerta'] || 0}</td>
                            <td className="text-right p-2">{loja.categorias['semNotas'] || 0}</td>
                            <td className="text-right p-2">{loja.categorias['notasAntigas'] || 0}</td>
                            <td className="text-right p-2">{loja.categorias['devolverVidro'] || 0}</td>
                            <td className="text-right p-2">{loja.categorias['semEmailCliente'] || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Info sobre análise anterior */}
              <div className="rounded-lg border p-3 text-sm">
                <span className="font-medium">Análise anterior: </span>
                {diagnostico.temAnaliseAnterior ? (
                  <span className="text-green-600">
                    Sim (de {diagnostico.dataAnaliseAnterior ? new Date(diagnostico.dataAnaliseAnterior).toLocaleString('pt-PT') : 'data desconhecida'})
                  </span>
                ) : (
                  <span className="text-muted-foreground">Não encontrada (primeira análise ou mesma data)</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
