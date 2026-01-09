import { useState, useMemo, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import FiltroMesesCheckbox, { type MesSelecionado, mesesParaDatas, gerarLabelMeses } from '../components/FiltroMesesCheckbox';
import { Button } from '../components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Target, Award, BarChart3, Sparkles, FileText, Trophy, Store, ArrowUpRight, ArrowDownRight, Globe, MapPin, User, Filter, AlertTriangle, CheckCircle2, XCircle, Percent, Activity, PieChart, X, Wrench, ShoppingBag, Zap, AlertCircle, ChevronDown, ChevronUp, Building2, Lightbulb, TrendingUpIcon, Calendar } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { useLanguage } from "@/contexts/LanguageContext";

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export function RelatorioIAResultados() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Estado para Relatório IA de Resultados - Novo sistema de múltiplos meses
  const [mesesSelecionados, setMesesSelecionados] = useState<MesSelecionado[]>(() => {
    // Por defeito, mês anterior
    const hoje = new Date();
    const mesAnterior = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
    const anoMesAnterior = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    return [{ mes: mesAnterior, ano: anoMesAnterior }];
  });
  const [mostrarRelatorioIA, setMostrarRelatorioIA] = useState(false);
  
  // Estados para filtros (apenas admin)
  const [tipoFiltro, setTipoFiltro] = useState<'pais' | 'zona' | 'gestor'>('pais');
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([]);
  const [gestorSeleccionado, setGestorSeleccionado] = useState<number | undefined>(undefined);
  
  // Estados para secções colapsáveis
  const [seccoesAbertas, setSeccoesAbertas] = useState({
    resumoExecutivo: true,
    kpis: true,
    rankings: true,
    zonas: true,
    analiseLojas: false, // Fechado por defeito pois pode ser grande
    insights: true,
    graficos: true,
    recomendacoes: true,
  });
  
  // Estado para ordenar a análise loja a loja
  const [ordenacaoLojas, setOrdenacaoLojas] = useState<'desvio' | 'servicos' | 'alfabetico'>('desvio');
  
  // Estados para filtros na análise loja a loja
  // Gestor: 'nacional' (todas) ou 'minhas' (apenas suas lojas)
  // Admin: 'nacional' (todas), 'gestor' (por gestor), 'zona' (por zona)
  // Valor por defeito: gestores começam com 'minhas', admins com 'nacional'
  const [filtroAnaliseLojas, setFiltroAnaliseLojas] = useState<'nacional' | 'minhas' | 'gestor' | 'zona'>(
    user?.role === 'admin' ? 'nacional' : 'minhas'
  );
  const [gestorFiltroLojas, setGestorFiltroLojas] = useState<number | undefined>(undefined);
  const [zonaFiltroLojas, setZonaFiltroLojas] = useState<string | undefined>(undefined);
  
  // Estado para período na análise loja a loja (igual aos filtros principais)
  const [periodoAnaliseLojas, setPeriodoAnaliseLojas] = useState<'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior'>('mes_anterior');
  
  // Efeito para atualizar o filtro quando o user carrega (gestores devem ver 'minhas' por defeito)
  useEffect(() => {
    if (user) {
      setFiltroAnaliseLojas(user.role === 'admin' ? 'nacional' : 'minhas');
    }
  }, [user?.role]);
  
  // Query para obter meses que têm dados disponíveis
  const { data: mesesDisponiveis } = trpc.relatoriosIA.getMesesDisponiveis.useQuery();
  
  // Efeito para atualizar meses selecionados quando os meses disponíveis são carregados
  useEffect(() => {
    if (mesesDisponiveis && mesesDisponiveis.length > 0) {
      // Selecionar o mês mais recente disponível por defeito
      const maisRecente = mesesDisponiveis[0];
      setMesesSelecionados([{ mes: maisRecente.mes, ano: maisRecente.ano }]);
    }
  }, [mesesDisponiveis]);
  
  // Queries para obter opções de filtro (apenas admin)
  const { data: zonas } = trpc.relatoriosIA.getZonas.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  const { data: gestores } = trpc.relatoriosIA.getGestoresParaFiltro.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  // Query para obter lojas do gestor atual (para filtro "Minhas Lojas")
  const { data: minhasLojas } = trpc.lojas.getByGestor.useQuery(undefined, {
    enabled: !isAdmin, // Apenas para gestores
  });
  
  // Query para obter lojas do gestor selecionado (para admin filtrar por gestor na análise loja a loja)
  const { data: lojasDoGestorSelecionado } = trpc.gestores.getLojas.useQuery(
    { gestorId: gestorFiltroLojas! },
    { enabled: isAdmin && filtroAnaliseLojas === 'gestor' && !!gestorFiltroLojas }
  );
  
  // Construir parâmetros da query baseado nos filtros
  const queryParams = useMemo(() => {
    // Calcular datas baseadas nos meses selecionados
    const datas = mesesParaDatas(mesesSelecionados);
    
    const params: {
      periodo: string;
      filtro?: 'pais' | 'zona' | 'gestor';
      zonasIds?: string[];
      gestorIdFiltro?: number;
      dataInicio?: Date;
      dataFim?: Date;
    } = {
      periodo: `meses_${mesesSelecionados.map(m => `${m.mes}/${m.ano}`).join(', ')}`,
      dataInicio: datas?.dataInicio,
      dataFim: datas?.dataFim,
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
  }, [mesesSelecionados, tipoFiltro, zonasSeleccionadas, gestorSeleccionado, isAdmin]);
  
  // Query para Relatório IA
  const { data: analiseIA, isLoading: loadingAnaliseIA, refetch: refetchAnaliseIA } = trpc.relatoriosIA.gerar.useQuery(
    queryParams,
    { enabled: false }
  );

  const handleGerarRelatorio = async () => {
    // Validar filtros
    if (isAdmin) {
      if (tipoFiltro === 'zona' && zonasSeleccionadas.length === 0) {
        toast.error(t('relatorioIA.selecionePeloMenosUmaZona') || 'Selecione pelo menos uma zona');
        return;
      }
      if (tipoFiltro === 'gestor' && !gestorSeleccionado) {
        toast.error(t('relatorioIA.selecioneUmGestor') || 'Selecione um gestor');
        return;
      }
    }
    
    toast.info(t('relatorioIA.aGerarRelatorio') || 'A gerar relatório IA de resultados avançado...');
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
  
  // Toggle secção
  const toggleSeccao = (seccao: keyof typeof seccoesAbertas) => {
    setSeccoesAbertas(prev => ({ ...prev, [seccao]: !prev[seccao] }));
  };
  
  const { t, language } = useLanguage();
  
  // Obter label do filtro actual
  const getFiltroLabel = () => {
    if (!isAdmin) return t('relatorioIA.minhasLojas') || 'Minhas Lojas';
    if (tipoFiltro === 'pais') return t('relatorioIA.todoOPais') || 'Todo o País';
    if (tipoFiltro === 'zona') {
      if (zonasSeleccionadas.length === 0) return t('relatorioIA.selecioneZonas') || 'Selecione zona(s)';
      if (zonasSeleccionadas.length === 1) return `${t('relatorioIA.zona') || 'Zona'}: ${zonasSeleccionadas[0]}`;
      return `${zonasSeleccionadas.length} ${t('relatorioIA.zonasSelecionadas') || 'zonas selecionadas'}`;
    }
    if (tipoFiltro === 'gestor') {
      const gestor = gestores?.find(g => g.id === gestorSeleccionado);
      return gestor ? `${t('relatorioIA.gestor') || 'Gestor'}: ${gestor.nome}` : t('relatorioIA.selecioneGestor') || 'Selecione gestor';
    }
    return '';
  };

  // Calcular taxa de cumprimento
  const taxaCumprimento = (analiseIA as any)?.comparacaoLojas 
    ? (((analiseIA as any).comparacaoLojas.lojasAcimaMedia / (analiseIA as any).comparacaoLojas.totalLojas) * 100).toFixed(1)
    : '0';

  // Formatar percentagem
  const formatPercent = (value: number | undefined | null, multiplier: number = 100) => {
    if (value === undefined || value === null) return 'N/A';
    const val = value * multiplier;
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  // Formatar valor monetário
  const formatMoney = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '€0,00';
    return `€${value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            {t('relatorioIA.titulo') || 'Relatório IA de Resultados'}
          </h1>
          <p className="text-muted-foreground">
            {t('relatorioIA.descricao') || 'Análise quantitativa profunda dos resultados de serviços com métricas detalhadas e rankings completos'}
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
                    {t('relatorioIA.gerarAnalise') || 'Gerar Análise Quantitativa'}
                  </CardTitle>
                  <CardDescription>
                    {t('relatorioIA.analiseBaseada') || 'Análise baseada em dados numéricos: serviços, objetivos, taxas e tendências'}
                  </CardDescription>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Período */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Período (selecione meses)</label>
                  <FiltroMesesCheckbox
                    mesesDisponiveis={mesesDisponiveis}
                    mesesSelecionados={mesesSelecionados}
                    onMesesChange={setMesesSelecionados}
                    placeholder="Selecionar meses"
                  />
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
                    
                    {/* Seleção de Zonas */}
                    {tipoFiltro === 'zona' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Zonas</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[200px] justify-between">
                              <span className="truncate">
                                {zonasSeleccionadas.length === 0 
                                  ? 'Selecione zona(s)...' 
                                  : zonasSeleccionadas.length === 1 
                                    ? zonasSeleccionadas[0]
                                    : `${zonasSeleccionadas.length} zonas`
                                }
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <div className="p-2 border-b flex gap-2">
                              <Button variant="ghost" size="sm" onClick={handleSelectAllZonas} className="text-xs">
                                Selecionar Todas
                              </Button>
                              <Button variant="ghost" size="sm" onClick={handleClearZonas} className="text-xs">
                                Limpar
                              </Button>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto p-2">
                              {zonas?.map((zona) => (
                                <div key={zona} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                  <Checkbox
                                    id={zona}
                                    checked={zonasSeleccionadas.includes(zona)}
                                    onCheckedChange={() => handleToggleZona(zona)}
                                  />
                                  <label htmlFor={zona} className="text-sm cursor-pointer flex-1">
                                    {zona}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {zonasSeleccionadas.length > 0 && (
                              <div className="p-2 border-t">
                                <div className="flex flex-wrap gap-1">
                                  {zonasSeleccionadas.map((zona) => (
                                    <Badge key={zona} variant="secondary" className="text-xs">
                                      {zona}
                                      <button
                                        onClick={() => handleToggleZona(zona)}
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    
                    {/* Seleção de Gestor */}
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
                  <ExportarRelatorioIAPDF analiseIA={analiseIA as any} periodo={gerarLabelMeses(mesesSelecionados)} />
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
              
              {/* ==================== RENDERIZAÇÃO PARA GESTORES (Análise Qualitativa) ==================== */}
              {(analiseIA as any).tipoRelatorio === 'gestor' ? (
                <div className="space-y-6">
                  {/* Resumo Geral */}
                  <Card className="border-2 border-purple-200 dark:border-purple-800">
                    <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Resumo do Período
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-muted-foreground leading-relaxed">{(analiseIA as any).resumoGeral}</p>
                    </CardContent>
                  </Card>

                  {/* Relatórios Submetidos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Relatórios Submetidos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{(analiseIA as any).relatorios?.totalLivres || 0}</p>
                          <p className="text-sm text-muted-foreground">Relatórios Livres</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{(analiseIA as any).relatorios?.totalCompletos || 0}</p>
                          <p className="text-sm text-muted-foreground">Relatórios Completos</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">{(analiseIA as any).relatorios?.lojasVisitadas?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Lojas Visitadas</p>
                        </div>
                      </div>
                      {(analiseIA as any).relatorios?.lojasVisitadas && (analiseIA as any).relatorios.lojasVisitadas.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Lojas visitadas:</p>
                          <div className="flex flex-wrap gap-2">
                            {(analiseIA as any).relatorios.lojasVisitadas.map((loja: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{loja}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pontos Destacados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-600" />
                        Pontos Destacados nos Relatórios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Análise da IA */}
                      {(analiseIA as any).pontosDestacados?.analise && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-400">
                            <Sparkles className="h-4 w-4" />
                            Análise IA
                          </h4>
                          <p className="text-sm leading-relaxed">{(analiseIA as any).pontosDestacados.analise}</p>
                        </div>
                      )}
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Pontos Positivos */}
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Pontos Positivos ({(analiseIA as any).pontosDestacados?.positivos?.length || 0})
                          </h4>
                          {(analiseIA as any).pontosDestacados?.positivos && (analiseIA as any).pontosDestacados.positivos.length > 0 ? (
                            <ul className="space-y-2">
                              {(analiseIA as any).pontosDestacados.positivos.map((ponto: any, idx: number) => (
                                <li key={idx} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">{ponto.loja}</Badge>
                                    <span className="text-xs text-muted-foreground">{ponto.data}</span>
                                  </div>
                                  <p>{ponto.descricao}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">Nenhum ponto positivo registado no período.</p>
                          )}
                        </div>

                        {/* Pontos Negativos */}
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
                            <XCircle className="h-4 w-4" />
                            Pontos Negativos ({(analiseIA as any).pontosDestacados?.negativos?.length || 0})
                          </h4>
                          {(analiseIA as any).pontosDestacados?.negativos && (analiseIA as any).pontosDestacados.negativos.length > 0 ? (
                            <ul className="space-y-2">
                              {(analiseIA as any).pontosDestacados.negativos.map((ponto: any, idx: number) => (
                                <li key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">{ponto.loja}</Badge>
                                    <span className="text-xs text-muted-foreground">{ponto.data}</span>
                                  </div>
                                  <p>{ponto.descricao}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">Nenhum ponto negativo registado no período.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pendentes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" />
                        Gestão de Pendentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Análise da IA */}
                      {(analiseIA as any).pendentes?.analise && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            <Sparkles className="h-4 w-4" />
                            Análise IA
                          </h4>
                          <p className="text-sm leading-relaxed">{(analiseIA as any).pendentes.analise}</p>
                        </div>
                      )}
                      
                      {/* KPIs de Pendentes */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-600">{(analiseIA as any).pendentes?.criados?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Criados no Período</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{(analiseIA as any).pendentes?.resolvidos?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Resolvidos no Período</p>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                          <p className="text-2xl font-bold text-red-600">{(analiseIA as any).pendentes?.ativos || 0}</p>
                          <p className="text-sm text-muted-foreground">Ativos (Total)</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Pendentes Criados */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-amber-700 dark:text-amber-400">Criados no Período</h4>
                          {(analiseIA as any).pendentes?.criados && (analiseIA as any).pendentes.criados.length > 0 ? (
                            <ul className="space-y-2 max-h-48 overflow-y-auto">
                              {(analiseIA as any).pendentes.criados.map((p: any, idx: number) => (
                                <li key={idx} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">{p.loja}</Badge>
                                    <span className="text-xs text-muted-foreground">{p.data}</span>
                                  </div>
                                  <p className="text-xs">{p.descricao}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">Nenhum pendente criado no período.</p>
                          )}
                        </div>

                        {/* Pendentes Resolvidos */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-green-700 dark:text-green-400">Resolvidos no Período</h4>
                          {(analiseIA as any).pendentes?.resolvidos && (analiseIA as any).pendentes.resolvidos.length > 0 ? (
                            <ul className="space-y-2 max-h-48 overflow-y-auto">
                              {(analiseIA as any).pendentes.resolvidos.map((p: any, idx: number) => (
                                <li key={idx} className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">{p.loja}</Badge>
                                    <span className="text-xs text-muted-foreground">Resolvido: {p.dataResolucao}</span>
                                  </div>
                                  <p className="text-xs">{p.descricao}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">Nenhum pendente resolvido no período.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sugestões e Motivação */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Sugestões */}
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Lightbulb className="h-5 w-5" />
                          Sugestões para Melhorar
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(analiseIA as any).sugestoesGestor && (analiseIA as any).sugestoesGestor.length > 0 ? (
                          <ul className="space-y-2">
                            {(analiseIA as any).sugestoesGestor.map((sug: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <Zap className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem sugestões disponíveis.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Mensagem Motivacional */}
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Sparkles className="h-5 w-5" />
                          Mensagem da IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                          <p className="text-sm leading-relaxed italic">"{(analiseIA as any).mensagemMotivacional || 'Continue o bom trabalho!'}"</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
              /* ==================== RENDERIZAÇÃO PARA ADMIN (Análise Quantitativa) ==================== */
              <>
              {/* ==================== SECÇÃO 1: RESUMO EXECUTIVO ==================== */}
              <Collapsible open={seccoesAbertas.resumoExecutivo} onOpenChange={() => toggleSeccao('resumoExecutivo')}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-lg">Resumo Executivo</h3>
                    </div>
                    {seccoesAbertas.resumoExecutivo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="space-y-4">
                    {/* Resumo Principal */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground leading-relaxed">{(analiseIA as any).resumo}</p>
                    </div>
                    
                    {/* Insights IA - Resumo Executivo */}
                    {(analiseIA as any).insightsIA?.resumoExecutivo && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-400">
                          <Sparkles className="h-4 w-4" />
                          Análise IA
                        </h4>
                        <p className="text-sm leading-relaxed">{(analiseIA as any).insightsIA.resumoExecutivo}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ==================== SECÇÃO 2: KPIs PRINCIPAIS ==================== */}
              {(analiseIA as any).comparacaoLojas && (
                <Collapsible open={seccoesAbertas.kpis} onOpenChange={() => toggleSeccao('kpis')}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">KPIs Principais</h3>
                      </div>
                      {seccoesAbertas.kpis ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      {/* Total Lojas */}
                      <Card className="bg-slate-50 dark:bg-slate-900/50">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Store className="h-4 w-4 text-slate-600" />
                            <span className="text-xs text-muted-foreground">Lojas Analisadas</span>
                          </div>
                          <p className="text-2xl font-bold">{(analiseIA as any).comparacaoLojas.totalLojas}</p>
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
                          <p className="text-2xl font-bold text-green-600">{(analiseIA as any).comparacaoLojas.lojasAcimaMedia}</p>
                        </CardContent>
                      </Card>

                      {/* Abaixo Objetivo */}
                      <Card className="bg-red-50 dark:bg-red-900/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-muted-foreground">Abaixo Objetivo</span>
                          </div>
                          <p className="text-2xl font-bold text-red-600">{(analiseIA as any).comparacaoLojas.lojasAbaixoMedia || ((analiseIA as any).comparacaoLojas.totalLojas - (analiseIA as any).comparacaoLojas.lojasAcimaMedia)}</p>
                        </CardContent>
                      </Card>

                      {/* Taxa Reparação Média */}
                      <Card className="bg-purple-50 dark:bg-purple-900/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Wrench className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-muted-foreground">Taxa Rep. Média</span>
                          </div>
                          <p className="text-2xl font-bold text-purple-600">
                            {(analiseIA as any).comparacaoLojas.mediaTaxaReparacao 
                              ? `${((analiseIA as any).comparacaoLojas.mediaTaxaReparacao * 100).toFixed(2)}%`
                              : 'N/A'
                            }
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Destaques de Performance - Melhor e Pior */}
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      {/* Líder de Performance */}
                      <Card className="border-2 border-green-300 dark:border-green-700">
                        <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/20">
                          <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Trophy className="h-5 w-5" />
                            Líder de Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <p className="text-xl font-bold mb-2">{(analiseIA as any).comparacaoLojas.melhorLoja?.nome || 'N/A'}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Serviços:</span>
                              <span className="font-semibold ml-1">{(analiseIA as any).comparacaoLojas.melhorLoja?.servicos || 0}</span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Objetivo:</span>
                              <span className="font-semibold ml-1">{(analiseIA as any).comparacaoLojas.melhorLoja?.objetivo || 'N/A'}</span>
                            </div>
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                              <span className="text-muted-foreground">Desvio:</span>
                              <span className="font-semibold ml-1 text-green-600">
                                {formatPercent((analiseIA as any).comparacaoLojas.melhorLoja?.desvio, 100)}
                              </span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Taxa Rep.:</span>
                              <span className="font-semibold ml-1">
                                {(analiseIA as any).comparacaoLojas.melhorLoja?.taxaReparacao 
                                  ? `${((analiseIA as any).comparacaoLojas.melhorLoja.taxaReparacao * 100).toFixed(2)}%`
                                  : 'N/A'
                                }
                              </span>
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
                          <p className="text-xl font-bold mb-2">{(analiseIA as any).comparacaoLojas.piorLoja?.nome || 'N/A'}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Serviços:</span>
                              <span className="font-semibold ml-1">{(analiseIA as any).comparacaoLojas.piorLoja?.servicos || 0}</span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Objetivo:</span>
                              <span className="font-semibold ml-1">{(analiseIA as any).comparacaoLojas.piorLoja?.objetivo || 'N/A'}</span>
                            </div>
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
                              <span className="text-muted-foreground">Desvio:</span>
                              <span className="font-semibold ml-1 text-red-600">
                                {formatPercent((analiseIA as any).comparacaoLojas.piorLoja?.desvio, 100)}
                              </span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <span className="text-muted-foreground">Taxa Rep.:</span>
                              <span className="font-semibold ml-1">
                                {(analiseIA as any).comparacaoLojas.piorLoja?.taxaReparacao 
                                  ? `${((analiseIA as any).comparacaoLojas.piorLoja.taxaReparacao * 100).toFixed(2)}%`
                                  : 'N/A'
                                }
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ==================== SECÇÃO 3: RANKINGS DETALHADOS ==================== */}
              {(analiseIA as any).rankingsDetalhados && (
                <Collapsible open={seccoesAbertas.rankings} onOpenChange={() => toggleSeccao('rankings')}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-600" />
                        <h3 className="font-semibold text-lg">Rankings Detalhados</h3>
                      </div>
                      {seccoesAbertas.rankings ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <Tabs defaultValue="objetivo" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="objetivo" className="text-xs sm:text-sm">
                          <Target className="h-4 w-4 mr-1 hidden sm:inline" />
                          Objetivo
                        </TabsTrigger>
                        <TabsTrigger value="reparacao" className="text-xs sm:text-sm">
                          <Wrench className="h-4 w-4 mr-1 hidden sm:inline" />
                          Reparação
                        </TabsTrigger>
                        <TabsTrigger value="vendas" className="text-xs sm:text-sm">
                          <ShoppingBag className="h-4 w-4 mr-1 hidden sm:inline" />
                          Vendas
                        </TabsTrigger>
                        <TabsTrigger value="crescimento" className="text-xs sm:text-sm">
                          <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
                          Crescimento
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* Tab Cumprimento de Objetivo */}
                      <TabsContent value="objetivo" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* TOP 5 */}
                          <Card className="border-green-200 dark:border-green-800">
                            <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                                <TrendingUp className="h-4 w-4" />
                                TOP 5 - Melhor Cumprimento de Objetivo
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.cumprimentoObjetivo.top5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50/50 dark:bg-green-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-green-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-green-600 font-semibold">
                                        {formatPercent(loja.desvioPercentualMes, 100)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {loja.totalServicos}/{loja.objetivoMensal}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* BOTTOM 5 */}
                          <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                                <TrendingDown className="h-4 w-4" />
                                BOTTOM 5 - Pior Cumprimento de Objetivo
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.cumprimentoObjetivo.bottom5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-red-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-red-600 font-semibold">
                                        {formatPercent(loja.desvioPercentualMes, 100)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {loja.totalServicos}/{loja.objetivoMensal}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                      
                      {/* Tab Taxa de Reparação */}
                      <TabsContent value="reparacao" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* TOP 5 */}
                          <Card className="border-green-200 dark:border-green-800">
                            <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                                <Wrench className="h-4 w-4" />
                                TOP 5 - Melhor Taxa de Reparação
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.taxaReparacao.top5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50/50 dark:bg-green-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-green-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-green-600 font-semibold">
                                        {(loja.taxaReparacao * 100).toFixed(2)}%
                                      </span>
                                      <span className="text-muted-foreground">
                                        {loja.qtdReparacoes} rep.
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* BOTTOM 5 */}
                          <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                                <Wrench className="h-4 w-4" />
                                BOTTOM 5 - Pior Taxa de Reparação
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.taxaReparacao.bottom5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-red-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-red-600 font-semibold">
                                        {(loja.taxaReparacao * 100).toFixed(2)}%
                                      </span>
                                      <span className="text-muted-foreground">
                                        {loja.qtdReparacoes} rep.
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                      
                      {/* Tab Vendas Complementares */}
                      <TabsContent value="vendas" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* TOP 5 */}
                          <Card className="border-green-200 dark:border-green-800">
                            <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                                <ShoppingBag className="h-4 w-4" />
                                TOP 5 - Melhores Vendas Complementares
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.vendasComplementares.top5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50/50 dark:bg-green-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-green-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-green-600 font-semibold">
                                        {formatMoney(loja.totalVendas)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Esc: {formatMoney(loja.escovasVendas)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* BOTTOM 5 */}
                          <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                                <ShoppingBag className="h-4 w-4" />
                                BOTTOM 5 - Piores Vendas Complementares
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.vendasComplementares.bottom5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-red-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-red-600 font-semibold">
                                        {formatMoney(loja.totalVendas)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Estatísticas de Vendas Complementares */}
                        {(analiseIA as any).estatisticasComplementares && (
                          <Card className="mt-4">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <PieChart className="h-4 w-4" />
                                Resumo de Vendas Complementares
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="p-3 bg-muted/30 rounded">
                                  <span className="text-muted-foreground block text-xs">Total Vendas</span>
                                  <span className="font-bold text-lg">{formatMoney((analiseIA as any).estatisticasComplementares.somaVendas)}</span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded">
                                  <span className="text-muted-foreground block text-xs">Lojas c/ Vendas</span>
                                  <span className="font-bold text-lg">
                                    {(analiseIA as any).estatisticasComplementares.lojasComVendas}/{(analiseIA as any).estatisticasComplementares.totalLojas}
                                  </span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded">
                                  <span className="text-muted-foreground block text-xs">Total Escovas</span>
                                  <span className="font-bold text-lg">{(analiseIA as any).estatisticasComplementares.totalEscovasQtd} un.</span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded">
                                  <span className="text-muted-foreground block text-xs">Média % Escovas</span>
                                  <span className="font-bold text-lg">
                                    {((analiseIA as any).estatisticasComplementares.mediaEscovasPercent * 100).toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                      
                      {/* Tab Crescimento */}
                      <TabsContent value="crescimento" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* TOP 5 */}
                          <Card className="border-green-200 dark:border-green-800">
                            <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                                <ArrowUpRight className="h-4 w-4" />
                                TOP 5 - Maior Crescimento vs Mês Anterior
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.crescimento.top5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50/50 dark:bg-green-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-green-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-green-600 font-semibold">
                                        +{loja.crescimento.toFixed(2)}%
                                      </span>
                                      <span className="text-muted-foreground">
                                        {loja.servicosAnterior}→{loja.totalServicos}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* BOTTOM 5 */}
                          <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/20">
                              <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                                <ArrowDownRight className="h-4 w-4" />
                                BOTTOM 5 - Maior Decréscimo vs Mês Anterior
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {(analiseIA as any).rankingsDetalhados.crescimento.bottom5.map((loja: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-900/10 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-red-600 w-6">{idx + 1}.</span>
                                      <span className="font-medium truncate max-w-[120px]">{loja.lojaNome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-red-600 font-semibold">
                                        {loja.crescimento.toFixed(2)}%
                                      </span>
                                      <span className="text-muted-foreground">
                                        {loja.servicosAnterior}→{loja.totalServicos}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ==================== SECÇÃO 4: ANÁLISE POR ZONAS ==================== */}
              {(analiseIA as any).analiseZonasDetalhada && (analiseIA as any).analiseZonasDetalhada.length > 0 && (
                <Collapsible open={seccoesAbertas.zonas} onOpenChange={() => toggleSeccao('zonas')}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">Análise por Zonas</h3>
                      </div>
                      {seccoesAbertas.zonas ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Zona</TableHead>
                            <TableHead className="text-center">Lojas</TableHead>
                            <TableHead className="text-right">Serviços</TableHead>
                            <TableHead className="text-right">Objetivo</TableHead>
                            <TableHead className="text-right">Desvio Médio</TableHead>
                            <TableHead className="text-right">Taxa Rep.</TableHead>
                            <TableHead className="text-center">Cumprimento</TableHead>
                            <TableHead>Melhor Loja</TableHead>
                            <TableHead>Pior Loja</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(analiseIA as any).analiseZonasDetalhada.map((zona: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{zona.zona}</TableCell>
                              <TableCell className="text-center">{zona.totalLojas}</TableCell>
                              <TableCell className="text-right">{zona.somaServicos}</TableCell>
                              <TableCell className="text-right">{zona.somaObjetivos}</TableCell>
                              <TableCell className={`text-right font-semibold ${zona.mediaDesvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(zona.mediaDesvio, 100)}
                              </TableCell>
                              <TableCell className="text-right">
                                {(zona.mediaTaxaReparacao * 100).toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={zona.taxaCumprimento >= 50 ? 'default' : 'destructive'} className="text-xs">
                                  {zona.lojasAcimaObjetivo}/{zona.totalLojas} ({zona.taxaCumprimento.toFixed(0)}%)
                                </Badge>
                              </TableCell>
                              <TableCell className="text-green-600 text-sm">
                                {zona.melhorLoja} ({formatPercent(zona.melhorLojaDesvio, 100)})
                              </TableCell>
                              <TableCell className="text-red-600 text-sm">
                                {zona.piorLoja} ({formatPercent(zona.piorLojaDesvio, 100)})
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ==================== SECÇÃO 5: ANÁLISE LOJA A LOJA ==================== */}
              {(analiseIA as any).dadosGraficos?.rankingServicos && (analiseIA as any).dadosGraficos.rankingServicos.length > 0 && (
                <Collapsible open={seccoesAbertas.analiseLojas} onOpenChange={() => toggleSeccao('analiseLojas')}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-lg">Análise Loja a Loja</h3>
                        <Badge variant="outline" className="ml-2">
                          {(analiseIA as any).dadosGraficos.rankingServicos.length} lojas
                        </Badge>
                      </div>
                      {seccoesAbertas.analiseLojas ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    {/* Controlos de filtro e ordenação */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                      {/* Filtro por período */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Período:</span>
                        <Select value={periodoAnaliseLojas} onValueChange={(v) => setPeriodoAnaliseLojas(v as typeof periodoAnaliseLojas)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                            <SelectItem value="trimestre_anterior">Trimestre Anterior</SelectItem>
                            <SelectItem value="semestre_anterior">Semestre Anterior</SelectItem>
                            <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Separador */}
                      <div className="h-6 w-px bg-border hidden md:block" />
                      
                      {/* Filtro por âmbito - diferente para gestor e admin */}
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filtrar:</span>
                        <Select 
                          value={filtroAnaliseLojas} 
                          onValueChange={(v) => {
                            setFiltroAnaliseLojas(v as typeof filtroAnaliseLojas);
                            setGestorFiltroLojas(undefined);
                            setZonaFiltroLojas(undefined);
                          }}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nacional">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Nacional
                              </div>
                            </SelectItem>
                            {!isAdmin && (
                              <SelectItem value="minhas">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4" />
                                  Minhas Lojas
                                </div>
                              </SelectItem>
                            )}
                            {isAdmin && (
                              <>
                                <SelectItem value="gestor">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Por Gestor
                                  </div>
                                </SelectItem>
                                <SelectItem value="zona">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Por Zona
                                  </div>
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Seletor de gestor (apenas admin + filtro gestor) */}
                      {isAdmin && filtroAnaliseLojas === 'gestor' && gestores && (
                        <Select 
                          value={gestorFiltroLojas?.toString() || ''} 
                          onValueChange={(v) => setGestorFiltroLojas(v ? parseInt(v) : undefined)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Selecione gestor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {gestores.map((g) => (
                              <SelectItem key={g.id} value={g.id.toString()}>
                                {g.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Seletor de zona (apenas admin + filtro zona) */}
                      {isAdmin && filtroAnaliseLojas === 'zona' && zonas && (
                        <Select 
                          value={zonaFiltroLojas || ''} 
                          onValueChange={(v) => setZonaFiltroLojas(v || undefined)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Selecione zona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {zonas.map((z) => (
                              <SelectItem key={z} value={z}>
                                {z}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Separador */}
                      <div className="h-6 w-px bg-border hidden md:block" />
                      
                      {/* Ordenação */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ordenar:</span>
                        <Select value={ordenacaoLojas} onValueChange={(v) => setOrdenacaoLojas(v as typeof ordenacaoLojas)}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desvio">Desvio vs Objetivo</SelectItem>
                            <SelectItem value="servicos">Total de Serviços</SelectItem>
                            <SelectItem value="alfabetico">Ordem Alfabética</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Tabela de análise loja a loja */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Loja</TableHead>
                            {isAdmin && <TableHead>Zona</TableHead>}
                            <TableHead className="text-right">Serviços</TableHead>
                            <TableHead className="text-right">Objetivo</TableHead>
                            <TableHead className="text-right">Desvio</TableHead>
                            <TableHead className="text-right">Taxa Rep.</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Aplicar filtro
                            let lojasFiltradas = [...(analiseIA as any).dadosGraficos.rankingServicos];
                            
                            // Filtro para gestor: "minhas" = apenas lojas do gestor
                            if (!isAdmin && filtroAnaliseLojas === 'minhas' && minhasLojas) {
                              const minhasLojasIds = minhasLojas.map(l => l.id);
                              lojasFiltradas = lojasFiltradas.filter(l => 
                                l.lojaId && minhasLojasIds.includes(l.lojaId)
                              );
                            }
                            
                            // Filtro para admin: por gestor
                            if (isAdmin && filtroAnaliseLojas === 'gestor' && gestorFiltroLojas && lojasDoGestorSelecionado) {
                              const lojasIdsDoGestor = lojasDoGestorSelecionado.map(l => l.id);
                              lojasFiltradas = lojasFiltradas.filter(l => 
                                l.lojaId && lojasIdsDoGestor.includes(l.lojaId)
                              );
                            }
                            
                            // Filtro para admin: por zona
                            if (isAdmin && filtroAnaliseLojas === 'zona' && zonaFiltroLojas) {
                              lojasFiltradas = lojasFiltradas.filter(l => 
                                l.zona === zonaFiltroLojas
                              );
                            }
                            
                            // Ordenar
                            lojasFiltradas.sort((a, b) => {
                              if (ordenacaoLojas === 'desvio') return (b.desvio || 0) - (a.desvio || 0);
                              if (ordenacaoLojas === 'servicos') return (b.servicos || 0) - (a.servicos || 0);
                              return a.loja.localeCompare(b.loja);
                            });
                            
                            return lojasFiltradas.map((loja, idx) => {
                              const desvioPercent = (loja.desvio || 0) * 100;
                              const taxaRepPercent = (loja.taxaReparacao || 0) * 100;
                              const acimaMeta = desvioPercent >= 0;
                              
                              return (
                                <TableRow key={idx} className={acimaMeta ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}>
                                  <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                                  <TableCell className="font-medium">{loja.loja}</TableCell>
                                  {isAdmin && <TableCell className="text-muted-foreground">{loja.zona || '-'}</TableCell>}
                                  <TableCell className="text-right font-semibold">{loja.servicos}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{loja.objetivo || 'N/A'}</TableCell>
                                  <TableCell className={`text-right font-semibold ${acimaMeta ? 'text-green-600' : 'text-red-600'}`}>
                                    {desvioPercent >= 0 ? '+' : ''}{desvioPercent.toFixed(2)}%
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {taxaRepPercent > 0 ? `${taxaRepPercent.toFixed(2)}%` : 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {acimaMeta ? (
                                      <Badge variant="default" className="bg-green-600 text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Acima
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Abaixo
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Resumo rápido - usa os mesmos filtros */}
                    {(() => {
                      // Aplicar os mesmos filtros para o resumo
                      let lojasFiltradas = [...(analiseIA as any).dadosGraficos.rankingServicos];
                      
                      if (!isAdmin && filtroAnaliseLojas === 'minhas' && minhasLojas) {
                        const minhasLojasIds = minhasLojas.map(l => l.id);
                        lojasFiltradas = lojasFiltradas.filter(l => 
                          l.lojaId && minhasLojasIds.includes(l.lojaId)
                        );
                      }
                      
                      if (isAdmin && filtroAnaliseLojas === 'gestor' && gestorFiltroLojas && lojasDoGestorSelecionado) {
                        const lojasIdsDoGestor = lojasDoGestorSelecionado.map(l => l.id);
                        lojasFiltradas = lojasFiltradas.filter(l => 
                          l.lojaId && lojasIdsDoGestor.includes(l.lojaId)
                        );
                      }
                      
                      if (isAdmin && filtroAnaliseLojas === 'zona' && zonaFiltroLojas) {
                        lojasFiltradas = lojasFiltradas.filter(l => l.zona === zonaFiltroLojas);
                      }
                      
                      const totalLojas = lojasFiltradas.length;
                      const acimaObjetivo = lojasFiltradas.filter(l => (l.desvio || 0) >= 0).length;
                      const abaixoObjetivo = lojasFiltradas.filter(l => (l.desvio || 0) < 0).length;
                      const totalServicos = lojasFiltradas.reduce((sum, l) => sum + (l.servicos || 0), 0);
                      
                      return (
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Total Lojas</p>
                              <p className="text-lg font-bold">{totalLojas}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Acima do Objetivo</p>
                              <p className="text-lg font-bold text-green-600">{acimaObjetivo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Abaixo do Objetivo</p>
                              <p className="text-lg font-bold text-red-600">{abaixoObjetivo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Serviços</p>
                              <p className="text-lg font-bold">{totalServicos}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ==================== SECÇÃO 6: INSIGHTS IA ==================== */}
              {(analiseIA as any).insightsIA && (
                <Collapsible open={seccoesAbertas.insights} onOpenChange={() => toggleSeccao('insights')}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-300 dark:border-purple-700 cursor-pointer hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-900/40 dark:hover:to-pink-900/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-lg">Insights IA - Análise Profunda</h3>
                      </div>
                      {seccoesAbertas.insights ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {/* Análise de Performance */}
                    {(analiseIA as any).insightsIA.analisePerformance && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Activity className="h-4 w-4" />
                          Análise de Performance
                        </h4>
                        <p className="text-sm leading-relaxed">{(analiseIA as any).insightsIA.analisePerformance}</p>
                      </div>
                    )}
                    
                    {/* Análise de Vendas Complementares */}
                    {(analiseIA as any).insightsIA.analiseVendasComplementares && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                          <ShoppingBag className="h-4 w-4" />
                          Análise de Vendas Complementares
                        </h4>
                        <p className="text-sm leading-relaxed">{(analiseIA as any).insightsIA.analiseVendasComplementares}</p>
                      </div>
                    )}
                    
                    {/* Análise de Tendências */}
                    {(analiseIA as any).insightsIA.analiseTendencias && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <TrendingUpIcon className="h-4 w-4" />
                          Análise de Tendências
                        </h4>
                        <p className="text-sm leading-relaxed">{(analiseIA as any).insightsIA.analiseTendencias}</p>
                      </div>
                    )}
                    
                    {/* Alertas Críticos */}
                    {(analiseIA as any).insightsIA.alertasCriticos && (analiseIA as any).insightsIA.alertasCriticos.length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          Alertas Críticos
                        </h4>
                        <ul className="space-y-2">
                          {(analiseIA as any).insightsIA.alertasCriticos.map((alerta: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                              <span>{alerta}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ==================== SECÇÃO 6: GRÁFICOS ==================== */}
              <Collapsible open={seccoesAbertas.graficos} onOpenChange={() => toggleSeccao('graficos')}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-slate-600" />
                      <h3 className="font-semibold text-lg">Visualizações</h3>
                    </div>
                    {seccoesAbertas.graficos ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Gráfico de Ranking por Serviços */}
                    {(analiseIA as any).dadosGraficos?.rankingServicos && (analiseIA as any).dadosGraficos.rankingServicos.length > 0 && (
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
                                labels: (analiseIA as any).dadosGraficos.rankingServicos.map((l: any) => l.loja.length > 10 ? l.loja.substring(0, 10) + '...' : l.loja),
                                datasets: [{
                                  label: 'Serviços',
                                  data: (analiseIA as any).dadosGraficos.rankingServicos.map((l: any) => l.servicos),
                                  backgroundColor: (analiseIA as any).dadosGraficos.rankingServicos.map((l: any) => 
                                    l.desvio >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                                  ),
                                  borderColor: (analiseIA as any).dadosGraficos.rankingServicos.map((l: any) => 
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
                    {(analiseIA as any).dadosGraficos?.distribuicaoDesvios && (analiseIA as any).dadosGraficos.distribuicaoDesvios.length > 0 && (
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
                                labels: (analiseIA as any).dadosGraficos.distribuicaoDesvios.map((d: any) => d.faixa),
                                datasets: [{
                                  data: (analiseIA as any).dadosGraficos.distribuicaoDesvios.map((d: any) => d.count),
                                  backgroundColor: [
                                    'rgba(239, 68, 68, 0.8)',
                                    'rgba(249, 115, 22, 0.8)',
                                    'rgba(251, 191, 36, 0.8)',
                                    'rgba(163, 230, 53, 0.8)',
                                    'rgba(34, 197, 94, 0.8)',
                                    'rgba(16, 185, 129, 0.8)',
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
                </CollapsibleContent>
              </Collapsible>

              {/* ==================== SECÇÃO 7: RECOMENDAÇÕES ==================== */}
              <Collapsible open={seccoesAbertas.recomendacoes} onOpenChange={() => toggleSeccao('recomendacoes')}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-lg">Recomendações Estratégicas</h3>
                    </div>
                    {seccoesAbertas.recomendacoes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Lojas em Destaque */}
                    {(analiseIA as any).analiseResultados?.lojasDestaque && (analiseIA as any).analiseResultados.lojasDestaque.length > 0 && (
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Award className="h-5 w-5" />
                            Lojas em Destaque
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {(analiseIA as any).analiseResultados.lojasDestaque.slice(0, 5).map((loja: string, idx: number) => (
                              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                <Award className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                <span>{loja}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lojas que Precisam Atenção */}
                    {(analiseIA as any).analiseResultados?.lojasAtencao && (analiseIA as any).analiseResultados.lojasAtencao.length > 0 && (
                      <Card className="border-l-4 border-l-amber-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <Target className="h-5 w-5" />
                            Lojas que Precisam Atenção
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {(analiseIA as any).analiseResultados.lojasAtencao.slice(0, 5).map((loja: string, idx: number) => (
                              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <span>{loja}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Recomendações Estratégicas da IA */}
                  {(analiseIA as any).insightsIA?.recomendacoesEstrategicas && (analiseIA as any).insightsIA.recomendacoesEstrategicas.length > 0 && (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-5 w-5 text-amber-500" />
                          Recomendações Estratégicas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {(analiseIA as any).insightsIA.recomendacoesEstrategicas.map((rec: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded border-l-2 border-amber-400">
                              <span className="text-amber-600 font-bold shrink-0 w-6">{idx + 1}.</span>
                              <span className="text-sm">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recomendações Baseadas em Dados */}
                  {(analiseIA as any).analiseResultados?.recomendacoes && (analiseIA as any).analiseResultados.recomendacoes.length > 0 && (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Recomendações Baseadas em Dados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {(analiseIA as any).analiseResultados.recomendacoes.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm p-3 bg-muted/30 rounded flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </CollapsibleContent>
              </Collapsible>
              </>
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
