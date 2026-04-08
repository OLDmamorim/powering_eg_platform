import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, Calendar, TrendingUp, TrendingDown, Users, CheckCircle, XCircle, BarChart3, PieChart, Activity, History, ArrowLeft } from "lucide-react";
import { HistoricoEnviosVolante } from "@/components/HistoricoEnviosVolante";
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
  // ✅ FIX: Inicializar token imediatamente da URL ou localStorage (sem esperar useEffect)
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      // 1. Tentar token da URL (?token=...)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) return urlToken;

      // 2. Tentar volanteAuth do localStorage
      try {
        const saved = localStorage.getItem("volanteAuth");
        if (saved) {
          const auth = JSON.parse(saved);
          if (auth.token) return auth.token;
        }
      } catch {}

      // 3. Fallback: loja_token
      return localStorage.getItem("loja_token") || '';
    }
    return '';
  });

  // ✅ FIX: Inicializar volanteNome do localStorage imediatamente
  const [volanteNome, setVolanteNome] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("volanteAuth");
        if (saved) {
          const auth = JSON.parse(saved);
          if (auth.volanteNome) return auth.volanteNome;
        }
      } catch {}
    }
    return '';
  });

  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("30");
  const [dataPersonalizadaInicio, setDataPersonalizadaInicio] = useState<string>("");
  const [dataPersonalizadaFim, setDataPersonalizadaFim] = useState<string>("");

  // Manter useEffect para atualizar nome se localStorage carregar depois
  useEffect(() => {
    if (!volanteNome) {
      const saved = localStorage.getItem("volanteAuth");
      if (saved) {
        try {
          const auth = JSON.parse(saved);
          if (auth.volanteNome) setVolanteNome(auth.volanteNome);
        } catch {}
      }
    }
  }, []);

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
      dataInicio: `${inicio.getFullYear()}-${String(inicio.getMonth()+1).padStart(2,'0')}-${String(inicio.getDate()).padStart(2,'0')}`,
      dataFim: `${fim.getFullYear()}-${String(fim.getMonth()+1).padStart(2,'0')}-${String(fim.getDate()).padStart(2,'0')}`,
    };
  }, [periodoSelecionado, dataPersonalizadaInicio, dataPersonalizadaFim]);

  // Buscar estatísticas avançadas (só quando tiver token)
  const { data: stats, isLoading } = trpc.dashboardVolante.estatisticasAvancadas.useQuery(
    { dataInicio, dataFim, token },
    { enabled: !!token }
  );

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

  const visitasPorLojaData = useMemo(() => {
    if (!stats?.graficos.visitasPorLoja) return null;

    const top10 = [...stats.graficos.visitasPorLoja].sort((a, b) => b.visitas - a.visitas).slice(0, 10);

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
      const result = await exportarPDFMutation.mutateAsync({ dataInicio, dataFim, token });

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

  // Sem token — redirecionar para o portal
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-blue-400" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-6">Sessão não encontrada. Por favor, aceda através do portal do volante.</p>
            <Button onClick={() => window.location.href = '/portal-loja'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ir para o Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">A carregar estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/portal-loja'}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard do Volante</h1>
            {volanteNome && <p className="text-sm text-muted-foreground">{volanteNome}</p>}
          </div>
        </div>
        <Button onClick={handleExportarPDF} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
                    <input type="date" value={dataPersonalizadaInicio} onChange={(e) => setDataPersonalizadaInicio(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <input type="date" value={dataPersonalizadaFim} onChange={(e) => setDataPersonalizadaFim(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Users className="h-4 w-4" />Total de Visitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats?.resumo.totalVisitas || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
                <XCircle className="h-4 w-4" />Pendentes em Aberto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{stats?.resumo.pendentesPendentes || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />Pendentes Resolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats?.resumo.pendentesResolvidos || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />Taxa de Resolução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats?.resumo.taxaResolucao || 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5" />Evolução Temporal</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">{evolucaoData && <Line data={evolucaoData} options={chartOptions} />}</div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PieChart className="h-5 w-5" />Tipos de Relatórios</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">{tiposRelatoriosData && <Pie data={tiposRelatoriosData} options={chartOptions} />}</div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5" />Top 10 Lojas Mais Visitadas</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">{visitasPorLojaData && <Bar data={visitasPorLojaData} options={chartOptions} />}</div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5" />Top 10 Lojas com Mais Pendentes</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">{pendentesPorLojaData && <Bar data={pendentesPorLojaData} options={chartOptions} />}</div></CardContent>
          </Card>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-green-600" />Top 5 Lojas Mais Visitadas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.rankings.topLojasVisitadas.map((loja, index) => (
                  <div key={loja.lojaId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-900' : index === 2 ? 'bg-amber-600 text-white' : 'bg-blue-100 text-blue-900'}`}>{index + 1}</div>
                      <span className="font-medium">{loja.lojaNome}</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">{loja.visitas} visitas</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingDown className="h-5 w-5 text-red-600" />Top 5 Lojas com Mais Pendentes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.rankings.topLojasPendentes.map((loja, index) => (
                  <div key={loja.lojaId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-red-100 text-red-900">{index + 1}</div>
                      <span className="font-medium">{loja.lojaNome}</span>
                    </div>
                    <div className="text-lg font-bold text-red-600">{loja.pendentesPendentes} pendentes</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Envios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5" />
              Histórico de Envios de Relatórios Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HistoricoEnviosVolante />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
