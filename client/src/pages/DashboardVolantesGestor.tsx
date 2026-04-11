import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FiltroMesesCheckbox, { MesSelecionado } from "@/components/FiltroMesesCheckbox";
import { 
  Car, 
  Wrench, 
  Shield, 
  Target, 
  CalendarDays, 
  TrendingUp, 
  Users, 
  Building2,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardVolantesGestor() {
  const [mesesSelecionados, setMesesSelecionados] = useState<MesSelecionado[]>(() => {
    const agora = new Date();
    return [{ mes: agora.getMonth() + 1, ano: agora.getFullYear() }];
  });
  const [sortField, setSortField] = useState<string>("totalServicos");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedVolante, setExpandedVolante] = useState<number | null>(null);

  // Converter meses selecionados para formato "YYYY-MM"
  const mesesParam = useMemo(() => {
    if (mesesSelecionados.length === 0) return undefined;
    return mesesSelecionados.map(m => `${m.ano}-${String(m.mes).padStart(2, '0')}`);
  }, [mesesSelecionados]);

  const { data, isLoading } = trpc.volantes.dashboardGestor.useQuery(
    mesesParam ? { mesesSelecionados: mesesParam } : undefined,
    { enabled: true }
  );

  // Sorting
  const sortedVolantes = useMemo(() => {
    if (!data?.porVolante) return [];
    return [...data.porVolante].sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0;
      const bVal = (b as any)[sortField] ?? 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [data?.porVolante, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Chart data - Evolução Mensal
  const evolucaoChartData = useMemo(() => {
    if (!data?.evolucaoMensal) return null;
    return {
      labels: data.evolucaoMensal.map(e => e.mes),
      datasets: [
        {
          label: 'Total Serviços',
          data: data.evolucaoMensal.map(e => e.totalServicos),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Substituições',
          data: data.evolucaoMensal.map(e => e.substituicoes),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Reparações',
          data: data.evolucaoMensal.map(e => e.reparacoes),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Calibragens',
          data: data.evolucaoMensal.map(e => e.calibragens),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        },
      ],
    };
  }, [data?.evolucaoMensal]);

  // Chart data - Top Lojas
  const topLojasChartData = useMemo(() => {
    if (!data?.topLojas || data.topLojas.length === 0) return null;
    return {
      labels: data.topLojas.map(l => l.lojaNome),
      datasets: [
        {
          label: 'Total Serviços',
          data: data.topLojas.map(l => l.total),
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(20, 184, 166, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(99, 102, 241, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(34, 197, 94, 0.8)',
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(59, 130, 246)',
            'rgb(245, 158, 11)',
            'rgb(168, 85, 247)',
            'rgb(239, 68, 68)',
            'rgb(20, 184, 166)',
            'rgb(249, 115, 22)',
            'rgb(99, 102, 241)',
            'rgb(236, 72, 153)',
            'rgb(34, 197, 94)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [data?.topLojas]);

  // Chart data - Pedidos de Apoio (Doughnut)
  const pedidosChartData = useMemo(() => {
    if (!data?.pedidosApoio || data.pedidosApoio.total === 0) return null;
    return {
      labels: ['Aprovados', 'Pendentes', 'Reprovados'],
      datasets: [
        {
          data: [data.pedidosApoio.aprovados, data.pedidosApoio.pendentes, data.pedidosApoio.reprovados],
          backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
          borderColor: ['rgb(34, 197, 94)', 'rgb(245, 158, 11)', 'rgb(239, 68, 68)'],
          borderWidth: 2,
        },
      ],
    };
  }, [data?.pedidosApoio]);

  // Serviços por volante (bar chart)
  const servicosPorVolanteData = useMemo(() => {
    if (!sortedVolantes || sortedVolantes.length === 0) return null;
    return {
      labels: sortedVolantes.map(v => v.nome),
      datasets: [
        {
          label: 'Substituições',
          data: sortedVolantes.map(v => v.substituicoes),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'Reparações',
          data: sortedVolantes.map(v => v.reparacoes),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1,
        },
        {
          label: 'Calibragens',
          data: sortedVolantes.map(v => v.calibragens),
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1,
        },
        {
          label: 'Outros',
          data: sortedVolantes.map(v => v.outros),
          backgroundColor: 'rgba(107, 114, 128, 0.8)',
          borderColor: 'rgb(107, 114, 128)',
          borderWidth: 1,
        },
      ],
    };
  }, [sortedVolantes]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 } },
      },
    },
  };

  const barStackedOptions = {
    ...chartOptions,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-emerald-600" />
              Dashboard Volantes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Estatísticas e atividade dos volantes
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <FiltroMesesCheckbox
              mesesSelecionados={mesesSelecionados}
              onMesesChange={setMesesSelecionados}
              maxMeses={6}
              placeholder="Filtrar por meses"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="ml-3 text-gray-500">A carregar estatísticas...</span>
          </div>
        ) : !data || data.totalVolantes === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500">Sem volantes ativos</h3>
              <p className="text-sm text-gray-400 mt-1">Adicione volantes na página de Gestão de Volantes</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Volantes</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{data.totalVolantes}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Total Serviços</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.kpis.totalServicos}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/20 border-cyan-200 dark:border-cyan-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-cyan-600" />
                    <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">Substituições</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{data.kpis.totalSubstituicoes}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Reparações</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{data.kpis.totalReparacoes}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Calibragens</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{data.kpis.totalCalibragens}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-medium text-teal-700 dark:text-teal-400">Dias Trab.</span>
                  </div>
                  <div className="text-2xl font-bold text-teal-900 dark:text-teal-100">{data.kpis.diasTrabalhados}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Média/Dia</span>
                  </div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{data.kpis.mediaPorDia}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Influência</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">{data.kpis.mediaInfluencia}%</div>
                  <div className="text-[10px] text-rose-500 dark:text-rose-400">média por loja</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela por Volante */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-5 w-5 text-emerald-600" />
                  Atividade por Volante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volante</th>
                        <SortHeader field="totalLojas" label="Lojas" />
                        <SortHeader field="totalServicos" label="Total Serv." />
                        <SortHeader field="substituicoes" label="Subst." />
                        <SortHeader field="reparacoes" label="Repar." />
                        <SortHeader field="calibragens" label="Calib." />
                        <SortHeader field="outros" label="Outros" />
                        <SortHeader field="diasTrabalhados" label="Dias" />
                        <SortHeader field="mediaPorDia" label="Média/Dia" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {sortedVolantes.map((v) => (
                        <tr
                          key={v.volanteId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                          onClick={() => setExpandedVolante(expandedVolante === v.volanteId ? null : v.volanteId)}
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Car className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{v.nome}</div>
                                {v.subZona && <div className="text-xs text-gray-400">{v.subZona}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {v.totalLojas}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{v.totalServicos}</span>
                          </td>
                          <td className="px-3 py-3 text-blue-600 dark:text-blue-400 font-medium">{v.substituicoes}</td>
                          <td className="px-3 py-3 text-amber-600 dark:text-amber-400 font-medium">{v.reparacoes}</td>
                          <td className="px-3 py-3 text-purple-600 dark:text-purple-400 font-medium">{v.calibragens}</td>
                          <td className="px-3 py-3 text-gray-500 font-medium">{v.outros}</td>
                          <td className="px-3 py-3 text-teal-600 dark:text-teal-400 font-medium">{v.diasTrabalhados}</td>
                          <td className="px-3 py-3">
                            <Badge className={`text-xs ${v.mediaPorDia >= 5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : v.mediaPorDia >= 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {v.mediaPorDia}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    {sortedVolantes.length > 1 && (
                      <tfoot>
                        <tr className="border-t-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold">
                          <td className="px-3 py-3 text-emerald-700 dark:text-emerald-400">TOTAL</td>
                          <td className="px-3 py-3 text-emerald-700 dark:text-emerald-400">-</td>
                          <td className="px-3 py-3 text-emerald-700 dark:text-emerald-400 text-base">{data.kpis.totalServicos}</td>
                          <td className="px-3 py-3 text-blue-700 dark:text-blue-400">{data.kpis.totalSubstituicoes}</td>
                          <td className="px-3 py-3 text-amber-700 dark:text-amber-400">{data.kpis.totalReparacoes}</td>
                          <td className="px-3 py-3 text-purple-700 dark:text-purple-400">{data.kpis.totalCalibragens}</td>
                          <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{data.kpis.totalOutros}</td>
                          <td className="px-3 py-3 text-teal-700 dark:text-teal-400">{data.kpis.diasTrabalhados}</td>
                          <td className="px-3 py-3">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                              {data.kpis.mediaPorDia}
                            </Badge>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evolução Mensal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Evolução Mensal (últimos 6 meses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {evolucaoChartData ? (
                      <Line data={evolucaoChartData} options={chartOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">Sem dados</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Serviços por Volante */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Serviços por Volante
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {servicosPorVolanteData ? (
                      <Bar data={servicosPorVolanteData} options={barStackedOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">Sem dados</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Lojas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    Top 10 Lojas com Mais Serviços
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {topLojasChartData ? (
                      <Bar data={topLojasChartData} options={{
                        ...chartOptions,
                        indexAxis: 'y' as const,
                        plugins: { ...chartOptions.plugins, legend: { display: false } },
                      }} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">Sem dados</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pedidos de Apoio */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Pedidos de Apoio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{data.pedidosApoio.total}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Aprovados</div>
                        <div className="text-lg font-bold text-green-600">{data.pedidosApoio.aprovados}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Pendentes</div>
                        <div className="text-lg font-bold text-amber-600">{data.pedidosApoio.pendentes}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Reprovados</div>
                        <div className="text-lg font-bold text-red-600">{data.pedidosApoio.reprovados}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '180px' }}>
                    {pedidosChartData ? (
                      <Doughnut data={pedidosChartData} options={{
                        ...chartOptions,
                        cutout: '60%',
                      }} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem pedidos no período</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Influência por Loja */}
            {data.influenciaPorLoja && data.influenciaPorLoja.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-rose-600" />
                    Influência dos Volantes nos Resultados por Loja
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Percentagem dos serviços totais da loja realizados pelos volantes no período selecionado
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Loja</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serv. Volante</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Loja</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Influência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {data.influenciaPorLoja.map((l, idx) => (
                          <tr key={l.lojaId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900 dark:text-white">{l.lojaNome}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{l.servicosVolante}</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">
                              {l.totalServicosLoja > 0 ? l.totalServicosLoja : <span className="text-gray-400 text-xs">s/ dados</span>}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {l.totalServicosLoja > 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${l.percentagemInfluencia >= 50 ? 'bg-rose-500' : l.percentagemInfluencia >= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                      style={{ width: `${Math.min(100, l.percentagemInfluencia)}%` }}
                                    />
                                  </div>
                                  <span className={`font-bold text-sm ${l.percentagemInfluencia >= 50 ? 'text-rose-600 dark:text-rose-400' : l.percentagemInfluencia >= 25 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {l.percentagemInfluencia}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>&lt; 25%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>25-50%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span>&gt; 50%</span>
                    </div>
                    <span className="ml-auto">Média: <strong className="text-rose-600 dark:text-rose-400">{data.kpis.mediaInfluencia}%</strong></span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
