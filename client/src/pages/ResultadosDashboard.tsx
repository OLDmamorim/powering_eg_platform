import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Target, Award, BarChart3, LineChart, MapPin, Download, ShoppingBag, Package, SmilePlus } from 'lucide-react';
import { useAuth } from '../_core/hooks/useAuth';
import { toast } from 'sonner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { AlertasPerformance } from '../components/AlertasPerformance';
import { GraficoEvolucaoHistorica } from '../components/GraficoEvolucaoHistorica';
import { ResultadosChatbot } from '../components/ResultadosChatbot';
import FiltroMesesCheckbox, { type MesSelecionado, gerarLabelMeses } from '../components/FiltroMesesCheckbox';
import { useLanguage } from "@/contexts/LanguageContext";
import { useDemo } from "@/contexts/DemoContext";
import { demoResultadosMensais, demoLojas, demoTotaisGlobais } from "@/lib/demoData";

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


export function ResultadosDashboard() {
  
  const { user } = useAuth();
  const { isDemo } = useDemo();
  
  // Buscar dados do gestor se usuário for gestor
  const { data: gestorData, isLoading: loadingGestorData } = trpc.gestores.me.useQuery(
    undefined,
    { enabled: user?.role === 'gestor' }
  );
  
  
  // Estado dos filtros - agora com suporte a múltiplos meses
  const [mesesSelecionados, setMesesSelecionados] = useState<MesSelecionado[]>([]);
  const [periodoComparacao1, setPeriodoComparacao1] = useState<{ mes: number; ano: number } | null>(null);
  const [periodoComparacao2, setPeriodoComparacao2] = useState<{ mes: number; ano: number } | null>(null);
  const [lojaSelecionada, setLojaSelecionada] = useState<number | 'minhas' | 'todas' | null>(null);
  
  const [metricaRanking, setMetricaRanking] = useState<'totalServicos' | 'taxaReparacao' | 'desvioPercentualMes' | 'servicosPorColaborador'>('totalServicos');
  const [exportando, setExportando] = useState(false);
  
  // Compatível com código antigo - primeiro período selecionado
  const periodoSelecionado = mesesSelecionados.length > 0 ? mesesSelecionados[0] : null;
  
  // Flag para saber se está em modo múltiplos meses
  const modoMultiplosMeses = mesesSelecionados.length > 1;
  

  
  // Mutation de exportação
  const exportarMutation = trpc.resultados.exportarExcel.useMutation();
  

  
  // Queries
  const { data: periodos, isLoading: loadingPeriodos } = trpc.resultados.periodos.useQuery();
  const { data: lojas, isLoading: loadingLojas } = trpc.lojas.getByGestor.useQuery();
  
  // Query para obter total global de lojas (sem filtro de gestor)
  const { data: todasLojas } = trpc.lojas.list.useQuery();
  
  // Definir período padrão (mais recente)
  useMemo(() => {
    if (periodos && periodos.length > 0 && mesesSelecionados.length === 0) {
      setMesesSelecionados([{ mes: periodos[0].mes, ano: periodos[0].ano }]);
    }
  }, [periodos, mesesSelecionados.length]);
  
  // Definir loja padrão como "minhas" para gestores
  useMemo(() => {
    if (user?.role === 'gestor' && lojaSelecionada === null) {
      setLojaSelecionada('minhas');
    }
  }, [user, lojaSelecionada]);
  
  // Preparar filtro de lojas
  const lojasIdsParaFiltro = useMemo(() => {
    // "Todas as Lojas" = sem filtro (undefined)
    if (lojaSelecionada === 'todas' || lojaSelecionada === null) {
      return undefined;
    }
    // "Minhas Lojas" = filtrar pelas lojas do gestor
    if (lojaSelecionada === 'minhas' && user?.role === 'gestor' && lojas) {
      return lojas.map(l => l.id);
    }
    return undefined;
  }, [lojaSelecionada, user, lojas]);
  
  // Query de totais globais (incluindo PROMOTOR) - suporta múltiplos meses
  const { data: totaisGlobais } = trpc.resultados.totaisGlobaisMultiplosMeses.useQuery(
    { periodos: mesesSelecionados },
    { enabled: mesesSelecionados.length > 0 && (lojaSelecionada === 'todas' || lojaSelecionada === null) }
  );
  
  // Queries condicionais - suporta múltiplos meses
  const { data: estatisticas, isLoading: loadingEstatisticas } = trpc.resultados.estatisticasMultiplosMeses.useQuery(
    { 
      periodos: mesesSelecionados,
      lojaId: typeof lojaSelecionada === 'number' ? lojaSelecionada : undefined,
      lojasIds: lojasIdsParaFiltro
    },
    { enabled: mesesSelecionados.length > 0 }
  );
  
  // Queries para períodos de comparação
  const { data: estatisticasComp1, isLoading: loadingEstatisticasComp1 } = trpc.resultados.estatisticas.useQuery(
    { 
      mes: periodoComparacao1?.mes || 1, 
      ano: periodoComparacao1?.ano || 2025,
      lojaId: typeof lojaSelecionada === 'number' ? lojaSelecionada : undefined,
      lojasIds: lojasIdsParaFiltro
    },
    { enabled: !!periodoComparacao1 }
  );
  
  const { data: estatisticasComp2, isLoading: loadingEstatisticasComp2 } = trpc.resultados.estatisticas.useQuery(
    { 
      mes: periodoComparacao2?.mes || 1, 
      ano: periodoComparacao2?.ano || 2025,
      lojaId: typeof lojaSelecionada === 'number' ? lojaSelecionada : undefined,
      lojasIds: lojasIdsParaFiltro
    },
    { enabled: !!periodoComparacao2 }
  );
  
  // Calcular limite e filtro para ranking
  const rankingLimit = useMemo(() => {
    // Se "Minhas Lojas" selecionado, buscar todas as lojas do gestor
    if (lojaSelecionada === 'minhas' && lojas) {
      return Math.max(lojas.length, 20);
    }
    // Se loja individual, buscar apenas essa
    if (typeof lojaSelecionada === 'number') {
      return 10;
    }
    // Nacional/Todas/Zona: mostrar TODAS as lojas
    return 200;
  }, [lojaSelecionada, lojas]);
  
  const rankingLojasIds = useMemo(() => {
    // Se "Minhas Lojas" selecionado, filtrar pelo backend
    if (lojaSelecionada === 'minhas' && lojas) {
      return lojas.map(l => l.id);
    }
    // Se loja individual, filtrar pelo backend
    if (typeof lojaSelecionada === 'number') {
      return [lojaSelecionada];
    }
    return undefined;
  }, [lojaSelecionada, lojas]);
  
  // Query de ranking - suporta múltiplos meses
  const { data: rankingCompleto, isLoading: loadingRanking } = trpc.resultados.rankingMultiplosMeses.useQuery(
    { 
      metrica: metricaRanking, 
      periodos: mesesSelecionados,
      limit: rankingLimit,
      lojasIds: rankingLojasIds
    },
    { enabled: mesesSelecionados.length > 0 }
  );
  
  // Ranking já vem filtrado do backend, apenas usar diretamente
  const ranking = rankingCompleto;
  
  // Query de ranking NACIONAL (sem filtro de lojas) - para comparação quando não está em "Todas as Lojas"
  // Mostra comparação nacional quando: gestor com "Minhas Lojas", ou qualquer user com loja individual
  const isMinhasLojas = lojaSelecionada === 'minhas' && user?.role === 'gestor';
  const mostrarComparacaoNacional = isMinhasLojas || typeof lojaSelecionada === 'number';
  const { data: rankingNacional } = trpc.resultados.rankingMultiplosMeses.useQuery(
    { 
      metrica: metricaRanking, 
      periodos: mesesSelecionados,
      limit: 200, // buscar todas as lojas para calcular média nacional
      lojasIds: undefined // sem filtro = nacional
    },
    { enabled: mesesSelecionados.length > 0 && mostrarComparacaoNacional }
  );
  
  const { data: porZona, isLoading: loadingZona } = trpc.resultados.porZona.useQuery(
    { mes: periodoSelecionado?.mes || 1, ano: periodoSelecionado?.ano || 2025 },
    { enabled: !!periodoSelecionado }
  );
  
  // Queries de vendas complementares
  const { data: temDadosComplementares } = trpc.complementares.temDados.useQuery(
    { mes: periodoSelecionado?.mes || 1, ano: periodoSelecionado?.ano || 2025 },
    { enabled: !!periodoSelecionado }
  );
  
  const { data: estatisticasComplementares, isLoading: loadingComplementares } = trpc.complementares.estatisticas.useQuery(
    { 
      mes: periodoSelecionado?.mes || 1, 
      ano: periodoSelecionado?.ano || 2025,
      lojaId: typeof lojaSelecionada === 'number' ? lojaSelecionada : undefined,
      lojasIds: lojasIdsParaFiltro
    },
    { enabled: !!periodoSelecionado && !!temDadosComplementares }
  );
  
  const { data: rankingComplementares, isLoading: loadingRankingComplementares } = trpc.complementares.ranking.useQuery(
    { 
      metrica: 'totalVendas', 
      mes: periodoSelecionado?.mes || 1, 
      ano: periodoSelecionado?.ano || 2025,
      limit: rankingLimit,
      lojasIds: rankingLojasIds
    },
    { enabled: !!periodoSelecionado && !!temDadosComplementares }
  );
  
  // Query NPS - dados de todas as lojas para o ano selecionado
  const anoNPS = periodoSelecionado?.ano || new Date().getFullYear();
  const { data: dadosNPS, isLoading: loadingNPS } = trpc.nps.getDadosTodasLojas.useQuery(
    { ano: anoNPS },
    { enabled: !!periodoSelecionado && user?.role === 'admin' }
  );
  
  // Query NPS para gestores (apenas as suas lojas)
  const lojasIdsGestor = useMemo(() => lojas?.map(l => l.id) || [], [lojas]);
  const { data: dadosNPSGestor } = trpc.nps.getDadosLojas.useQuery(
    { lojasIds: lojasIdsGestor, ano: anoNPS },
    { enabled: !!periodoSelecionado && user?.role === 'gestor' && lojasIdsGestor.length > 0 }
  );
  
  // Combinar dados NPS (admin vs gestor)
  const npsData = user?.role === 'admin' ? dadosNPS : dadosNPSGestor;
  
  // Mapear NPS por lojaId para acesso rápido
  const npsPorLoja = useMemo(() => {
    const map = new Map<number, any>();
    if (npsData) {
      npsData.forEach((item: any) => {
        const lojaId = item.nps?.lojaId || item.lojaId;
        map.set(lojaId, item.nps || item);
      });
    }
    return map;
  }, [npsData]);
  
  // Obter NPS do mês selecionado para uma loja
  const getNPSMes = (lojaId: number) => {
    const nps = npsPorLoja.get(lojaId);
    if (!nps) return null;
    const mesKeys = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'];
    if (!periodoSelecionado) return null;
    const key = mesKeys[periodoSelecionado.mes - 1];
    const val = nps[key];
    return val !== null && val !== undefined ? parseFloat(val) : null;
  };
  
  const getTaxaRespostaMes = (lojaId: number) => {
    const nps = npsPorLoja.get(lojaId);
    if (!nps) return null;
    const mesKeys = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'];
    if (!periodoSelecionado) return null;
    const key = mesKeys[periodoSelecionado.mes - 1];
    const val = nps[key];
    return val !== null && val !== undefined ? parseFloat(val) : null;
  };

  // Query de evolução individual
  const { data: evolucaoIndividual, isLoading: loadingEvolucaoIndividual } = trpc.resultados.evolucao.useQuery(
    { lojaId: typeof lojaSelecionada === 'number' ? lojaSelecionada : 0, mesesAtras: 6 },
    { enabled: typeof lojaSelecionada === 'number' }
  );
  
  // Query de evolução agregada (minhas lojas)
  const { data: evolucaoAgregada, isLoading: loadingEvolucaoAgregada } = trpc.resultados.evolucaoAgregada.useQuery(
    { gestorId: gestorData?.id || 0, mesesAtras: 6 },
    { enabled: lojaSelecionada === 'minhas' && !!gestorData?.id }
  );
  
  // Escolher qual evolução usar
  const evolucao = lojaSelecionada === 'minhas' ? evolucaoAgregada : evolucaoIndividual;
  const loadingEvolucao = lojaSelecionada === 'minhas' ? loadingEvolucaoAgregada : loadingEvolucaoIndividual;
  
  // Labels de métricas
  const { t, language } = useLanguage();
  
  const metricaLabels = {
    totalServicos: t('resultados.totalServicos') || 'Total de Serviços',
    taxaReparacao: t('resultados.taxaReparacao') || 'Taxa de Reparação',
    desvioPercentualMes: t('resultados.desvioVsObjetivo') || 'Desvio vs Objetivo (%)',
    servicosPorColaborador: t('resultados.servicosPorColaborador') || 'Serviços por Colaborador',
  };
  
  // Nomes dos meses
  const meses = language === 'pt' 
    ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (loadingPeriodos || loadingLojas) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!periodos || periodos.length === 0) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('resultados.semDadosDisponiveis') || 'Sem Dados Disponíveis'}</CardTitle>
              <CardDescription>
                {t('resultados.nenhumFicheiroCarregado') || 'Nenhum ficheiro Excel foi carregado ainda. O administrador precisa fazer upload dos resultados mensais.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('resultados.dashboardResultados') || 'Dashboard de Resultados'}</h1>
            <p className="text-muted-foreground">{t('resultados.analisePerformance') || 'Análise de performance e métricas das lojas'}</p>
          </div>
        </div>
        
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>{t('common.filtros') || 'Filtros'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Período Principal - Seleção Múltipla de Meses */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('resultados.periodoPrincipal') || 'Período Principal'}</label>
                <FiltroMesesCheckbox
                  mesesDisponiveis={periodos.map(p => ({ mes: p.mes, ano: p.ano }))}
                  mesesSelecionados={mesesSelecionados}
                  onMesesChange={setMesesSelecionados}
                  placeholder={t('resultados.selecionarMeses') || 'Selecionar meses'}
                />
                {modoMultiplosMeses && (
                  <p className="text-xs text-muted-foreground">
                    {`${t('resultados.dadosAgregados') || 'Dados agregados de'} ${mesesSelecionados.length} ${t('resultados.meses') || 'meses'}`}
                  </p>
                )}
              </div>
              
              {/* Período de Comparação 1 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('resultados.compararCom') || 'Comparar com (opcional)'}</label>
                <Select
                  value={periodoComparacao1 ? `${periodoComparacao1.mes}-${periodoComparacao1.ano}` : "nenhum"}
                  onValueChange={(value) => {
                    if (value === "nenhum") {
                      setPeriodoComparacao1(null);
                    } else {
                      const [mes, ano] = value.split('-').map(Number);
                      setPeriodoComparacao1({ mes, ano });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'pt' ? "Nenhum" : "None"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">{t('common.nenhum') || 'Nenhum'}</SelectItem>
                    {periodos.map((p) => (
                      <SelectItem key={`comp1-${p.mes}-${p.ano}`} value={`${p.mes}-${p.ano}`}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Período de Comparação 2 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('resultados.compararCom2') || 'Comparar com 2 (opcional)'}</label>
                <Select
                  value={periodoComparacao2 ? `${periodoComparacao2.mes}-${periodoComparacao2.ano}` : "nenhum"}
                  onValueChange={(value) => {
                    if (value === "nenhum") {
                      setPeriodoComparacao2(null);
                    } else {
                      const [mes, ano] = value.split('-').map(Number);
                      setPeriodoComparacao2({ mes, ano });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'pt' ? "Nenhum" : "None"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">{t('common.nenhum') || 'Nenhum'}</SelectItem>
                    {periodos.map((p) => (
                      <SelectItem key={`comp2-${p.mes}-${p.ano}`} value={`${p.mes}-${p.ano}`}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Loja (para gráfico de evolução) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('resultados.lojaEvolucao') || 'Loja (Evolução)'}</label>
              <Select
                value={lojaSelecionada?.toString() || 'todas'}
                onValueChange={(value) => {
                  if (value === 'todas') setLojaSelecionada('todas');
                  else if (value === 'minhas') setLojaSelecionada('minhas');
                  else setLojaSelecionada(Number(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('resultados.selecioneLoja') || 'Selecione uma loja'} />
                </SelectTrigger>
                <SelectContent>
                  {/* Minhas Lojas - aparece SEMPRE para gestores */}
                  {user?.role === 'gestor' && (
                    <SelectItem value="minhas">
                      <div className="flex items-center gap-2">
                        <span>{t('resultados.minhasLojas') || 'Minhas Lojas'}</span>
                        <Badge variant="secondary" className="text-xs">
                          {lojas?.length || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="todas">
                    <div className="flex items-center gap-2">
                      <span>{t('resultados.todasLojas') || 'Todas as Lojas'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {todasLojas?.length || estatisticas?.totalLojas || 0}
                      </Badge>
                    </div>
                  </SelectItem>
                  {lojas?.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Métrica para ranking */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('resultados.metricaRanking') || 'Métrica (Ranking)'}</label>
              <Select
                value={metricaRanking}
                onValueChange={(value: any) => setMetricaRanking(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(metricaLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Data de última atualização dos dados */}
        {periodoSelecionado && periodos && (() => {
          const periodoAtual = periodos.find(p => p.mes === periodoSelecionado.mes && p.ano === periodoSelecionado.ano);
          if (periodoAtual?.ultimaAtualizacao) {
            const dataAtualizacao = new Date(periodoAtual.ultimaAtualizacao);
            return (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('resultados.dadosAtualizadosEm') || 'Dados atualizados em'}:</span>
                <span className="font-medium">
                  {dataAtualizacao.toLocaleDateString('pt-PT', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            );
          }
          return null;
        })()}
        
        {/* Botão de Exportar (apenas quando "Apenas minhas lojas" selecionado) */}
        {lojaSelecionada === 'minhas' && gestorData && periodoSelecionado && (
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                if (!gestorData || !periodoSelecionado) return;
                
                setExportando(true);
                try {
                  const resultado = await exportarMutation.mutateAsync({
                    gestorId: gestorData.id,
                    gestorNome: gestorData.user.name || 'Gestor',
                    gestorEmail: gestorData.user.email || '',
                    mes: periodoSelecionado.mes,
                    ano: periodoSelecionado.ano,
                  });
                  
                  // Download do ficheiro
                  const blob = new Blob(
                    [Uint8Array.from(atob(resultado.fileData), c => c.charCodeAt(0))],
                    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                  );
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = resultado.fileName;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error('Erro ao exportar:', error);
                  alert('Erro ao gerar relatório. Tente novamente.');
                } finally {
                  setExportando(false);
                }
              }}
              disabled={exportando}
              className="gap-2"
            >
              {exportando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('resultados.aGerarRelatorio') || 'A gerar relatório...'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t('resultados.exportarRelatorioExcel') || 'Exportar Relatório Excel'}
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Seção de Comparação Temporal */}
        {(periodoComparacao1 || periodoComparacao2) && (
          <Card>
            <CardHeader>
              <CardTitle>{t('resultados.comparacaoTemporal') || 'Comparação Temporal'}</CardTitle>
              <CardDescription>{t('resultados.compareEstatisticas') || 'Compare estatísticas entre diferentes períodos'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Período Principal */}
                {estatisticas && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      {periodos.find(p => p.mes === periodoSelecionado?.mes && p.ano === periodoSelecionado?.ano)?.label || 'Período Principal'}
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">{t('resultados.totalLojas') || 'Total de Lojas'}</p>
                        <p className="text-2xl font-bold">{estatisticas.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">{t('resultados.totalServicos') || 'Total de Serviços'}</p>
                        <p className="text-2xl font-bold">{estatisticas.somaServicos?.toLocaleString() || 0}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('resultados.acimaDoObjetivo') || 'Acima do Objetivo'}</p>
                        <p className="text-2xl font-bold">{estatisticas.lojasAcimaObjetivo} / {estatisticas.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('resultados.taxaMediaReparacao') || 'Taxa Média Reparação'}</p>
                        <p className="text-2xl font-bold">
                          {estatisticas.mediaTaxaReparacao ? `${(estatisticas.mediaTaxaReparacao * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Período de Comparação 1 */}
                {periodoComparacao1 && estatisticasComp1 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      {periodos.find(p => p.mes === periodoComparacao1.mes && p.ano === periodoComparacao1.ano)?.label || 'Comparação 1'}
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">{t('resultados.totalLojas') || 'Total de Lojas'}</p>
                        <p className="text-2xl font-bold">{estatisticasComp1.totalLojas}</p>
                        {estatisticas && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp1.totalLojas > estatisticas.totalLojas ? (
                              <span className="text-green-600">+{estatisticasComp1.totalLojas - estatisticas.totalLojas}</span>
                            ) : estatisticasComp1.totalLojas < estatisticas.totalLojas ? (
                              <span className="text-red-600">{estatisticasComp1.totalLojas - estatisticas.totalLojas}</span>
                            ) : (
                              <span className="text-muted-foreground">{t('resultados.igual') || 'Igual'}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">{t('resultados.totalServicos') || 'Total de Serviços'}</p>
                        <p className="text-2xl font-bold">{estatisticasComp1.somaServicos?.toLocaleString() || 0}</p>
                        {estatisticas && estatisticas.somaServicos && estatisticasComp1.somaServicos && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp1.somaServicos > estatisticas.somaServicos ? (
                              <span className="text-green-600">+{(estatisticasComp1.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : estatisticasComp1.somaServicos < estatisticas.somaServicos ? (
                              <span className="text-red-600">{(estatisticasComp1.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground">{t('resultados.igual') || 'Igual'}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('resultados.acimaDoObjetivo') || 'Acima do Objetivo'}</p>
                        <p className="text-2xl font-bold">{estatisticasComp1.lojasAcimaObjetivo} / {estatisticasComp1.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('resultados.taxaMediaReparacao') || 'Taxa Média Reparação'}</p>
                        <p className="text-2xl font-bold">
                          {estatisticasComp1.mediaTaxaReparacao ? `${(estatisticasComp1.mediaTaxaReparacao * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Período de Comparação 2 */}
                {periodoComparacao2 && estatisticasComp2 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      {periodos.find(p => p.mes === periodoComparacao2.mes && p.ano === periodoComparacao2.ano)?.label || 'Comparação 2'}
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">{t('resultados.totalLojas') || 'Total de Lojas'}</p>
                        <p className="text-2xl font-bold">{estatisticasComp2.totalLojas}</p>
                        {estatisticas && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp2.totalLojas > estatisticas.totalLojas ? (
                              <span className="text-green-600">+{estatisticasComp2.totalLojas - estatisticas.totalLojas}</span>
                            ) : estatisticasComp2.totalLojas < estatisticas.totalLojas ? (
                              <span className="text-red-600">{estatisticasComp2.totalLojas - estatisticas.totalLojas}</span>
                            ) : (
                              <span className="text-muted-foreground">{t('resultados.igual') || 'Igual'}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">{t('resultados.totalServicos') || 'Total de Serviços'}</p>
                        <p className="text-2xl font-bold">{estatisticasComp2.somaServicos?.toLocaleString() || 0}</p>
                        {estatisticas && estatisticas.somaServicos && estatisticasComp2.somaServicos && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp2.somaServicos > estatisticas.somaServicos ? (
                              <span className="text-green-600">+{(estatisticasComp2.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : estatisticasComp2.somaServicos < estatisticas.somaServicos ? (
                              <span className="text-red-600">{(estatisticasComp2.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground">{t('resultados.igual') || 'Igual'}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('resultados.acimaDoObjetivo') || 'Acima do Objetivo'}</p>
                        <p className="text-2xl font-bold">{estatisticasComp2.lojasAcimaObjetivo} / {estatisticasComp2.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('resultados.taxaMediaReparacao') || 'Taxa Média Reparação'}</p>
                        <p className="text-2xl font-bold">
                          {estatisticasComp2.mediaTaxaReparacao ? `${(estatisticasComp2.mediaTaxaReparacao * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Cards de Estatísticas (quando não há comparação) */}
        {!periodoComparacao1 && !periodoComparacao2 && loadingEstatisticas ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !periodoComparacao1 && !periodoComparacao2 && estatisticas ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Lojas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('resultados.totalLojas') || 'Total de Lojas'}</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.totalLojas}</div>
                <p className="text-xs text-muted-foreground">
                  {t('resultados.comDadosNoPeriodo') || 'Com dados no período'}
                </p>
              </CardContent>
            </Card>
            
            {/* Total de Serviços */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('resultados.totalServicos') || 'Total de Serviços'}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {/* Usar totais globais quando "todas" selecionado, senão usar soma das lojas */}
                  {(lojaSelecionada === 'todas' || lojaSelecionada === null) && totaisGlobais?.totalServicos
                    ? totaisGlobais.totalServicos.toLocaleString()
                    : estatisticas.somaServicos?.toLocaleString() || 0
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Objetivo: {(lojaSelecionada === 'todas' || lojaSelecionada === null) && totaisGlobais?.totalObjetivo
                    ? totaisGlobais.totalObjetivo.toLocaleString()
                    : estatisticas.somaObjetivos?.toLocaleString() || 0
                  }
                </p>
                {/* Média mensal quando múltiplos meses selecionados */}
                {modoMultiplosMeses && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    {t('resultados.mediaMensal') || 'Média mensal'}: {(() => {
                      const total = (lojaSelecionada === 'todas' || lojaSelecionada === null) && totaisGlobais?.totalServicos
                        ? totaisGlobais.totalServicos
                        : estatisticas.somaServicos || 0;
                      const media = Math.round(total / mesesSelecionados.length);
                      return media.toLocaleString();
                    })()}
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Lojas Acima do Objetivo */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('resultados.acimaDoObjetivo') || 'Acima do Objetivo'}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {estatisticas.lojasAcimaObjetivo} / {estatisticas.totalLojas}
                </div>
                <p className="text-xs text-muted-foreground">
                  {estatisticas.totalLojas > 0 
                    ? `${Math.round((estatisticas.lojasAcimaObjetivo / estatisticas.totalLojas) * 100)}%`
                    : '0%'
                  } {t('resultados.dasLojas') || 'das lojas'}
                </p>
              </CardContent>
            </Card>
            
            {/* Taxa Média de Reparação */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('resultados.taxaMediaReparacao') || 'Taxa Média Reparação'}</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {/* Usar taxa média das lojas */}
                  {estatisticas.mediaTaxaReparacao 
                    ? `${(estatisticas.mediaTaxaReparacao * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Objetivo: 30%
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
        
        {/* Gráfico de Evolução Mensal */}
        {lojaSelecionada && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                {t('resultados.evolucaoMensal') || 'Evolução Mensal'} - {lojaSelecionada === 'minhas' ? t('resultados.minhasLojasAgregado') || 'Minhas Lojas (Agregado)' : lojas?.find(l => l.id === lojaSelecionada)?.nome}
              </CardTitle>
              <CardDescription>{t('resultados.ultimos6Meses') || 'Últimos 6 meses'}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEvolucao ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : evolucao && evolucao.length > 0 ? (
                <div className="space-y-4">
                  {/* Gráfico de progresso em direção ao objetivo */}
                  <div className="grid grid-cols-1 gap-2">
                    {evolucao.map((item, idx) => {
                      // desvioPercentualMes: valor decimal (ex: -0.10 = -10%, 0.038 = +3.8%)
                      const desvioDecimal = item.desvioPercentualMes || 0;
                      const desvioPercent = desvioDecimal * 100; // Converter para percentagem
                      const atingiuObjetivo = desvioDecimal >= 0;
                      
                      // Calcular progresso (0-100%):
                      // - Se atingiu objetivo (desvio >= 0): progresso = 100%
                      // - Se desvio = -10%: progresso = 90%
                      // - Se desvio = -50%: progresso = 50%
                      // - Se desvio = -100%: progresso = 0%
                      const progresso = atingiuObjetivo ? 100 : Math.max(0, 100 + desvioPercent);
                      
                      // Função para calcular cor baseada no desvio (NÃO no progresso da barra)
                      // Verde: atingiu objetivo (desvio >= 0)
                      // Amarelo: perto do objetivo (desvio entre -15% e 0%)
                      // Laranja: moderado (desvio entre -30% e -15%)
                      // Vermelho: longe do objetivo (desvio < -30%)
                      const getColorByDesvio = (desvio: number): string => {
                        if (desvio >= 0) {
                          // Verde - objetivo atingido
                          return 'rgb(34, 197, 94)';
                        } else if (desvio >= -0.15) {
                          // Amarelo - perto do objetivo (-15% a 0%)
                          // Gradiente de verde para amarelo
                          const ratio = (desvio + 0.15) / 0.15; // 0 a 1
                          const r = Math.round(234 + (34 - 234) * ratio);
                          const g = Math.round(179 + (197 - 179) * ratio);
                          const b = Math.round(8 + (94 - 8) * ratio);
                          return `rgb(${r}, ${g}, ${b})`;
                        } else if (desvio >= -0.30) {
                          // Laranja - moderado (-30% a -15%)
                          const ratio = (desvio + 0.30) / 0.15; // 0 a 1
                          const r = Math.round(249 + (234 - 249) * ratio);
                          const g = Math.round(115 + (179 - 115) * ratio);
                          const b = Math.round(22 + (8 - 22) * ratio);
                          return `rgb(${r}, ${g}, ${b})`;
                        } else {
                          // Vermelho - longe do objetivo (< -30%)
                          const ratio = Math.min(1, (desvio + 1) / 0.70); // 0 a 1
                          const r = Math.round(239 + (249 - 239) * ratio);
                          const g = Math.round(68 + (115 - 68) * ratio);
                          const b = Math.round(68 + (22 - 68) * ratio);
                          return `rgb(${r}, ${g}, ${b})`;
                        }
                      };
                      
                      // Cor do texto baseada no desvio
                      const getTextColor = (desvio: number): string => {
                        if (desvio >= 0) return 'text-green-600';
                        if (desvio >= -0.15) return 'text-yellow-600';
                        if (desvio >= -0.30) return 'text-orange-600';
                        return 'text-red-600';
                      };
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{meses[item.mes - 1]} {item.ano}</span>
                            <span className={getTextColor(desvioDecimal)}>
                              {item.totalServicos || 0} {t('resultados.servicos') || 'serviços'} ({desvioDecimal >= 0 ? '+' : ''}{desvioPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${progresso}%`,
                                backgroundColor: getColorByDesvio(desvioDecimal)
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('resultados.semDadosEvolucao') || 'Sem dados de evolução para esta loja'}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Ranking de Lojas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {lojaSelecionada === 'minhas' 
                ? `Minhas Lojas (${ranking?.length || 0}) - ${metricaLabels[metricaRanking]}`
                : typeof lojaSelecionada === 'number'
                  ? `Loja Selecionada - ${metricaLabels[metricaRanking]}`
                  : `Top 10 Lojas - ${metricaLabels[metricaRanking]}`
              }
            </CardTitle>
            <CardDescription>
              {periodoSelecionado && periodos.find(p => p.mes === periodoSelecionado.mes && p.ano === periodoSelecionado.ano)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRanking ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : ranking && ranking.length > 0 ? (
              <div className="space-y-3">
                {/* Valor médio em destaque */}
                {(() => {
                  const totalLojas = ranking.length;
                  if (totalLojas === 0) return null;
                  
                  // Função auxiliar para calcular média de um ranking
                  const calcularMedia = (data: typeof ranking) => {
                    const n = data.length;
                    if (n === 0) return { mediaValor: 0, mediaServicos: 0, mediaObjetivo: 0 };
                    let mediaValor = 0;
                    if (metricaRanking === 'totalServicos') {
                      mediaValor = data.reduce((acc, r) => acc + Number(r.totalServicos || 0), 0) / n;
                    } else if (metricaRanking === 'taxaReparacao') {
                      mediaValor = (data.reduce((acc, r) => acc + Number(r.taxaReparacao || 0), 0) / n) * 100;
                    } else if (metricaRanking === 'desvioPercentualMes') {
                      mediaValor = (data.reduce((acc, r) => acc + Number(r.desvioPercentualMes || 0), 0) / n) * 100;
                    } else {
                      mediaValor = data.reduce((acc, r) => acc + Number(r.valor || 0), 0) / n;
                    }
                    const mediaServicos = data.reduce((acc, r) => acc + Number(r.totalServicos || 0), 0) / n;
                    const mediaObjetivo = data.reduce((acc, r) => acc + Number(r.objetivoMensal || 0), 0) / n;
                    return { mediaValor, mediaServicos, mediaObjetivo };
                  };
                  
                  const minhas = calcularMedia(ranking);
                  const nacional = rankingNacional && rankingNacional.length > 0 ? calcularMedia(rankingNacional) : null;
                  
                  let mediaLabel = '';
                  let mediaSuffix = '';
                  if (metricaRanking === 'totalServicos') { mediaLabel = 'Média Serviços'; mediaSuffix = ''; }
                  else if (metricaRanking === 'taxaReparacao') { mediaLabel = 'Média Taxa Reparação'; mediaSuffix = '%'; }
                  else if (metricaRanking === 'desvioPercentualMes') { mediaLabel = 'Média Desvio vs Objetivo'; mediaSuffix = '%'; }
                  else { mediaLabel = 'Média Serv./Colab.'; mediaSuffix = ''; }
                  
                  const formatVal = (v: number) => mediaSuffix === '%' ? v.toFixed(1) : v.toFixed(metricaRanking === 'servicosPorColaborador' ? 2 : 0);
                  
                  // Calcular diferença percentual entre minhas lojas e nacional
                  const diffPercent = nacional && nacional.mediaValor !== 0 
                    ? ((minhas.mediaValor - nacional.mediaValor) / Math.abs(nacional.mediaValor)) * 100 
                    : null;
                  
                  return (
                    <div className="space-y-2 mb-2">
                      {/* Barra principal - Média das lojas filtradas */}
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {mostrarComparacaoNacional ? `${mediaLabel} (${isMinhasLojas ? 'Minhas Lojas' : 'Loja Selecionada'})` : mediaLabel}
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {formatVal(minhas.mediaValor)}{mediaSuffix}
                          </div>
                          <div className="text-xs text-muted-foreground">{totalLojas} lojas</div>
                        </div>
                        <div className="flex gap-6">
                          {metricaRanking !== 'totalServicos' && (
                            <div className="text-center">
                              <div className="text-xs font-medium text-muted-foreground">Méd. Serviços</div>
                              <div className="text-lg font-bold">{minhas.mediaServicos.toFixed(0)}</div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-xs font-medium text-muted-foreground">Méd. Objetivo</div>
                            <div className="text-lg font-bold">{minhas.mediaObjetivo.toFixed(0)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de comparação nacional - só aparece quando "Minhas Lojas" está activo */}
                      {mostrarComparacaoNacional && nacional && (
                        <div className="bg-gradient-to-r from-blue-500/10 to-blue-400/5 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Média Nacional
                            </div>
                            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                              {formatVal(nacional.mediaValor)}{mediaSuffix}
                            </div>
                            <div className="text-xs text-blue-500/70 dark:text-blue-400/70">{rankingNacional?.length || 0} lojas</div>
                          </div>
                          <div className="flex gap-6 items-center">
                            {metricaRanking !== 'totalServicos' && (
                              <div className="text-center">
                                <div className="text-xs font-medium text-blue-500/70 dark:text-blue-400/70">Méd. Serviços</div>
                                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{nacional.mediaServicos.toFixed(0)}</div>
                              </div>
                            )}
                            <div className="text-center">
                              <div className="text-xs font-medium text-blue-500/70 dark:text-blue-400/70">Méd. Objetivo</div>
                              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{nacional.mediaObjetivo.toFixed(0)}</div>
                            </div>
                            {/* Badge de diferença */}
                            {diffPercent !== null && (
                              <div className={`text-center px-3 py-1 rounded-full text-xs font-bold ${
                                diffPercent >= 0 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                <div className="flex items-center gap-1">
                                  {diffPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                                </div>
                                <div className="text-[10px] opacity-70">vs Nacional</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Cabeçalhos de coluna - dinâmicos conforme métrica */}
                <div className="flex items-center gap-2 md:gap-3 pb-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="w-6 md:w-8 text-center">#</div>
                  <div className="flex-1 min-w-0">Loja</div>
                  <div className="text-right min-w-[40px] md:min-w-[60px]">
                    {metricaRanking === 'totalServicos' ? 'Serv.' :
                     metricaRanking === 'taxaReparacao' ? 'Taxa' :
                     metricaRanking === 'desvioPercentualMes' ? 'Desv.' :
                     'S/C'}
                  </div>
                  {metricaRanking !== 'totalServicos' && (
                    <div className="text-right min-w-[40px] md:min-w-[60px] hidden sm:block">Serviços</div>
                  )}
                  <div className="text-right min-w-[40px] md:min-w-[60px]">Obj.</div>
                  {npsPorLoja.size > 0 && <div className="text-right min-w-[55px] md:min-w-[85px] border-l pl-2 md:pl-3">NPS</div>}
                </div>
                {ranking.map((item, idx) => {
                  let valorDisplay = '';
                  if (metricaRanking === 'totalServicos') {
                    valorDisplay = item.totalServicos?.toString() || '0';
                  } else if (metricaRanking === 'taxaReparacao') {
                    valorDisplay = item.taxaReparacao ? `${(item.taxaReparacao * 100).toFixed(1)}%` : 'N/A';
                  } else if (metricaRanking === 'desvioPercentualMes') {
                    valorDisplay = item.desvioPercentualMes ? `${(item.desvioPercentualMes * 100).toFixed(1)}%` : 'N/A';
                  } else {
                    valorDisplay = item.valor?.toFixed(2) || 'N/A';
                  }
                  
                  return (
                    <div key={idx} className="flex items-center gap-2 md:gap-3">
                      <div className={`
                        flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full font-bold text-xs md:text-sm flex-shrink-0
                        ${idx === 0 ? 'bg-yellow-500 text-white' : ''}
                        ${idx === 1 ? 'bg-gray-400 text-white' : ''}
                        ${idx === 2 ? 'bg-orange-600 text-white' : ''}
                        ${idx > 2 ? 'bg-secondary text-foreground' : ''}
                      `}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm md:text-base truncate">{item.lojaNome}</div>
                        <div className="text-xs md:text-sm text-muted-foreground truncate">{item.zona}</div>
                      </div>
                      <div className="text-right min-w-[40px] md:min-w-[60px]">
                        <div className="font-bold text-sm md:text-base">{valorDisplay}</div>
                      </div>
                      {metricaRanking !== 'totalServicos' && (
                        <div className="text-right min-w-[40px] md:min-w-[60px] hidden sm:block">
                          <div className="font-bold text-muted-foreground">{item.totalServicos || '-'}</div>
                        </div>
                      )}
                      <div className="text-right min-w-[40px] md:min-w-[60px]">
                        <div className="font-bold text-sm md:text-base text-muted-foreground">{item.objetivoMensal || '-'}</div>
                      </div>
                      {/* Coluna NPS com elegibilidade prémio */}
                      {npsPorLoja.size > 0 && (() => {
                        const npsVal = getNPSMes(item.lojaId);
                        const taxaVal = getTaxaRespostaMes(item.lojaId);
                        const elegivelPremio = (npsVal !== null && npsVal >= 0.8) || (taxaVal !== null && taxaVal >= 0.075);
                        const npsAbaixo = npsVal !== null && npsVal < 0.8;
                        const taxaAbaixo = taxaVal !== null && taxaVal < 0.075;
                        return (
                          <div className="text-right min-w-[55px] md:min-w-[85px] border-l pl-2 md:pl-3">
                            <div className={`font-bold text-xs md:text-sm ${
                              npsVal !== null 
                                ? npsVal >= 0.8 ? 'text-green-600' 
                                  : npsVal >= 0.5 ? 'text-yellow-600' 
                                  : 'text-red-600'
                                : 'text-muted-foreground'
                            }`}>
                              {npsVal !== null ? `${(npsVal * 100).toFixed(0)}%` : '-'}
                              {npsVal !== null && elegivelPremio && <span className="ml-1">✓</span>}
                            </div>
                            <div className={`text-xs ${taxaAbaixo ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {taxaVal !== null ? `${(taxaVal * 100).toFixed(1)}% resp.` : ''}
                            </div>
                            {npsVal !== null && !elegivelPremio && (npsAbaixo || taxaAbaixo) && (
                              <div className="text-[10px] text-red-500 font-medium">s/ prémio</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('resultados.semDadosRanking') || 'Sem dados de ranking para este período'}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Ranking NPS - Elegibilidade para Prémio */}
        {npsPorLoja.size > 0 && periodoSelecionado && (() => {
          // Construir ranking NPS com dados de todas as lojas
          const npsRankingData = (ranking || []).map((item: any) => {
            const npsVal = getNPSMes(item.lojaId);
            const taxaVal = getTaxaRespostaMes(item.lojaId);
            // NPS Anual
            const npsLoja = npsPorLoja.get(item.lojaId);
            const npsAnualVal = npsLoja?.npsAnoTotal ? parseFloat(npsLoja.npsAnoTotal) : null;
            return {
              lojaId: item.lojaId,
              lojaNome: item.lojaNome,
              zona: item.zona,
              nps: npsVal,
              taxaResposta: taxaVal,
              npsAnual: npsAnualVal,
              elegivelPremio: (npsVal !== null && npsVal >= 0.8) || (taxaVal !== null && taxaVal >= 0.075),
              motivoInelegivel: (
                (npsVal === null || npsVal < 0.8) && (taxaVal === null || taxaVal < 0.075)
                  ? 'NPS < 80% e Taxa < 7,5% (não cumpre nenhum critério)'
                  : null
              ),
            };
          }).filter((item: any) => item.nps !== null)
           .sort((a: any, b: any) => {
             // Elegíveis primeiro, depois inelegíveis
             if (a.elegivelPremio && !b.elegivelPremio) return -1;
             if (!a.elegivelPremio && b.elegivelPremio) return 1;
             // Dentro de cada grupo: NPS Mês desc (arredondar a 4 casas para evitar problemas de float)
             const aNpsMes = Math.round((a.nps ?? 0) * 10000);
             const bNpsMes = Math.round((b.nps ?? 0) * 10000);
             if (bNpsMes !== aNpsMes) return bNpsMes - aNpsMes;
             // Desempate 1: NPS Anual desc (quem tem valor > quem não tem)
             const aNpsAnual = Math.round((a.npsAnual ?? -1) * 10000);
             const bNpsAnual = Math.round((b.npsAnual ?? -1) * 10000);
             if (bNpsAnual !== aNpsAnual) return bNpsAnual - aNpsAnual;
             // Desempate 2: Taxa de Resposta desc
             const aTaxa = Math.round((a.taxaResposta ?? 0) * 10000);
             const bTaxa = Math.round((b.taxaResposta ?? 0) * 10000);
             return bTaxa - aTaxa;
           });
          
          const totalElegivel = npsRankingData.filter((i: any) => i.elegivelPremio).length;
          const totalInelegivel = npsRankingData.filter((i: any) => !i.elegivelPremio).length;
          
          if (npsRankingData.length === 0) return null;
          
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SmilePlus className="h-5 w-5 text-primary" />
                  Ranking NPS - Elegibilidade para Prémio
                </CardTitle>
                <CardDescription className="space-y-1">
                  <span>{periodoSelecionado && periodos.find((p: any) => p.mes === periodoSelecionado.mes && p.ano === periodoSelecionado.ano)?.label}</span>
                  <span className="block text-xs">
          Regras: NPS {'>'}= 80% <strong>OU</strong> Taxa de Resposta {'>'}= 7,5% (basta um critério) para ter direito a prémio
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{totalElegivel}</div>
                    <div className="text-xs text-muted-foreground">Elegíveis</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{totalInelegivel}</div>
                    <div className="text-xs text-muted-foreground">Sem Prémio</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{npsRankingData.length > 0 ? ((totalElegivel / npsRankingData.length) * 100).toFixed(0) : 0}%</div>
                    <div className="text-xs text-muted-foreground">Taxa Elegibilidade</div>
                  </div>
                </div>
                
                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 md:py-3 px-1 md:px-2 w-8 md:w-10">#</th>
                        <th className="text-left py-2 md:py-3 px-1 md:px-2">Loja</th>
                        <th className="text-left py-2 md:py-3 px-1 md:px-2 hidden md:table-cell">Zona</th>
                        <th className="text-right py-2 md:py-3 px-1 md:px-2">NPS</th>
                        <th className="text-right py-2 md:py-3 px-1 md:px-2">Taxa</th>
                        <th className="text-right py-2 md:py-3 px-1 md:px-2">Anual</th>
                        <th className="text-center py-2 md:py-3 px-1 md:px-2">Prémio</th>
                        <th className="text-left py-2 md:py-3 px-1 md:px-2 hidden sm:table-cell">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {npsRankingData.map((item: any, idx: number) => (
                        <tr key={item.lojaId} className={`border-b hover:bg-muted/50 ${!item.elegivelPremio ? 'opacity-70' : ''}`}>
                          <td className="py-1.5 md:py-2 px-1 md:px-2">
                            <div className={`
                              flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full font-bold text-[10px] md:text-xs
                              ${item.elegivelPremio && idx === 0 ? 'bg-yellow-500 text-white' : ''}
                              ${item.elegivelPremio && idx === 1 ? 'bg-gray-400 text-white' : ''}
                              ${item.elegivelPremio && idx === 2 ? 'bg-orange-600 text-white' : ''}
                              ${!item.elegivelPremio || idx > 2 ? 'bg-secondary text-foreground' : ''}
                            `}>
                              {idx + 1}
                            </div>
                          </td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2">
                            <div className="font-medium text-xs md:text-sm">{item.lojaNome}</div>
                            <div className="text-[10px] text-muted-foreground md:hidden">{item.zona}</div>
                          </td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2 text-muted-foreground text-xs hidden md:table-cell">{item.zona}</td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2 text-right">
                            <span className={`font-bold ${
                              item.nps >= 0.8 ? 'text-green-600' :
                              item.nps >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(item.nps * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2 text-right">
                            <span className={`font-medium text-xs md:text-sm ${
                              item.taxaResposta !== null && item.taxaResposta < 0.075 ? 'text-red-500' : ''
                            }`}>
                              {item.taxaResposta !== null ? `${(item.taxaResposta * 100).toFixed(1)}%` : '-'}
                            </span>
                          </td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2 text-right">
                            <span className="font-medium text-xs md:text-sm text-muted-foreground">
                              {item.npsAnual !== null ? `${(item.npsAnual * 100).toFixed(1)}%` : '-'}
                            </span>
                          </td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2 text-center">
                            {item.elegivelPremio ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 text-[10px] md:text-xs px-1 md:px-2">
                                <span className="hidden sm:inline">✓ Elegível</span>
                                <span className="sm:hidden">✓</span>
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <span className="hidden sm:inline">Sem Prémio</span>
                                <span className="sm:hidden">✗</span>
                              </Badge>
                            )}
                          </td>
                          <td className="py-1.5 md:py-2 px-1 md:px-2 text-xs text-red-500 hidden sm:table-cell">
                            {item.motivoInelegivel || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Legenda */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    NPS ≥ 80% OU Taxa ≥ 7,5% = Elegível (basta 1)
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    NPS {'<'} 80% E Taxa {'<'} 7,5% = Sem prémio
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
        
        {/* Vendas Complementares */}
        {temDadosComplementares && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                {t('resultados.vendasComplementares') || 'Vendas Complementares'}
              </CardTitle>
              <CardDescription>
                {periodoSelecionado && periodos.find(p => p.mes === periodoSelecionado.mes && p.ano === periodoSelecionado.ano)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingComplementares ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : estatisticasComplementares ? (
                <div className="space-y-6">
                  {/* Card de Destaque - {t('resultados.servicosEscovas') || '% Serviços de Escovas'} ({t('resultados.premioTrimestral') || 'Prémio Trimestral'}) */}
                  <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950 dark:to-yellow-950 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t('resultados.servicosEscovas') || '% Serviços de Escovas'}</span>
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-300">{t('resultados.premioTrimestral') || 'Prémio Trimestral'}</Badge>
                        </div>
                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                          {(estatisticasComplementares.mediaEscovasPercent * 100)?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Objetivo nacional: 10% (sem mínimo obrigatório)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">{t('resultados.lojasAcimaObjetivo') || 'Lojas acima do objetivo'}</div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                          {estatisticasComplementares.lojasComEscovas || 0}/{estatisticasComplementares.totalLojas || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resumo Geral */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">{t('resultados.totalVendas') || 'Total Vendas'}</div>
                      <div className="text-2xl font-bold text-green-600">
                        €{estatisticasComplementares.somaVendas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('resultados.exclPeliculas') || 'excl. películas'}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">{t('resultados.escovas') || 'Escovas'}</div>
                      <div className="text-2xl font-bold text-blue-600">
                        €{estatisticasComplementares.somaEscovas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                      <div className="text-xs text-muted-foreground">{estatisticasComplementares.totalEscovasQtd || 0} unidades</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">{t('resultados.peliculas') || 'Películas'}</div>
                      <div className="text-2xl font-bold text-purple-600">
                        €{estatisticasComplementares.somaPeliculas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">{t('resultados.lojasComVendas') || 'Lojas com Vendas'}</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {estatisticasComplementares.lojasComVendas || 0}/{estatisticasComplementares.totalLojas || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {estatisticasComplementares.percentLojasComEscovas?.toFixed(0) || 0}% {t('resultados.venderamEscovas') || 'venderam escovas'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Breakdown por Categoria */}
                  <div>
                    <h4 className="font-medium mb-3">{t('resultados.breakdownCategoria') || 'Breakdown por Categoria'}</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Escovas', valor: estatisticasComplementares.somaEscovas, total: estatisticasComplementares.somaVendas, cor: 'bg-blue-500' },
                        { label: 'Polimento Faróis', valor: estatisticasComplementares.somaPolimento, total: estatisticasComplementares.somaVendas, cor: 'bg-yellow-500' },
                        { label: 'Tratamento Carroçarias', valor: estatisticasComplementares.somaTratamento, total: estatisticasComplementares.somaVendas, cor: 'bg-red-500' },
                        { label: 'Outros', valor: estatisticasComplementares.somaOutros, total: estatisticasComplementares.somaVendas, cor: 'bg-gray-500' },
                        { label: 'Lavagens ECO', valor: estatisticasComplementares.somaLavagens, total: estatisticasComplementares.somaVendas, cor: 'bg-green-500' },
                      ].map((cat, idx) => {
                        const percent = cat.total && cat.total > 0 ? ((cat.valor || 0) / cat.total) * 100 : 0;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-32 text-sm">{cat.label}</div>
                            <div className="flex-1 bg-secondary rounded-full h-4 overflow-hidden">
                              <div 
                                className={`h-full ${cat.cor} transition-all`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="w-24 text-right text-sm">
                              €{(cat.valor || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="w-16 text-right text-sm text-muted-foreground">
                              {percent.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Top 5 Lojas */}
                  {rankingComplementares && rankingComplementares.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">{t('resultados.top5LojasVendas') || 'Top 5 Lojas - Vendas Complementares'}</h4>
                      <div className="space-y-2">
                        {rankingComplementares.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className={`
                              flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs
                              ${idx === 0 ? 'bg-yellow-500 text-white' : ''}
                              ${idx === 1 ? 'bg-gray-400 text-white' : ''}
                              ${idx === 2 ? 'bg-orange-600 text-white' : ''}
                              ${idx > 2 ? 'bg-secondary text-foreground' : ''}
                            `}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 text-sm">{item.lojaNome}</div>
                            <div className="w-20 text-center">
                              <Badge 
                                variant={item.escovasPercent > 0 ? "default" : "outline"}
                                className={item.escovasPercent >= 0.10 ? "bg-green-500" : item.escovasPercent > 0 ? "bg-amber-500" : ""}
                              >
                                {(item.escovasPercent * 100)?.toFixed(1) || '0.0'}%
                              </Badge>
                            </div>
                            <div className="text-right w-28">
                              <div className="font-medium">€{item.totalVendas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</div>
                              <div className="text-xs text-muted-foreground">{item.escovasQtd || 0} escovas</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('resultados.semDadosVendasComplementares') || 'Sem dados de vendas complementares para este período'}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Resultados por Zona */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('resultados.resultadosPorZona') || 'Resultados por Zona Geográfica'}
            </CardTitle>
            <CardDescription>
              {periodoSelecionado && periodos.find(p => p.mes === periodoSelecionado.mes && p.ano === periodoSelecionado.ano)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingZona ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : porZona && porZona.length > 0 ? (
              <div className="space-y-4">
                {porZona.map((zona, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{zona.zona || 'Sem Zona'}</h3>
                      <span className="text-sm text-muted-foreground">{zona.totalLojas} {t('resultados.lojas') || 'lojas'}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">{t('resultados.totalServicos') || 'Total Serviços'}</div>
                        <div className="font-medium">{zona.somaServicos?.toLocaleString() || 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('resultados.desvioMedio') || 'Desvio Médio'}</div>
                        <div className={`font-medium ${zona.mediaDesvioPercentual && zona.mediaDesvioPercentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {zona.mediaDesvioPercentual ? `${(zona.mediaDesvioPercentual * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('resultados.taxaReparacao') || 'Taxa Reparação'}</div>
                        <div className="font-medium">
                          {zona.mediaTaxaReparacao ? `${(zona.mediaTaxaReparacao * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('resultados.totalReparacoes') || 'Total Reparações'}</div>
                        <div className="font-medium">{zona.somaReparacoes || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('resultados.semDadosPorZona') || 'Sem dados por zona para este período'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Evolução Histórica */}
        <GraficoEvolucaoHistorica />

        {/* Alertas de Performance (apenas para admin) */}
        {user?.role === 'admin' && periodos && periodos.length > 0 && (
          <AlertasPerformance periodos={periodos} />
        )}
      </div>
      
      {/* Chatbot de IA para consultas */}
      <ResultadosChatbot />
    </DashboardLayout>
  );
}