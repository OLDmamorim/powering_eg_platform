import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Loader2, SmilePlus, TrendingUp, TrendingDown, Target, BarChart3, Award, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../_core/hooks/useAuth';
import { useLanguage } from "@/contexts/LanguageContext";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const mesesPT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesesEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const npsKeys = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'] as const;
const taxaKeys = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'] as const;

export function NPSDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const meses = language === 'pt' ? mesesPT : mesesEN;
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed
  
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear);
  const [mesSelecionado, setMesSelecionado] = useState<number | 'todos'>('todos');
  const [filtroZona, setFiltroZona] = useState<string>('todas');
  const [filtroLoja, setFiltroLoja] = useState<string>('todas');
  
  // Buscar lojas do gestor
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();
  const lojasIdsGestor = useMemo(() => lojas?.map(l => l.id) || [], [lojas]);
  
  // Buscar dados NPS
  const { data: dadosNPSAdmin, isLoading: loadingNPSAdmin } = trpc.nps.getDadosTodasLojas.useQuery(
    { ano: anoSelecionado },
    { enabled: user?.role === 'admin' }
  );
  
  const { data: dadosNPSGestor, isLoading: loadingNPSGestor } = trpc.nps.getDadosLojas.useQuery(
    { lojasIds: lojasIdsGestor, ano: anoSelecionado },
    { enabled: user?.role === 'gestor' && lojasIdsGestor.length > 0 }
  );
  
  const dadosNPS = user?.role === 'admin' ? dadosNPSAdmin : dadosNPSGestor;
  const loadingNPS = user?.role === 'admin' ? loadingNPSAdmin : loadingNPSGestor;
  
  // Buscar gestores para filtro de zona
  const { data: gestores } = trpc.gestores.list.useQuery(undefined, { enabled: user?.role === 'admin' });
  
  // Extrair zonas únicas
  const zonas = useMemo(() => {
    if (!dadosNPS) return [];
    const zonasSet = new Set<string>();
    dadosNPS.forEach((item: any) => {
      const zona = item.loja?.zona || item.zona;
      if (zona) zonasSet.add(zona);
    });
    return Array.from(zonasSet).sort();
  }, [dadosNPS]);
  
  // Extrair lista de lojas para filtro
  const listaLojas = useMemo(() => {
    if (!dadosNPS) return [];
    return dadosNPS
      .map((item: any) => ({
        id: item.loja?.id || item.lojaId,
        nome: item.loja?.nome || 'Desconhecida',
      }))
      .filter((l: any) => l.nome !== 'Desconhecida')
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  }, [dadosNPS]);
  
  // Filtrar dados por zona e loja
  const dadosFiltrados = useMemo(() => {
    if (!dadosNPS) return [];
    let filtrados = dadosNPS;
    if (filtroZona !== 'todas') {
      filtrados = filtrados.filter((item: any) => {
        const zona = item.loja?.zona || item.zona;
        return zona === filtroZona;
      });
    }
    if (filtroLoja !== 'todas') {
      filtrados = filtrados.filter((item: any) => {
        const lojaId = item.loja?.id || item.lojaId;
        return String(lojaId) === filtroLoja;
      });
    }
    return filtrados;
  }, [dadosNPS, filtroZona, filtroLoja]);
  
  // Calcular estatísticas NPS
  const estatisticas = useMemo(() => {
    if (!dadosFiltrados || dadosFiltrados.length === 0) return null;
    
    const mesIdx = typeof mesSelecionado === 'number' ? mesSelecionado : currentMonth;
    const npsKey = npsKeys[mesIdx];
    const taxaKey = taxaKeys[mesIdx];
    
    let totalNPS = 0;
    let countNPS = 0;
    let totalTaxa = 0;
    let countTaxa = 0;
    let melhorLoja = { nome: '', nps: 0 };
    let piorLoja = { nome: '', nps: 1 };
    let lojasAbaixo50 = 0;
    let lojasAcima80 = 0;
    
    dadosFiltrados.forEach((item: any) => {
      const nps = item.nps || item;
      const loja = item.loja || {};
      const npsVal = nps[npsKey];
      const taxaVal = nps[taxaKey];
      
      if (npsVal !== null && npsVal !== undefined) {
        const val = parseFloat(npsVal);
        totalNPS += val;
        countNPS++;
        if (val > melhorLoja.nps) melhorLoja = { nome: loja.nome || '', nps: val };
        if (val < piorLoja.nps) piorLoja = { nome: loja.nome || '', nps: val };
        if (val < 0.5) lojasAbaixo50++;
        if (val >= 0.8) lojasAcima80++;
      }
      
      if (taxaVal !== null && taxaVal !== undefined) {
        totalTaxa += parseFloat(taxaVal);
        countTaxa++;
      }
    });
    
    return {
      mediaNPS: countNPS > 0 ? totalNPS / countNPS : 0,
      mediaTaxa: countTaxa > 0 ? totalTaxa / countTaxa : 0,
      totalLojas: dadosFiltrados.length,
      lojasComDados: countNPS,
      melhorLoja,
      piorLoja: countNPS > 0 ? piorLoja : { nome: '', nps: 0 },
      lojasAbaixo50,
      lojasAcima80,
    };
  }, [dadosFiltrados, mesSelecionado, currentMonth]);
  
  // Dados para gráfico de evolução mensal (média de todas as lojas)
  const evolucaoMensal = useMemo(() => {
    if (!dadosFiltrados || dadosFiltrados.length === 0) return null;
    
    const npsMedias: (number | null)[] = [];
    const taxaMedias: (number | null)[] = [];
    
    for (let i = 0; i < 12; i++) {
      let totalNPS = 0, countNPS = 0;
      let totalTaxa = 0, countTaxa = 0;
      
      dadosFiltrados.forEach((item: any) => {
        const nps = item.nps || item;
        const npsVal = nps[npsKeys[i]];
        const taxaVal = nps[taxaKeys[i]];
        
        if (npsVal !== null && npsVal !== undefined) {
          totalNPS += parseFloat(npsVal);
          countNPS++;
        }
        if (taxaVal !== null && taxaVal !== undefined) {
          totalTaxa += parseFloat(taxaVal);
          countTaxa++;
        }
      });
      
      npsMedias.push(countNPS > 0 ? (totalNPS / countNPS) * 100 : null);
      taxaMedias.push(countTaxa > 0 ? (totalTaxa / countTaxa) * 100 : null);
    }
    
    return { npsMedias, taxaMedias };
  }, [dadosFiltrados]);
  
  // Ranking de lojas por NPS do mês selecionado
  const rankingLojas = useMemo(() => {
    if (!dadosFiltrados || dadosFiltrados.length === 0) return [];
    
    const mesIdx = typeof mesSelecionado === 'number' ? mesSelecionado : currentMonth;
    const npsKey = npsKeys[mesIdx];
    const taxaKey = taxaKeys[mesIdx];
    
    return dadosFiltrados
      .map((item: any) => {
        const nps = item.nps || item;
        const loja = item.loja || {};
        const npsVal = nps[npsKey];
        const taxaVal = nps[taxaKey];
        return {
          lojaId: loja.id || nps.lojaId,
          lojaNome: loja.nome || 'Desconhecida',
          zona: loja.zona || '',
          nps: npsVal !== null && npsVal !== undefined ? parseFloat(npsVal) : null,
          taxaResposta: taxaVal !== null && taxaVal !== undefined ? parseFloat(taxaVal) : null,
          npsAnual: nps.npsAnoTotal ? parseFloat(nps.npsAnoTotal) : null,
        };
      })
      .filter((item: any) => item.nps !== null)
      .sort((a: any, b: any) => {
        // NPS Mês desc (arredondar para evitar problemas de float)
        const aNpsMes = Math.round((a.nps ?? 0) * 10000);
        const bNpsMes = Math.round((b.nps ?? 0) * 10000);
        if (bNpsMes !== aNpsMes) return bNpsMes - aNpsMes;
        // Desempate 1: NPS Anual desc
        const aNpsAnual = Math.round((a.npsAnual ?? -1) * 10000);
        const bNpsAnual = Math.round((b.npsAnual ?? -1) * 10000);
        if (bNpsAnual !== aNpsAnual) return bNpsAnual - aNpsAnual;
        // Desempate 2: Taxa de Resposta desc
        const aTaxa = Math.round((a.taxaResposta ?? 0) * 10000);
        const bTaxa = Math.round((b.taxaResposta ?? 0) * 10000);
        return bTaxa - aTaxa;
      });
  }, [dadosFiltrados, mesSelecionado, currentMonth]);
  
  // Dados para gráfico de barras (ranking)
  const chartRankingData = useMemo(() => {
    if (!rankingLojas || rankingLojas.length === 0) return null;
    
    const top20 = rankingLojas.slice(0, 20);
    
    return {
      labels: top20.map((item: any) => item.lojaNome.length > 15 ? item.lojaNome.substring(0, 15) + '...' : item.lojaNome),
      datasets: [
        {
          label: 'NPS (%)',
          data: top20.map((item: any) => (item.nps || 0) * 100),
          backgroundColor: top20.map((item: any) => {
            const val = item.nps || 0;
            if (val >= 0.8) return 'rgba(34, 197, 94, 0.7)';
            if (val >= 0.5) return 'rgba(234, 179, 8, 0.7)';
            return 'rgba(239, 68, 68, 0.7)';
          }),
          borderColor: top20.map((item: any) => {
            const val = item.nps || 0;
            if (val >= 0.8) return 'rgb(34, 197, 94)';
            if (val >= 0.5) return 'rgb(234, 179, 8)';
            return 'rgb(239, 68, 68)';
          }),
          borderWidth: 1,
        },
      ],
    };
  }, [rankingLojas]);
  
  // Dados para gráfico de evolução
  const chartEvolucaoData = useMemo(() => {
    if (!evolucaoMensal) return null;
    
    return {
      labels: meses,
      datasets: [
        {
          label: t('npsDashboard.npsMedioPercent'),
          data: evolucaoMensal.npsMedias,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t('npsDashboard.taxaRespostaPercent'),
          data: evolucaoMensal.taxaMedias,
          borderColor: 'rgb(234, 179, 8)',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [5, 5],
        },
      ],
    };
  }, [evolucaoMensal, meses, t]);
  
  const mesLabel = typeof mesSelecionado === 'number' ? meses[mesSelecionado] : t('npsDashboard.ultimoMesDisponivel');
  
  // Calcular data de upload mais recente dos dados NPS
  const dataUploadInfo = useMemo(() => {
    if (!dadosFiltrados || dadosFiltrados.length === 0) return null;
    let maisRecente: Date | null = null;
    let nomeArquivo: string | null = null;
    dadosFiltrados.forEach((item: any) => {
      const nps = item.nps || item;
      const created = nps.createdAt || nps.updatedAt;
      if (created) {
        const d = new Date(created);
        if (!maisRecente || d > maisRecente) {
          maisRecente = d;
          nomeArquivo = nps.nomeArquivo || null;
        }
      }
    });
    return maisRecente ? {
      data: maisRecente,
      dataFormatada: (maisRecente as Date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      nomeArquivo,
    } : null;
  }, [dadosFiltrados]);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SmilePlus className="h-7 w-7 text-primary" />
              {t('npsDashboard.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('npsDashboard.subtitle')}
            </p>
            {dataUploadInfo && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Último upload: {dataUploadInfo.dataFormatada}</span>
                {dataUploadInfo.nomeArquivo && (
                  <span className="text-muted-foreground/60">({dataUploadInfo.nomeArquivo})</span>
                )}
              </div>
            )}
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(v === 'todos' ? 'todos' : parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('npsDashboard.ultimoMes')}</SelectItem>
                {meses.map((mes, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{mes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {user?.role === 'admin' && zonas.length > 0 && (
              <Select value={filtroZona} onValueChange={(v) => { setFiltroZona(v); setFiltroLoja('todas'); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">{t('npsDashboard.todasZonas')}</SelectItem>
                  {zonas.map((zona) => (
                    <SelectItem key={zona} value={zona}>{zona}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Filtro por Loja */}
            {listaLojas.length > 0 && (
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('npsDashboard.todasLojas')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">{t('npsDashboard.todasLojas')}</SelectItem>
                  {listaLojas.map((loja: any) => (
                    <SelectItem key={loja.id} value={String(loja.id)}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {loadingNPS ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !dadosFiltrados || dadosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <SmilePlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('npsDashboard.semDadosNPS')}</h3>
              <p className="text-muted-foreground text-center">
                {t('npsDashboard.semDadosNPSDesc').replace('{ano}', anoSelecionado.toString())}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPIs */}
            {estatisticas && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <SmilePlus className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{t('npsDashboard.npsMedio')} ({mesLabel})</span>
                    </div>
                    <div className={`text-3xl font-bold ${
                      estatisticas.mediaNPS >= 0.8 ? 'text-green-600' :
                      estatisticas.mediaNPS >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(estatisticas.mediaNPS * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {estatisticas.lojasComDados} {t('npsDashboard.de')} {estatisticas.totalLojas} {t('npsDashboard.lojasComDados')}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">{t('npsDashboard.taxaRespostaMedia')}</span>
                    </div>
                    <div className="text-3xl font-bold">
                      {(estatisticas.mediaTaxa * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('npsDashboard.percentagemMediaRespostas')}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">{t('npsDashboard.excelencia')}</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {estatisticas.lojasAcima80}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {estatisticas.melhorLoja.nome && `${t('npsDashboard.melhor')}: ${estatisticas.melhorLoja.nome}`}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">{t('npsDashboard.atencao')}</span>
                    </div>
                    <div className="text-3xl font-bold text-red-600">
                      {estatisticas.lojasAbaixo50}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {estatisticas.piorLoja.nome && `${t('npsDashboard.pior')}: ${estatisticas.piorLoja.nome}`}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Gráfico de Evolução Mensal */}
            {chartEvolucaoData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t('npsDashboard.evolucaoNPSMensal')} - {anoSelecionado}
                  </CardTitle>
                  <CardDescription>
                    {t('npsDashboard.mediaNPSTaxaResposta')}
                    {filtroZona !== 'todas' && ` (${t('npsDashboard.zona')}: ${filtroZona})`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '350px' }}>
                    <Line
                      data={chartEvolucaoData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`
                            }
                          }
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            ticks: { callback: (v) => `${v}%` }
                          }
                        },
                        spanGaps: true,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Gráfico de Ranking por Loja */}
            {chartRankingData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t('npsDashboard.npsPorLoja')} - {mesLabel} {anoSelecionado}
                  </CardTitle>
                  <CardDescription>
                    {t('npsDashboard.topLojasOrdenadas').replace('{count}', String(Math.min(rankingLojas.length, 20)))}
                    {filtroZona !== 'todas' && ` (${t('npsDashboard.zona')}: ${filtroZona})`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ height: `${Math.max(300, Math.min(rankingLojas.length, 20) * 30)}px` }}>
                    <Bar
                      data={chartRankingData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `NPS: ${ctx.parsed.x?.toFixed(1)}%`
                            }
                          }
                        },
                        scales: {
                          x: {
                            min: 0,
                            max: 100,
                            ticks: { callback: (v) => `${v}%` }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Tabela detalhada com Elegibilidade Prémio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {t('npsDashboard.rankingNPSElegibilidade')} - {mesLabel} {anoSelecionado}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <span>{t('npsDashboard.lojasComDadosNPS').replace('{count}', String(rankingLojas.length))}{filtroZona !== 'todas' ? ` ${t('npsDashboard.naZona').replace('{zona}', filtroZona)}` : ''}</span>
                  <span className="block text-xs">
                    {t('npsDashboard.regrasElegibilidade')}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Ordenar: NPS Mês desc, desempate por Taxa de Resposta desc, depois NPS Anual desc
                  const sortedRanking = [...rankingLojas].sort((a: any, b: any) => {
                    // 1. NPS Mês desc
                    const aNpsMes = Math.round((a.nps ?? 0) * 10000);
                    const bNpsMes = Math.round((b.nps ?? 0) * 10000);
                    if (bNpsMes !== aNpsMes) return bNpsMes - aNpsMes;
                    // 2. Desempate: Taxa de Resposta desc
                    const aTaxa = Math.round((a.taxaResposta ?? 0) * 10000);
                    const bTaxa = Math.round((b.taxaResposta ?? 0) * 10000);
                    if (bTaxa !== aTaxa) return bTaxa - aTaxa;
                    // 3. Desempate: NPS Anual desc
                    const aNpsAnual = Math.round((a.npsAnual ?? -1) * 10000);
                    const bNpsAnual = Math.round((b.npsAnual ?? -1) * 10000);
                    return bNpsAnual - aNpsAnual;
                  });
                  const totalElegivel = sortedRanking.filter((i: any) => (i.nps >= 0.8) || (i.taxaResposta !== null && i.taxaResposta >= 0.075)).length;
                  const totalInelegivel = sortedRanking.length - totalElegivel;
                  
                  return sortedRanking.length > 0 ? (
                    <>
                      {/* Resumo elegibilidade */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">{totalElegivel}</div>
                          <div className="text-xs text-muted-foreground">{t('npsDashboard.elegiveis')}</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-red-600">{totalInelegivel}</div>
                          <div className="text-xs text-muted-foreground">{t('npsDashboard.semPremio')}</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-blue-600">{sortedRanking.length > 0 ? ((totalElegivel / sortedRanking.length) * 100).toFixed(0) : 0}%</div>
                          <div className="text-xs text-muted-foreground">{t('npsDashboard.taxaElegibilidade')}</div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2 w-10">#</th>
                              <th className="text-left py-3 px-2">{t('npsDashboard.loja')}</th>
                              <th className="text-left py-3 px-2">{t('npsDashboard.zona')}</th>
                              <th className="text-right py-3 px-2">{t('npsDashboard.npsMes')}</th>
                              <th className="text-right py-3 px-2">{t('npsDashboard.taxaResp')}</th>
                              <th className="text-right py-3 px-2">{t('npsDashboard.npsAnual')}</th>
                              <th className="text-center py-3 px-2">{t('npsDashboard.premio')}</th>
                              <th className="text-left py-3 px-2">{t('npsDashboard.motivo')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRanking.map((item: any, idx: number) => {
                              const elegivelPremio = (item.nps >= 0.8) || (item.taxaResposta !== null && item.taxaResposta >= 0.075);
                              const npsAbaixo = item.nps < 0.8;
                              const taxaAbaixo = item.taxaResposta !== null && item.taxaResposta < 0.075;
                              const motivo = !elegivelPremio ? (
                                npsAbaixo && taxaAbaixo ? t('npsDashboard.npsETaxaAbaixo') :
                                npsAbaixo ? t('npsDashboard.npsAbaixo80') : ''
                              ) : '';
                              
                              return (
                                <tr key={item.lojaId} className={`border-b hover:bg-muted/50 ${!elegivelPremio ? 'opacity-70' : ''}`}>
                                  <td className="py-2 px-2">
                                    <div className={`
                                      flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs
                                      ${elegivelPremio && idx === 0 ? 'bg-yellow-500 text-white' : ''}
                                      ${elegivelPremio && idx === 1 ? 'bg-gray-400 text-white' : ''}
                                      ${elegivelPremio && idx === 2 ? 'bg-orange-600 text-white' : ''}
                                      ${!elegivelPremio || idx > 2 ? 'bg-secondary text-foreground' : ''}
                                    `}>
                                      {idx + 1}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 font-medium">{item.lojaNome}</td>
                                  <td className="py-2 px-2 text-muted-foreground text-xs">{item.zona}</td>
                                  <td className="py-2 px-2 text-right">
                                    <span className={`font-bold ${
                                      item.nps >= 0.8 ? 'text-green-600' :
                                      item.nps >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {(item.nps * 100).toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    <span className={`font-medium ${taxaAbaixo ? 'text-red-500' : ''}`}>
                                      {item.taxaResposta !== null ? `${(item.taxaResposta * 100).toFixed(1)}%` : '-'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    {item.npsAnual !== null ? `${(item.npsAnual * 100).toFixed(1)}%` : '-'}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    {elegivelPremio ? (
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
                                        ✓ {t('npsDashboard.elegivel')}
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
                                        {t('npsDashboard.semPremio')}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-xs text-red-500">
                                    {motivo}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Legenda */}
                      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          {t('npsDashboard.legendaElegivel')}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          {t('npsDashboard.legendaNPSAbaixo')}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          {t('npsDashboard.legendaTaxaAbaixo')}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {t('npsDashboard.semDadosPeriodo')}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
