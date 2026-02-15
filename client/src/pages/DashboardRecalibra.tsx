import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, BarChart3, TrendingUp, Car, MapPin, Loader2, Activity, Store, Target, CalendarDays, Filter, Check, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const CORES_TIPO: Record<string, string> = {
  'DINÂMICA': '#3b82f6',
  'ESTÁTICA': '#22c55e',
  'CORE': '#a855f7',
};

const CORES_GRAFICO = [
  '#0d9488', '#0891b2', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#2563eb', '#4f46e5', '#7c3aed',
];

const MESES_NOMES: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

export default function DashboardRecalibra() {
  const [token, setToken] = useState('');
  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>([]);
  const [mostrarFiltro, setMostrarFiltro] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('recalibra_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Primeiro, buscar todas as calibragens para extrair meses disponíveis
  const { data: calibragens } = trpc.portalRecalibra.listarCalibragens.useQuery(
    { token },
    { enabled: !!token }
  );

  // Extrair meses disponíveis das calibragens
  const mesesDisponiveis = useMemo(() => {
    if (!calibragens) return [];
    const mesesSet = new Set<string>();
    calibragens.forEach((c: any) => {
      if (c.data) {
        const mesAno = c.data.substring(0, 7); // 'YYYY-MM'
        mesesSet.add(mesAno);
      }
    });
    return Array.from(mesesSet).sort().reverse(); // Mais recente primeiro
  }, [calibragens]);

  // Estabilizar o array para evitar re-renders infinitos
  const mesesParam = useMemo(() => {
    return mesesSelecionados.length > 0 ? mesesSelecionados : undefined;
  }, [mesesSelecionados]);

  const { data: stats, isLoading } = trpc.portalRecalibra.estatisticas.useQuery(
    { token, mesesSelecionados: mesesParam },
    { enabled: !!token }
  );

  const handleVoltar = () => {
    window.history.back();
  };

  const toggleMes = (mes: string) => {
    setMesesSelecionados(prev => 
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const limparFiltro = () => {
    setMesesSelecionados([]);
  };

  const formatMesLabel = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    return `${MESES_NOMES[mes] || mes} ${ano}`;
  };

  // Dados para gráficos
  const dadosTipo = useMemo(() => {
    if (!stats?.porTipo) return [];
    return Object.entries(stats.porTipo)
      .map(([nome, valor]) => ({ nome, valor, fill: CORES_TIPO[nome] || '#6b7280' }))
      .sort((a, b) => b.valor - a.valor);
  }, [stats]);

  const dadosMarca = useMemo(() => {
    if (!stats?.porMarca) return [];
    return Object.entries(stats.porMarca)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15);
  }, [stats]);

  const dadosLocalidade = useMemo(() => {
    if (!stats?.porLocalidade) return [];
    return Object.entries(stats.porLocalidade)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [stats]);

  const dadosSemanal = useMemo(() => {
    if (!stats?.evolucaoSemanal) return [];
    return Object.entries(stats.evolucaoSemanal)
      .map(([data, valor]) => ({
        data,
        semana: `Sem. ${new Date(data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`,
        valor,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [stats]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Token não encontrado. Volte ao portal e faça login.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/portal-recalibra'}>
              Ir para o Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-muted-foreground">A carregar estatísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Não foi possível carregar as estatísticas.</p>
            <Button className="mt-4" onClick={handleVoltar}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Marca mais frequente
  const marcaTop = dadosMarca.length > 0 ? dadosMarca[0] : null;

  // Custom label para o donut
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, nome, valor }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${nome} (${valor})`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleVoltar}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-teal-900 flex items-center gap-2">
                  <BarChart3 className="h-7 w-7 text-teal-600" />
                  Dashboard Calibragens
                </h1>
                <p className="text-muted-foreground">{stats.unidadeNome}</p>
              </div>
            </div>
            <Button
              variant={mostrarFiltro ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMostrarFiltro(!mostrarFiltro)}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              Filtrar Mês
              {mesesSelecionados.length > 0 && (
                <span className="ml-1 bg-white text-teal-700 rounded-full px-1.5 py-0.5 text-xs font-bold">
                  {mesesSelecionados.length}
                </span>
              )}
            </Button>
          </div>

          {/* Filtro de meses */}
          {mostrarFiltro && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Selecionar meses:
                </p>
                {mesesSelecionados.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={limparFiltro} className="text-xs gap-1 h-7">
                    <X className="h-3 w-3" />
                    Limpar filtro
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {mesesDisponiveis.map(mes => {
                  const selecionado = mesesSelecionados.includes(mes);
                  return (
                    <button
                      key={mes}
                      onClick={() => toggleMes(mes)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                        selecionado
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:bg-teal-50'
                      }`}
                    >
                      {selecionado && <Check className="h-3 w-3" />}
                      {formatMesLabel(mes)}
                    </button>
                  );
                })}
              </div>
              {mesesSelecionados.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  A mostrar dados de: {mesesSelecionados.sort().map(formatMesLabel).join(', ')}
                </p>
              )}
              {mesesSelecionados.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Nenhum filtro aplicado — a mostrar todos os dados
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100">
                  <Target className="h-5 w-5 text-teal-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-900">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Calibragens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Activity className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{stats.mediaDiaria}</p>
                  <p className="text-xs text-muted-foreground">Média/Dia</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Store className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900 text-sm">{stats.lojaTopVisitada?.nome || 'Sem dados'}</p>
                  <p className="text-xs text-muted-foreground">Loja + Visitada {stats.lojaTopVisitada ? `(${stats.lojaTopVisitada.count})` : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Car className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900 text-sm">{marcaTop?.nome || '-'}</p>
                  <p className="text-xs text-muted-foreground">Marca + Frequente ({marcaTop?.valor || 0})</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos - Tipo (grande, centrado) */}
        <Card className="bg-white mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
            <CardDescription>Calibragens por tipo de calibragem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="valor"
                    nameKey="nome"
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {dadosTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Calibragens']} />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => {
                      const item = dadosTipo.find(d => d.nome === value);
                      return `${value} (${item?.valor || 0})`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos - Marcas + Localidades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Marcas</CardTitle>
              <CardDescription>Marcas mais calibradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosMarca} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [value, 'Calibragens']} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                      {dadosMarca.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Por Localidade</CardTitle>
              <CardDescription>Distribuição geográfica das calibragens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosLocalidade}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, angle: -30 }} height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [value, 'Calibragens']} />
                    <Bar dataKey="valor" fill="#0891b2" radius={[4, 4, 0, 0]}>
                      {dadosLocalidade.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evolução Semanal */}
        <Card className="bg-white mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Evolução Semanal</CardTitle>
            <CardDescription>Calibragens por semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosSemanal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [value, 'Calibragens']} />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabela Resumo por Marca */}
        <Card className="bg-white mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Resumo Detalhado por Marca</CardTitle>
            <CardDescription>Todas as marcas com contagem e percentagem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-semibold">#</th>
                    <th className="text-left p-2 font-semibold">Marca</th>
                    <th className="text-right p-2 font-semibold">Calibragens</th>
                    <th className="text-right p-2 font-semibold">%</th>
                    <th className="text-left p-2 font-semibold">Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosMarca.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{item.nome}</td>
                      <td className="p-2 text-right font-mono">{item.valor}</td>
                      <td className="p-2 text-right font-mono">
                        {stats.total > 0 ? ((item.valor / stats.total) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="p-2">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${stats.total > 0 ? (item.valor / stats.total) * 100 : 0}%`,
                              backgroundColor: CORES_GRAFICO[idx % CORES_GRAFICO.length],
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
