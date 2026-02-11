import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, Calendar, TrendingUp, TrendingDown, Users, CheckCircle, XCircle, BarChart3, PieChart, Activity } from "lucide-react";
import { Line, Bar, Pie } from "react-chartjs-2";
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

// Registrar componentes do Chart.js
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

export default function DashboardVolante() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("30"); // dias
  const [dataPersonalizadaInicio, setDataPersonalizadaInicio] = useState<string>("");
  const [dataPersonalizadaFim, setDataPersonalizadaFim] = useState<string>("");

  // Calcular datas baseado no período selecionado
  const { dataInicio, dataFim } = useMemo(() => {
    if (periodoSelecionado === "personalizado" && dataPersonalizadaInicio && dataPersonalizadaFim) {
      return {
        dataInicio: dataPersonalizadaInicio,
        dataFim: dataPersonalizadaFim,
      };
    }

    const fim = new Date();
    const dias = parseInt(periodoSelecionado);
    const inicio = new Date(fim.getTime() - dias * 24 * 60 * 60 * 1000);

    return {
      dataInicio: inicio.toISOString().split('T')[0],
      dataFim: fim.toISOString().split('T')[0],
    };
  }, [periodoSelecionado, dataPersonalizadaInicio, dataPersonalizadaFim]);

  // Buscar estatísticas avançadas
  const { data: stats, isLoading } = trpc.dashboardVolante.estatisticasAvancadas.useQuery({
    dataInicio,
    dataFim,
  });

  // Configuração dos gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
  };

  // Dados do gráfico de evolução temporal
  const evolucaoData = useMemo(() => {
    if (!stats?.graficos.evolucaoTemporal) return null;

    return {
      labels: stats.graficos.evolucaoTemporal.map(e => e.semana),
      datasets: [
        {
          label: 'Visitas',
          data: stats.graficos.evolucaoTemporal.map(e => e.visitas),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Pendentes',
          data: stats.graficos.evolucaoTemporal.map(e => e.pendentes),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [stats]);

  // Dados do gráfico de tipos de relatórios
  const tiposRelatoriosData = useMemo(() => {
    if (!stats?.graficos.tiposRelatorios) return null;

    return {
      labels: ['Relatórios Livres', 'Relatórios Completos'],
      datasets: [
        {
          data: [stats.graficos.tiposRelatorios.livres, stats.graficos.tiposRelatorios.completos],
          backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(168, 85, 247, 0.8)'],
          borderColor: ['rgb(34, 197, 94)', 'rgb(168, 85, 247)'],
          borderWidth: 2,
        },
      ],
    };
  }, [stats]);

  // Dados do gráfico de visitas por loja (top 10)
  const visitasPorLojaData = useMemo(() => {
    if (!stats?.graficos.visitasPorLoja) return null;

    const top10 = [...stats.graficos.visitasPorLoja]
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 10);

    return {
      labels: top10.map(v => v.lojaNome),
      datasets: [
        {
          label: 'Visitas',
          data: top10.map(v => v.visitas),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
        },
      ],
    };
  }, [stats]);

  // Dados do gráfico de pendentes por loja (top 10)
  const pendentesPorLojaData = useMemo(() => {
    if (!stats?.graficos.pendentesPorLoja) return null;

    const top10 = [...stats.graficos.pendentesPorLoja]
      .sort((a, b) => (b.pendentes - b.resolvidos) - (a.pendentes - a.resolvidos))
      .slice(0, 10);

    return {
      labels: top10.map(p => p.lojaNome),
      datasets: [
        {
          label: 'Pendentes em Aberto',
          data: top10.map(p => p.pendentes - p.resolvidos),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
        },
        {
          label: 'Resolvidos',
          data: top10.map(p => p.resolvidos),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
        },
      ],
    };
  }, [stats]);

  const exportarPDFMutation = trpc.dashboardVolante.exportarPDF.useMutation();

  const handleExportarPDF = async () => {
    try {
      const result = await exportarPDFMutation.mutateAsync({
        dataInicio,
        dataFim,
      });
      
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(result.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Por favor, tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">A carregar estatísticas...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard do Volante</h1>
            <p className="text-muted-foreground mt-1">
              Análise detalhada de visitas e pendentes
            </p>
          </div>
          <Button onClick={handleExportarPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros Temporais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Última Semana</SelectItem>
                    <SelectItem value="30">Último Mês</SelectItem>
                    <SelectItem value="90">Último Trimestre</SelectItem>
                    <SelectItem value="180">Último Semestre</SelectItem>
                    <SelectItem value="365">Último Ano</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodoSelecionado === "personalizado" && (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Data Início</label>
                    <input
                      type="date"
                      value={dataPersonalizadaInicio}
                      onChange={(e) => setDataPersonalizadaInicio(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <input
                      type="date"
                      value={dataPersonalizadaFim}
                      onChange={(e) => setDataPersonalizadaFim(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Visitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {stats?.resumo.totalVisitas || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Pendentes em Aberto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                {stats?.resumo.pendentesPendentes || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pendentes Resolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                {stats?.resumo.pendentesResolvidos || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taxa de Resolução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {stats?.resumo.taxaResolucao || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução Temporal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Evolução Temporal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {evolucaoData && <Line data={evolucaoData} options={chartOptions} />}
              </div>
            </CardContent>
          </Card>

          {/* Tipos de Relatórios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Tipos de Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {tiposRelatoriosData && <Pie data={tiposRelatoriosData} options={chartOptions} />}
              </div>
            </CardContent>
          </Card>

          {/* Visitas por Loja */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top 10 Lojas Mais Visitadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {visitasPorLojaData && <Bar data={visitasPorLojaData} options={chartOptions} />}
              </div>
            </CardContent>
          </Card>

          {/* Pendentes por Loja */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top 10 Lojas com Mais Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pendentesPorLojaData && <Bar data={pendentesPorLojaData} options={chartOptions} />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Lojas Visitadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top 5 Lojas Mais Visitadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.rankings.topLojasVisitadas.map((loja, index) => (
                  <div key={loja.lojaId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-900' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-blue-100 text-blue-900'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{loja.lojaNome}</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {loja.visitas} visitas
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Lojas com Pendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Top 5 Lojas com Mais Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.rankings.topLojasPendentes.map((loja, index) => (
                  <div key={loja.lojaId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-red-100 text-red-900">
                        {index + 1}
                      </div>
                      <span className="font-medium">{loja.lojaNome}</span>
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      {loja.pendentesPendentes} pendentes
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
