import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Target, Award, BarChart3, LineChart, MapPin } from 'lucide-react';
import { useAuth } from '../_core/hooks/useAuth';


export function ResultadosDashboard() {
  
  const { user } = useAuth();
  
  // Buscar dados do gestor se usuário for gestor
  const { data: gestorData } = trpc.gestores.list.useQuery(
    undefined,
    { 
      enabled: user?.role === 'gestor',
      select: (gestores) => gestores.find(g => g.user.id === user?.id)
    }
  );
  
  // Estado dos filtros
  const [periodoSelecionado, setPeriodoSelecionado] = useState<{ mes: number; ano: number } | null>(null);
  const [lojaSelecionada, setLojaSelecionada] = useState<number | 'minhas' | null>(null);
  const [metricaRanking, setMetricaRanking] = useState<'totalServicos' | 'taxaReparacao' | 'desvioPercentualMes' | 'servicosPorColaborador'>('totalServicos');
  
  // Queries
  const { data: periodos, isLoading: loadingPeriodos } = trpc.resultados.periodos.useQuery();
  const { data: lojas, isLoading: loadingLojas } = trpc.lojas.getByGestor.useQuery();
  
  // Definir período padrão (mais recente)
  useMemo(() => {
    if (periodos && periodos.length > 0 && !periodoSelecionado) {
      setPeriodoSelecionado({ mes: periodos[0].mes, ano: periodos[0].ano });
    }
  }, [periodos, periodoSelecionado]);
  
  // Queries condicionais (apenas quando há período selecionado)
  const { data: estatisticas, isLoading: loadingEstatisticas } = trpc.resultados.estatisticas.useQuery(
    { mes: periodoSelecionado?.mes || 1, ano: periodoSelecionado?.ano || 2025 },
    { enabled: !!periodoSelecionado }
  );
  
  const { data: rankingCompleto, isLoading: loadingRanking } = trpc.resultados.ranking.useQuery(
    { 
      metrica: metricaRanking, 
      mes: periodoSelecionado?.mes || 1, 
      ano: periodoSelecionado?.ano || 2025,
      limit: 10
    },
    { enabled: !!periodoSelecionado }
  );
  
  // Filtrar ranking se loja estiver selecionada
  const ranking = useMemo(() => {
    if (!rankingCompleto) return rankingCompleto;
    
    if (typeof lojaSelecionada === 'number') {
      // Filtrar por loja específica
      return rankingCompleto.filter(r => r.lojaId === lojaSelecionada);
    } else if (lojaSelecionada === 'minhas' && gestorData) {
      // Filtrar por lojas do gestor
      const lojasDoGestor = lojas?.filter(l => 
        gestorData.lojas?.some((gl: any) => gl.id === l.id)
      ).map(l => l.id) || [];
      return rankingCompleto.filter(r => lojasDoGestor.includes(r.lojaId));
    }
    
    return rankingCompleto;
  }, [lojaSelecionada, rankingCompleto, gestorData, lojas]);
  
  const { data: porZona, isLoading: loadingZona } = trpc.resultados.porZona.useQuery(
    { mes: periodoSelecionado?.mes || 1, ano: periodoSelecionado?.ano || 2025 },
    { enabled: !!periodoSelecionado }
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
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Período */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select
                value={periodoSelecionado ? `${periodoSelecionado.mes}-${periodoSelecionado.ano}` : undefined}
                onValueChange={(value) => {
                  const [mes, ano] = value.split('-').map(Number);
                  setPeriodoSelecionado({ mes, ano });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={`${p.mes}-${p.ano}`} value={`${p.mes}-${p.ano}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Loja (para gráfico de evolução) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Loja (Evolução)</label>
              <Select
                value={lojaSelecionada?.toString() || 'todas'}
                onValueChange={(value) => {
                  if (value === 'todas') setLojaSelecionada(null);
                  else if (value === 'minhas') setLojaSelecionada('minhas');
                  else setLojaSelecionada(Number(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {user?.role === 'gestor' && gestorData && (
                    <SelectItem value="minhas">Apenas minhas lojas</SelectItem>
                  )}
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
          </CardContent>
        </Card>
        
        {/* Cards de Estatísticas */}
        {loadingEstatisticas ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : estatisticas ? (
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
                <div className="text-2xl font-bold">{estatisticas.somaServicos?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Objetivo: {estatisticas.somaObjetivos?.toLocaleString() || 0}
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
              Top 10 Lojas - {metricaLabels[metricaRanking]}
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
      </div>
    </DashboardLayout>
  );
}
