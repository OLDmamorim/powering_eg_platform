import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Target, Award, BarChart3, Sparkles, FileText, Trophy, Store, ArrowUpRight, ArrowDownRight, Globe, MapPin, User, Filter } from 'lucide-react';
import { useAuth } from '../_core/hooks/useAuth';
import { toast } from 'sonner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ExportarRelatorioIAPDF } from '../components/ExportarRelatorioIAPDF';
import { Badge } from '../components/ui/badge';

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function RelatorioIAResultados() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Estado para Relatório IA de Resultados
  const [periodoRelatorioIA, setPeriodoRelatorioIA] = useState<'mes_anterior' | 'mensal' | 'trimestral' | 'semestral' | 'anual'>('mes_anterior');
  const [mostrarRelatorioIA, setMostrarRelatorioIA] = useState(false);
  
  // Estados para filtros (apenas admin)
  const [tipoFiltro, setTipoFiltro] = useState<'pais' | 'zona' | 'gestor'>('pais');
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>('');
  const [gestorSeleccionado, setGestorSeleccionado] = useState<number | undefined>(undefined);
  
  // Queries para obter opções de filtro (apenas admin)
  const { data: zonas } = trpc.relatoriosIA.getZonas.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  const { data: gestores } = trpc.relatoriosIA.getGestoresParaFiltro.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  // Construir parâmetros da query baseado nos filtros
  const queryParams = useMemo(() => {
    const params: {
      periodo: typeof periodoRelatorioIA;
      filtro?: 'pais' | 'zona' | 'gestor';
      zonaId?: string;
      gestorIdFiltro?: number;
    } = {
      periodo: periodoRelatorioIA,
    };
    
    if (isAdmin) {
      params.filtro = tipoFiltro;
      if (tipoFiltro === 'zona' && zonaSeleccionada) {
        params.zonaId = zonaSeleccionada;
      } else if (tipoFiltro === 'gestor' && gestorSeleccionado) {
        params.gestorIdFiltro = gestorSeleccionado;
      }
    }
    
    return params;
  }, [periodoRelatorioIA, tipoFiltro, zonaSeleccionada, gestorSeleccionado, isAdmin]);
  
  // Query para Relatório IA
  const { data: analiseIA, isLoading: loadingAnaliseIA, refetch: refetchAnaliseIA } = trpc.relatoriosIA.gerar.useQuery(
    queryParams,
    { enabled: false }
  );

  const handleGerarRelatorio = async () => {
    // Validar filtros
    if (isAdmin) {
      if (tipoFiltro === 'zona' && !zonaSeleccionada) {
        toast.error('Selecione uma zona');
        return;
      }
      if (tipoFiltro === 'gestor' && !gestorSeleccionado) {
        toast.error('Selecione um gestor');
        return;
      }
    }
    
    toast.info('A gerar relatório IA de resultados...');
    await refetchAnaliseIA();
    setMostrarRelatorioIA(true);
  };
  
  // Obter label do filtro actual
  const getFiltroLabel = () => {
    if (!isAdmin) return 'Minhas Lojas';
    if (tipoFiltro === 'pais') return 'Todo o País';
    if (tipoFiltro === 'zona') return zonaSeleccionada ? `Zona: ${zonaSeleccionada}` : 'Selecione zona';
    if (tipoFiltro === 'gestor') {
      const gestor = gestores?.find(g => g.id === gestorSeleccionado);
      return gestor ? `Gestor: ${gestor.nome}` : 'Selecione gestor';
    }
    return '';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Relatório IA de Resultados
          </h1>
          <p className="text-muted-foreground">
            Análise inteligente dos resultados de serviços com comparação entre lojas
          </p>
        </div>

        {/* Card Principal */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Gerar Análise IA
                  </CardTitle>
                  <CardDescription>
                    Selecione o período e filtros para gerar uma análise detalhada dos resultados
                  </CardDescription>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Período */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Período</label>
                  <Select value={periodoRelatorioIA} onValueChange={(v) => setPeriodoRelatorioIA(v as typeof periodoRelatorioIA)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                      <SelectItem value="mensal">Mês Atual</SelectItem>
                      <SelectItem value="trimestral">Trimestre</SelectItem>
                      <SelectItem value="semestral">Semestre</SelectItem>
                      <SelectItem value="anual">Ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtros de Admin */}
                {isAdmin && (
                  <>
                    {/* Tipo de Filtro */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        Filtrar por
                      </label>
                      <Select value={tipoFiltro} onValueChange={(v) => {
                        setTipoFiltro(v as typeof tipoFiltro);
                        setZonaSeleccionada('');
                        setGestorSeleccionado(undefined);
                      }}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pais">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Todo o País
                            </div>
                          </SelectItem>
                          <SelectItem value="zona">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Por Zona
                            </div>
                          </SelectItem>
                          <SelectItem value="gestor">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Por Gestor
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Seletor de Zona */}
                    {tipoFiltro === 'zona' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Zona</label>
                        <Select value={zonaSeleccionada} onValueChange={setZonaSeleccionada}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Selecione zona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {zonas?.map((zona) => (
                              <SelectItem key={zona} value={zona}>
                                {zona}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Seletor de Gestor */}
                    {tipoFiltro === 'gestor' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Gestor</label>
                        <Select 
                          value={gestorSeleccionado?.toString() || ''} 
                          onValueChange={(v) => setGestorSeleccionado(v ? parseInt(v) : undefined)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Selecione gestor..." />
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
                    )}
                  </>
                )}
                
                {/* Botão Gerar */}
                <Button 
                  onClick={handleGerarRelatorio}
                  disabled={loadingAnaliseIA}
                  className="h-10"
                >
                  {loadingAnaliseIA ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> A gerar...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Gerar Relatório</>
                  )}
                </Button>
                
                {/* Botão Exportar PDF */}
                {mostrarRelatorioIA && analiseIA && (
                  <ExportarRelatorioIAPDF analiseIA={analiseIA} periodo={periodoRelatorioIA} />
                )}
              </div>
              
              {/* Badge do Filtro Aplicado */}
              {mostrarRelatorioIA && analiseIA && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filtro aplicado:</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {tipoFiltro === 'pais' && <Globe className="h-3 w-3" />}
                    {tipoFiltro === 'zona' && <MapPin className="h-3 w-3" />}
                    {tipoFiltro === 'gestor' && <User className="h-3 w-3" />}
                    {(analiseIA as any).filtroAplicado || getFiltroLabel()}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          
          {mostrarRelatorioIA && analiseIA && (
            <CardContent className="pt-6 space-y-6">
              {/* Resumo */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo Executivo
                </h4>
                <p className="text-muted-foreground">{analiseIA.resumo}</p>
              </div>

              {/* Comparação de Lojas */}
              {analiseIA.comparacaoLojas && (
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-purple-500" />
                    Comparação de Lojas
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Melhor Loja */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400 text-sm">Melhor Loja</span>
                      </div>
                      <p className="font-bold truncate">{analiseIA.comparacaoLojas.melhorLoja?.nome || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {analiseIA.comparacaoLojas.melhorLoja?.servicos || 0} serviços
                      </p>
                    </div>

                    {/* Pior Loja */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-400 text-sm">Menos Serviços</span>
                      </div>
                      <p className="font-bold truncate">{analiseIA.comparacaoLojas.piorLoja?.nome || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {analiseIA.comparacaoLojas.piorLoja?.servicos || 0} serviços
                      </p>
                    </div>

                    {/* Maior Evolução */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-400 text-sm">Maior Evolução</span>
                      </div>
                      <p className="font-bold truncate">{analiseIA.comparacaoLojas.maiorEvolucao?.nome || 'N/A'}</p>
                      <p className="text-sm text-green-600">
                        {analiseIA.comparacaoLojas.maiorEvolucao?.variacao ? `+${analiseIA.comparacaoLojas.maiorEvolucao.variacao.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>

                    {/* Menor Evolução */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm">Menor Evolução</span>
                      </div>
                      <p className="font-bold truncate">{analiseIA.comparacaoLojas.menorEvolucao?.nome || 'N/A'}</p>
                      <p className="text-sm text-red-600">
                        {analiseIA.comparacaoLojas.menorEvolucao?.variacao ? `${analiseIA.comparacaoLojas.menorEvolucao.variacao.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-around flex-wrap gap-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-primary">{analiseIA.comparacaoLojas.totalLojas}</p>
                        <p className="text-xs text-muted-foreground">Lojas Analisadas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-600">{analiseIA.comparacaoLojas.lojasAcimaMedia}</p>
                        <p className="text-xs text-muted-foreground">Acima do Objetivo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-600">{analiseIA.comparacaoLojas.totalLojas - analiseIA.comparacaoLojas.lojasAcimaMedia}</p>
                        <p className="text-xs text-muted-foreground">Abaixo do Objetivo</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gráfico de Ranking */}
              {analiseIA.dadosGraficos?.rankingServicos && analiseIA.dadosGraficos.rankingServicos.length > 0 && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Top 10 Lojas por Serviços
                  </h4>
                  <div style={{ height: '300px' }}>
                    <Bar
                      data={{
                        labels: analiseIA.dadosGraficos.rankingServicos.map(l => l.loja.length > 12 ? l.loja.substring(0, 12) + '...' : l.loja),
                        datasets: [{
                          label: 'Serviços',
                          data: analiseIA.dadosGraficos.rankingServicos.map(l => l.servicos),
                          backgroundColor: analiseIA.dadosGraficos.rankingServicos.map(l => 
                            l.desvio >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                          ),
                          borderColor: analiseIA.dadosGraficos.rankingServicos.map(l => 
                            l.desvio >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                          ),
                          borderWidth: 1,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true },
                          x: { ticks: { maxRotation: 45, minRotation: 45 } }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Verde = Acima do objetivo | Vermelho = Abaixo do objetivo
                  </p>
                </div>
              )}

              {/* Análise de Performance */}
              {analiseIA.analiseResultados && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Lojas em Destaque
                    </h4>
                    <ul className="space-y-1">
                      {analiseIA.analiseResultados.lojasDestaque?.slice(0, 5).map((loja, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <Award className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{loja}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Lojas que Precisam Atenção
                    </h4>
                    <ul className="space-y-1">
                      {analiseIA.analiseResultados.lojasAtencao?.slice(0, 5).map((loja, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <Target className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>{loja}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Análise Detalhada de Resultados */}
              {analiseIA.analiseResultados && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      Análise Detalhada de Resultados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Resumo de Performance */}
                    {analiseIA.analiseResultados.resumoPerformance && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm">{analiseIA.analiseResultados.resumoPerformance}</p>
                      </div>
                    )}

                    {/* Tendências */}
                    {analiseIA.analiseResultados.tendenciasServicos && (
                      <div>
                        <h5 className="font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Tendências Identificadas
                        </h5>
                        <p className="text-sm p-2 bg-muted/30 rounded">
                          {analiseIA.analiseResultados.tendenciasServicos}
                        </p>
                      </div>
                    )}

                    {/* Recomendações */}
                    {analiseIA.analiseResultados.recomendacoes && analiseIA.analiseResultados.recomendacoes.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Recomendações
                        </h5>
                        <ul className="space-y-2">
                          {analiseIA.analiseResultados.recomendacoes.map((rec, idx) => (
                            <li key={idx} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded flex items-start gap-2">
                              <span className="text-amber-500 font-bold">{idx + 1}.</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          )}

          {/* Estado inicial - sem relatório gerado */}
          {!mostrarRelatorioIA && (
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Sparkles className="h-12 w-12 text-purple-300 mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">Nenhum relatório gerado</h3>
                  <p className="text-muted-foreground">
                    Selecione um período{isAdmin ? ' e filtros' : ''} e clique em "Gerar Relatório" para obter uma análise detalhada dos resultados.
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
