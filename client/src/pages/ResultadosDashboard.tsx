import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Target, Award, BarChart3, LineChart, MapPin, Download, ShoppingBag, Package } from 'lucide-react';
import { useAuth } from '../_core/hooks/useAuth';
import { toast } from 'sonner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { AlertasPerformance } from '../components/AlertasPerformance';
import { GraficoEvolucaoHistorica } from '../components/GraficoEvolucaoHistorica';
import FiltroMesesCheckbox, { type MesSelecionado, gerarLabelMeses } from '../components/FiltroMesesCheckbox';

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


export function ResultadosDashboard() {
  
  const { user } = useAuth();
  
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
    // Se "Minhas Lojas" selecionado, buscar todas as lojas do gestor (até 100)
    if (lojaSelecionada === 'minhas' && lojas) {
      return Math.max(lojas.length, 10);
    }
    // Se loja individual, buscar apenas 1
    if (typeof lojaSelecionada === 'number') {
      return 10;
    }
    // Caso contrário, top 10
    return 10;
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
  const metricaLabels = {
    totalServicos: 'Total de Serviços',
    taxaReparacao: 'Taxa de Reparação',
    desvioPercentualMes: 'Desvio vs Objetivo (%)',
    servicosPorColaborador: 'Serviços por Colaborador',
  };
  
  // Nomes dos meses
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  
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
              <CardTitle>Sem Dados Disponíveis</CardTitle>
              <CardDescription>
                Nenhum ficheiro Excel foi carregado ainda. O administrador precisa fazer upload dos resultados mensais.
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
            <h1 className="text-3xl font-bold">Dashboard de Resultados</h1>
            <p className="text-muted-foreground">Análise de performance e métricas das lojas</p>
          </div>
        </div>
        
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Período Principal - Seleção Múltipla de Meses */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Período Principal</label>
                <FiltroMesesCheckbox
                  mesesDisponiveis={periodos.map(p => ({ mes: p.mes, ano: p.ano }))}
                  mesesSelecionados={mesesSelecionados}
                  onMesesChange={setMesesSelecionados}
                  placeholder="Selecionar meses"
                />
                {modoMultiplosMeses && (
                  <p className="text-xs text-muted-foreground">
                    Dados agregados de {mesesSelecionados.length} meses
                  </p>
                )}
              </div>
              
              {/* Período de Comparação 1 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Comparar com (opcional)</label>
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
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
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
                <label className="text-sm font-medium">Comparar com 2 (opcional)</label>
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
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
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
              <label className="text-sm font-medium">Loja (Evolução)</label>
              <Select
                value={lojaSelecionada?.toString() || 'todas'}
                onValueChange={(value) => {
                  if (value === 'todas') setLojaSelecionada('todas');
                  else if (value === 'minhas') setLojaSelecionada('minhas');
                  else setLojaSelecionada(Number(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {/* Minhas Lojas - aparece SEMPRE para gestores */}
                  {user?.role === 'gestor' && (
                    <SelectItem value="minhas">
                      <div className="flex items-center gap-2">
                        <span>Minhas Lojas</span>
                        <Badge variant="secondary" className="text-xs">
                          {lojas?.length || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="todas">
                    <div className="flex items-center gap-2">
                      <span>Todas as Lojas</span>
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
              <label className="text-sm font-medium">Métrica (Ranking)</label>
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
                  A gerar relatório...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exportar Relatório Excel
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Seção de Comparação Temporal */}
        {(periodoComparacao1 || periodoComparacao2) && (
          <Card>
            <CardHeader>
              <CardTitle>Comparação Temporal</CardTitle>
              <CardDescription>Compare estatísticas entre diferentes períodos</CardDescription>
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
                        <p className="text-xs text-muted-foreground">Total de Lojas</p>
                        <p className="text-2xl font-bold">{estatisticas.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">Total de Serviços</p>
                        <p className="text-2xl font-bold">{estatisticas.somaServicos?.toLocaleString() || 0}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Acima do Objetivo</p>
                        <p className="text-2xl font-bold">{estatisticas.lojasAcimaObjetivo} / {estatisticas.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Taxa Média Reparação</p>
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
                        <p className="text-xs text-muted-foreground">Total de Lojas</p>
                        <p className="text-2xl font-bold">{estatisticasComp1.totalLojas}</p>
                        {estatisticas && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp1.totalLojas > estatisticas.totalLojas ? (
                              <span className="text-green-600">+{estatisticasComp1.totalLojas - estatisticas.totalLojas}</span>
                            ) : estatisticasComp1.totalLojas < estatisticas.totalLojas ? (
                              <span className="text-red-600">{estatisticasComp1.totalLojas - estatisticas.totalLojas}</span>
                            ) : (
                              <span className="text-muted-foreground">Igual</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">Total de Serviços</p>
                        <p className="text-2xl font-bold">{estatisticasComp1.somaServicos?.toLocaleString() || 0}</p>
                        {estatisticas && estatisticas.somaServicos && estatisticasComp1.somaServicos && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp1.somaServicos > estatisticas.somaServicos ? (
                              <span className="text-green-600">+{(estatisticasComp1.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : estatisticasComp1.somaServicos < estatisticas.somaServicos ? (
                              <span className="text-red-600">{(estatisticasComp1.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground">Igual</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Acima do Objetivo</p>
                        <p className="text-2xl font-bold">{estatisticasComp1.lojasAcimaObjetivo} / {estatisticasComp1.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Taxa Média Reparação</p>
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
                        <p className="text-xs text-muted-foreground">Total de Lojas</p>
                        <p className="text-2xl font-bold">{estatisticasComp2.totalLojas}</p>
                        {estatisticas && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp2.totalLojas > estatisticas.totalLojas ? (
                              <span className="text-green-600">+{estatisticasComp2.totalLojas - estatisticas.totalLojas}</span>
                            ) : estatisticasComp2.totalLojas < estatisticas.totalLojas ? (
                              <span className="text-red-600">{estatisticasComp2.totalLojas - estatisticas.totalLojas}</span>
                            ) : (
                              <span className="text-muted-foreground">Igual</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg h-[96px]">
                        <p className="text-xs text-muted-foreground">Total de Serviços</p>
                        <p className="text-2xl font-bold">{estatisticasComp2.somaServicos?.toLocaleString() || 0}</p>
                        {estatisticas && estatisticas.somaServicos && estatisticasComp2.somaServicos && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estatisticasComp2.somaServicos > estatisticas.somaServicos ? (
                              <span className="text-green-600">+{(estatisticasComp2.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : estatisticasComp2.somaServicos < estatisticas.somaServicos ? (
                              <span className="text-red-600">{(estatisticasComp2.somaServicos - estatisticas.somaServicos).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground">Igual</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Acima do Objetivo</p>
                        <p className="text-2xl font-bold">{estatisticasComp2.lojasAcimaObjetivo} / {estatisticasComp2.totalLojas}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Taxa Média Reparação</p>
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
                <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.totalLojas}</div>
                <p className="text-xs text-muted-foreground">
                  Com dados no período
                </p>
              </CardContent>
            </Card>
            
            {/* Total de Serviços */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
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
              </CardContent>
            </Card>
            
            {/* Lojas Acima do Objetivo */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acima do Objetivo</CardTitle>
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
                  } das lojas
                </p>
              </CardContent>
            </Card>
            
            {/* Taxa Média de Reparação */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa Média Reparação</CardTitle>
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
                  Objetivo: 22%
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
                Evolução Mensal - {lojaSelecionada === 'minhas' ? 'Minhas Lojas (Agregado)' : lojas?.find(l => l.id === lojaSelecionada)?.nome}
              </CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEvolucao ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : evolucao && evolucao.length > 0 ? (
                <div className="space-y-4">
                  {/* Gráfico simples com barras */}
                  <div className="grid grid-cols-1 gap-2">
                    {evolucao.map((item, idx) => {
                      const percentual = item.desvioPercentualMes || 0;
                      const isPositivo = percentual >= 0;
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{meses[item.mes - 1]} {item.ano}</span>
                            <span className={isPositivo ? 'text-green-600' : 'text-red-600'}>
                              {item.totalServicos || 0} serviços ({percentual >= 0 ? '+' : ''}{(percentual * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${isPositivo ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ 
                                width: `${Math.min(Math.abs(percentual * 100), 100)}%` 
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
                  Sem dados de evolução para esta loja
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
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                        ${idx === 0 ? 'bg-yellow-500 text-white' : ''}
                        ${idx === 1 ? 'bg-gray-400 text-white' : ''}
                        ${idx === 2 ? 'bg-orange-600 text-white' : ''}
                        ${idx > 2 ? 'bg-secondary text-foreground' : ''}
                      `}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.lojaNome}</div>
                        <div className="text-sm text-muted-foreground">{item.zona}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{valorDisplay}</div>
                        {metricaRanking !== 'totalServicos' && item.totalServicos && (
                          <div className="text-xs text-muted-foreground">{item.totalServicos} serv.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Sem dados de ranking para este período
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Vendas Complementares */}
        {temDadosComplementares && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Vendas Complementares
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
                  {/* Card de Destaque - % Serviços de Escovas (Prémio Trimestral) */}
                  <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950 dark:to-yellow-950 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">% Serviços de Escovas</span>
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-300">Prémio Trimestral</Badge>
                        </div>
                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                          {(estatisticasComplementares.mediaEscovasPercent * 100)?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Objetivo: 7.5%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Lojas acima do objetivo</div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                          {estatisticasComplementares.lojasComEscovas || 0}/{estatisticasComplementares.totalLojas || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resumo Geral */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Total Vendas</div>
                      <div className="text-2xl font-bold text-green-600">
                        €{estatisticasComplementares.somaVendas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                      <div className="text-xs text-muted-foreground">excl. películas</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Escovas</div>
                      <div className="text-2xl font-bold text-blue-600">
                        €{estatisticasComplementares.somaEscovas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                      <div className="text-xs text-muted-foreground">{estatisticasComplementares.totalEscovasQtd || 0} unidades</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Películas</div>
                      <div className="text-2xl font-bold text-purple-600">
                        €{estatisticasComplementares.somaPeliculas?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Lojas com Vendas</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {estatisticasComplementares.lojasComVendas || 0}/{estatisticasComplementares.totalLojas || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {estatisticasComplementares.percentLojasComEscovas?.toFixed(0) || 0}% venderam escovas
                      </div>
                    </div>
                  </div>
                  
                  {/* Breakdown por Categoria */}
                  <div>
                    <h4 className="font-medium mb-3">Breakdown por Categoria</h4>
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
                      <h4 className="font-medium mb-3">Top 5 Lojas - Vendas Complementares</h4>
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
                                variant={item.escovasPercent >= 0.075 ? "default" : "outline"}
                                className={item.escovasPercent >= 0.075 ? "bg-green-500" : ""}
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
                  Sem dados de vendas complementares para este período
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
              Resultados por Zona Geográfica
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
                      <span className="text-sm text-muted-foreground">{zona.totalLojas} lojas</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Serviços</div>
                        <div className="font-medium">{zona.somaServicos?.toLocaleString() || 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Desvio Médio</div>
                        <div className={`font-medium ${zona.mediaDesvioPercentual && zona.mediaDesvioPercentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {zona.mediaDesvioPercentual ? `${(zona.mediaDesvioPercentual * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Taxa Reparação</div>
                        <div className="font-medium">
                          {zona.mediaTaxaReparacao ? `${(zona.mediaTaxaReparacao * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Reparações</div>
                        <div className="font-medium">{zona.somaReparacoes || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Sem dados por zona para este período
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
    </DashboardLayout>
  );
}