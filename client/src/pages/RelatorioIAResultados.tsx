import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Target, Award, BarChart3, Sparkles, FileText, Trophy, Store, ArrowUpRight, ArrowDownRight, Globe, MapPin, User, Filter, AlertTriangle, CheckCircle2, XCircle, Percent, Activity, PieChart, X } from 'lucide-react';
import { useAuth } from '../_core/hooks/useAuth';
import { toast } from 'sonner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ExportarRelatorioIAPDF } from '../components/ExportarRelatorioIAPDF';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export function RelatorioIAResultados() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Estado para Relatório IA de Resultados
  const [periodoRelatorioIA, setPeriodoRelatorioIA] = useState<'mes_anterior' | 'mensal' | 'trimestral' | 'semestral' | 'anual'>('mes_anterior');
  const [mostrarRelatorioIA, setMostrarRelatorioIA] = useState(false);
  
  // Estados para filtros (apenas admin)
  const [tipoFiltro, setTipoFiltro] = useState<'pais' | 'zona' | 'gestor'>('pais');
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([]);
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
      zonasIds?: string[];
      gestorIdFiltro?: number;
    } = {
      periodo: periodoRelatorioIA,
    };
    
    if (isAdmin) {
      params.filtro = tipoFiltro;
      if (tipoFiltro === 'zona' && zonasSeleccionadas.length > 0) {
        params.zonasIds = zonasSeleccionadas;
      } else if (tipoFiltro === 'gestor' && gestorSeleccionado) {
        params.gestorIdFiltro = gestorSeleccionado;
      }
    }
    
    return params;
  }, [periodoRelatorioIA, tipoFiltro, zonasSeleccionadas, gestorSeleccionado, isAdmin]);
  
  // Query para Relatório IA
  const { data: analiseIA, isLoading: loadingAnaliseIA, refetch: refetchAnaliseIA } = trpc.relatoriosIA.gerar.useQuery(
    queryParams,
    { enabled: false }
  );

  const handleGerarRelatorio = async () => {
    // Validar filtros
    if (isAdmin) {
      if (tipoFiltro === 'zona' && zonasSeleccionadas.length === 0) {
        toast.error('Selecione pelo menos uma zona');
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
  
  // Funções para gerir seleção de zonas
  const handleToggleZona = (zona: string) => {
    setZonasSeleccionadas(prev => 
      prev.includes(zona) 
        ? prev.filter(z => z !== zona)
        : [...prev, zona]
    );
  };
  
  const handleSelectAllZonas = () => {
    if (zonas) {
      setZonasSeleccionadas(zonas);
    }
  };
  
  const handleClearZonas = () => {
    setZonasSeleccionadas([]);
  };
  
  // Obter label do filtro actual
  const getFiltroLabel = () => {
    if (!isAdmin) return 'Minhas Lojas';
    if (tipoFiltro === 'pais') return 'Todo o País';
    if (tipoFiltro === 'zona') {
      if (zonasSeleccionadas.length === 0) return 'Selecione zona(s)';
      if (zonasSeleccionadas.length === 1) return `Zona: ${zonasSeleccionadas[0]}`;
      return `${zonasSeleccionadas.length} zonas selecionadas`;
    }
    if (tipoFiltro === 'gestor') {
      const gestor = gestores?.find(g => g.id === gestorSeleccionado);
      return gestor ? `Gestor: ${gestor.nome}` : 'Selecione gestor';
    }
    return '';
  };

  // Calcular taxa de cumprimento
  const taxaCumprimento = analiseIA?.comparacaoLojas 
    ? ((analiseIA.comparacaoLojas.lojasAcimaMedia / analiseIA.comparacaoLojas.totalLojas) * 100).toFixed(1)
    : '0';

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
            Análise quantitativa profunda dos resultados de serviços com métricas detalhadas
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
                    Gerar Análise Quantitativa
                  </CardTitle>
                  <CardDescription>
                    Análise baseada em dados numéricos: serviços, objetivos, taxas e tendências
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
                        setZonasSeleccionadas([]);
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
                    
                    {/* Seletor de Zonas (Múltipla Seleção) */}
                    {tipoFiltro === 'zona' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Zonas</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-[250px] justify-between font-normal"
                            >
                              <span className="truncate">
                                {zonasSeleccionadas.length === 0 
                                  ? 'Selecione zona(s)...' 
                                  : zonasSeleccionadas.length === 1
                                    ? zonasSeleccionadas[0]
                                    : `${zonasSeleccionadas.length} zonas selecionadas`
                                }
                              </span>
                              <MapPin className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start">
                            <div className="p-2 border-b flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={handleSelectAllZonas}
                              >
                                Selecionar Todas
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={handleClearZonas}
                              >
                                Limpar
                              </Button>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto p-2">
                              {zonas?.map((zona) => (
                                <div 
                                  key={zona} 
                                  className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted rounded cursor-pointer"
                                  onClick={() => handleToggleZona(zona)}
                                >
                                  <Checkbox 
                                    checked={zonasSeleccionadas.includes(zona)}
                                    onCheckedChange={() => handleToggleZona(zona)}
                                  />
                                  <span className="text-sm">{zona}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {/* Badges das zonas selecionadas */}
                        {zonasSeleccionadas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {zonasSeleccionadas.map((zona) => (
                              <Badge 
                                key={zona} 
                                variant="secondary" 
                                className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleToggleZona(zona)}
                              >
                                {zona}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
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
              {/* Resumo Executivo */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Resumo Executivo
                </h4>
                <p className="text-muted-foreground">{analiseIA.resumo}</p>
              </div>

              {/* KPIs Principais - Cards de Métricas */}
              {analiseIA.comparacaoLojas && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  {/* Total Lojas */}
                  <Card className="bg-slate-50 dark:bg-slate-900/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Store className="h-4 w-4 text-slate-600" />
                        <span className="text-xs text-muted-foreground">Lojas Analisadas</span>
                      </div>
                      <p className="text-2xl font-bold">{analiseIA.comparacaoLojas.totalLojas}</p>
                    </CardContent>
                  </Card>

                  {/* Taxa Cumprimento */}
                  <Card className="bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Percent className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Taxa Cumprimento</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{taxaCumprimento}%</p>
                      <Progress value={parseFloat(taxaCumprimento)} className="mt-2 h-2" />
                    </CardContent>
                  </Card>

                  {/* Acima Objetivo */}
                  <Card className="bg-green-50 dark:bg-green-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Acima Objetivo</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{analiseIA.comparacaoLojas.lojasAcimaMedia}</p>
                    </CardContent>
                  </Card>

                  {/* Abaixo Objetivo */}
                  <Card className="bg-red-50 dark:bg-red-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs text-muted-foreground">Abaixo Objetivo</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{analiseIA.comparacaoLojas.lojasAbaixoMedia || (analiseIA.comparacaoLojas.totalLojas - analiseIA.comparacaoLojas.lojasAcimaMedia)}</p>
                    </CardContent>
                  </Card>

                  {/* Média Serviços */}
                  <Card className="bg-purple-50 dark:bg-purple-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-muted-foreground">Média Serviços</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{analiseIA.comparacaoLojas.mediaServicos || 'N/A'}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Destaques de Performance - Melhor e Pior */}
              {analiseIA.comparacaoLojas && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Líder de Performance */}
                  <Card className="border-2 border-green-300 dark:border-green-700">
                    <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/20">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Trophy className="h-5 w-5" />
                        Líder de Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-xl font-bold mb-2">{analiseIA.comparacaoLojas.melhorLoja?.nome || 'N/A'}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Serviços:</span>
                          <span className="font-semibold ml-1">{analiseIA.comparacaoLojas.melhorLoja?.servicos || 0}</span>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Objetivo:</span>
                          <span className="font-semibold ml-1">{analiseIA.comparacaoLojas.melhorLoja?.objetivo || 'N/A'}</span>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                          <span className="text-muted-foreground">Desvio:</span>
                          <span className="font-semibold ml-1 text-green-600">+{analiseIA.comparacaoLojas.melhorLoja?.desvio?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Taxa Rep.:</span>
                          <span className="font-semibold ml-1">{analiseIA.comparacaoLojas.melhorLoja?.taxaReparacao?.toFixed(1) || 'N/A'}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Menor Performance */}
                  <Card className="border-2 border-red-300 dark:border-red-700">
                    <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/20">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        Menor Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-xl font-bold mb-2">{analiseIA.comparacaoLojas.piorLoja?.nome || 'N/A'}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Serviços:</span>
                          <span className="font-semibold ml-1">{analiseIA.comparacaoLojas.piorLoja?.servicos || 0}</span>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Objetivo:</span>
                          <span className="font-semibold ml-1">{analiseIA.comparacaoLojas.piorLoja?.objetivo || 'N/A'}</span>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
                          <span className="text-muted-foreground">Desvio:</span>
                          <span className="font-semibold ml-1 text-red-600">{analiseIA.comparacaoLojas.piorLoja?.desvio?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Taxa Rep.:</span>
                          <span className="font-semibold ml-1">{analiseIA.comparacaoLojas.piorLoja?.taxaReparacao?.toFixed(1) || 'N/A'}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Evolução vs Mês Anterior */}
              {analiseIA.comparacaoLojas && (analiseIA.comparacaoLojas.maiorEvolucao || analiseIA.comparacaoLojas.menorEvolucao) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Maior Crescimento */}
                  <Card className="border border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                        <ArrowUpRight className="h-5 w-5" />
                        Maior Crescimento vs Mês Anterior
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold">{analiseIA.comparacaoLojas.maiorEvolucao?.nome || 'N/A'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          +{analiseIA.comparacaoLojas.maiorEvolucao?.variacao?.toFixed(1) || 0}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {analiseIA.comparacaoLojas.maiorEvolucao?.servicosAnteriores || 'N/A'} → {analiseIA.comparacaoLojas.maiorEvolucao?.servicosAtuais || 'N/A'} serviços
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Maior Decréscimo */}
                  <Card className="border border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                        <ArrowDownRight className="h-5 w-5" />
                        Maior Decréscimo vs Mês Anterior
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold">{analiseIA.comparacaoLojas.menorEvolucao?.nome || 'N/A'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          {analiseIA.comparacaoLojas.menorEvolucao?.variacao?.toFixed(1) || 0}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {analiseIA.comparacaoLojas.menorEvolucao?.servicosAnteriores || 'N/A'} → {analiseIA.comparacaoLojas.menorEvolucao?.servicosAtuais || 'N/A'} serviços
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Gráficos */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Gráfico de Ranking por Serviços */}
                {analiseIA.dadosGraficos?.rankingServicos && analiseIA.dadosGraficos.rankingServicos.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Top 10 Lojas por Serviços
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div style={{ height: '300px' }}>
                        <Bar
                          data={{
                            labels: analiseIA.dadosGraficos.rankingServicos.map(l => l.loja.length > 10 ? l.loja.substring(0, 10) + '...' : l.loja),
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
                        🟢 Acima do objetivo | 🔴 Abaixo do objetivo
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Gráfico de Distribuição de Desvios */}
                {analiseIA.dadosGraficos?.distribuicaoDesvios && analiseIA.dadosGraficos.distribuicaoDesvios.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Distribuição de Desvios vs Objetivo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div style={{ height: '300px' }}>
                        <Doughnut
                          data={{
                            labels: analiseIA.dadosGraficos.distribuicaoDesvios.map(d => d.faixa),
                            datasets: [{
                              data: analiseIA.dadosGraficos.distribuicaoDesvios.map(d => d.count),
                              backgroundColor: [
                                'rgba(239, 68, 68, 0.8)',   // < -20%
                                'rgba(249, 115, 22, 0.8)', // -20% a -10%
                                'rgba(251, 191, 36, 0.8)', // -10% a 0%
                                'rgba(163, 230, 53, 0.8)', // 0% a +10%
                                'rgba(34, 197, 94, 0.8)',  // +10% a +20%
                                'rgba(16, 185, 129, 0.8)', // > +20%
                              ],
                              borderWidth: 1,
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                                labels: { boxWidth: 12, font: { size: 11 } }
                              }
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tabela de Ranking Detalhado */}
              {analiseIA.dadosGraficos?.rankingServicos && analiseIA.dadosGraficos.rankingServicos.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Ranking Detalhado de Performance
                    </CardTitle>
                    <CardDescription>
                      Métricas quantitativas de todas as lojas analisadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Loja</TableHead>
                            <TableHead className="text-right">Serviços</TableHead>
                            <TableHead className="text-right">Objetivo</TableHead>
                            <TableHead className="text-right">Desvio</TableHead>
                            <TableHead className="text-right">Taxa Rep.</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analiseIA.dadosGraficos.rankingServicos.map((loja, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{loja.loja}</TableCell>
                              <TableCell className="text-right">{loja.servicos}</TableCell>
                              <TableCell className="text-right">{loja.objetivo || 'N/A'}</TableCell>
                              <TableCell className={`text-right font-semibold ${loja.desvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {loja.desvio >= 0 ? '+' : ''}{loja.desvio?.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right">{loja.taxaReparacao?.toFixed(1) || 'N/A'}%</TableCell>
                              <TableCell className="text-center">
                                {loja.desvio >= 0 ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Acima
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Abaixo
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Análise de Performance - Lojas em Destaque e Atenção */}
              {analiseIA.analiseResultados && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Lojas em Destaque */}
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <TrendingUp className="h-5 w-5" />
                        Lojas em Destaque (Dados Quantitativos)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analiseIA.analiseResultados.lojasDestaque?.slice(0, 5).map((loja, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <Award className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            <span>{loja}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Lojas que Precisam Atenção */}
                  <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Target className="h-5 w-5" />
                        Lojas que Precisam Atenção (Dados Quantitativos)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analiseIA.analiseResultados.lojasAtencao?.slice(0, 5).map((loja, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <span>{loja}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Análise Detalhada */}
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
                        <h5 className="font-medium mb-2 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Resumo de Performance
                        </h5>
                        <p className="text-sm">{analiseIA.analiseResultados.resumoPerformance}</p>
                      </div>
                    )}

                    {/* Tendências */}
                    {analiseIA.analiseResultados.tendenciasServicos && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <TrendingUp className="h-4 w-4" />
                          Tendências Identificadas
                        </h5>
                        <p className="text-sm">{analiseIA.analiseResultados.tendenciasServicos}</p>
                      </div>
                    )}

                    {/* Recomendações */}
                    {analiseIA.analiseResultados.recomendacoes && analiseIA.analiseResultados.recomendacoes.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Recomendações Baseadas em Dados
                        </h5>
                        <ul className="space-y-2">
                          {analiseIA.analiseResultados.recomendacoes.map((rec, idx) => (
                            <li key={idx} className="text-sm p-3 bg-amber-50 dark:bg-amber-900/20 rounded flex items-start gap-2 border-l-2 border-amber-400">
                              <span className="text-amber-600 font-bold shrink-0">{idx + 1}.</span>
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
                    Selecione um período{isAdmin ? ' e filtros' : ''} e clique em "Gerar Relatório" para obter uma análise quantitativa detalhada dos resultados.
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
