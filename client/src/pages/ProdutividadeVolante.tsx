import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Wrench, Package, Gauge, Briefcase, TrendingUp, Award, ArrowLeft } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Registar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ProdutividadeVolante() {
  // Ler token do URL
  const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') || '' : '';
  
  // Calcular períodos
  const hoje = new Date();
  const mesAtual = {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
    fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0],
  };
  const mesAnterior = {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0],
    fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0],
  };
  const trimestreAnterior = {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0],
    fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0],
  };
  
  const [periodo, setPeriodo] = useState<'mesAtual' | 'mesAnterior' | 'trimestreAnterior'>('mesAnterior');
  
  const periodos = {
    mesAtual,
    mesAnterior,
    trimestreAnterior,
  };
  
  const { inicio, fim } = periodos[periodo];
  
  // Queries
  const { data: totais, isLoading: loadingTotais } = trpc.portalVolante.getTotaisServicos.useQuery({
    token,
    dataInicio: inicio,
    dataFim: fim,
  });
  
  const { data: evolucao, isLoading: loadingEvolucao } = trpc.portalVolante.getEvolucaoServicos.useQuery({
    token,
    dataInicio: inicio,
    dataFim: fim,
  });
  
  const { data: ranking, isLoading: loadingRanking } = trpc.portalVolante.getRankingLojas.useQuery({
    token,
    dataInicio: inicio,
    dataFim: fim,
  });
  
  // Configuração do gráfico de evolução (linha)
  const evolucaoChartData = {
    labels: evolucao?.map((e: any) => new Date(e.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })) || [],
    datasets: [
      {
        label: 'Substituição Ligeiro',
        data: evolucao?.map((e: any) => e.substituicaoLigeiro) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Reparação',
        data: evolucao?.map((e: any) => e.reparacao) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Calibragem',
        data: evolucao?.map((e: any) => e.calibragem) || [],
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Outros',
        data: evolucao?.map((e: any) => e.outros) || [],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };
  
  const evolucaoChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Evolução de Serviços por Tipo',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };
  
  // Configuração do gráfico de ranking (barras horizontais)
  const rankingChartData = {
    labels: ranking?.map((r: any) => r.lojaNome) || [],
    datasets: [
      {
        label: 'Total de Serviços',
        data: ranking?.map((r: any) => r.totalServicos) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(132, 204, 22, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(244, 63, 94, 0.8)',
        ],
      },
    ],
  };
  
  const rankingChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Top 10 Lojas por Total de Serviços',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };
  
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="p-8 text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold">Token inválido</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.hash = `/portal-volante?token=${token}`}
              className="hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-600" />
                Minha Produtividade
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Acompanhe o seu desempenho e estatísticas de serviços
              </p>
            </div>
          </div>
          
          {/* Filtro de Período */}
          <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
            <SelectTrigger className="w-[220px] bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mesAtual">Mês Atual</SelectItem>
              <SelectItem value="mesAnterior">Mês Anterior</SelectItem>
              <SelectItem value="trimestreAnterior">Trimestre Anterior</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Cards de Totais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Substituição Ligeiro</p>
                <p className="text-3xl font-bold mt-2">
                  {loadingTotais ? '...' : totais?.totalSubstituicaoLigeiro || 0}
                </p>
              </div>
              <Wrench className="w-12 h-12 text-blue-200 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Reparação</p>
                <p className="text-3xl font-bold mt-2">
                  {loadingTotais ? '...' : totais?.totalReparacao || 0}
                </p>
              </div>
              <Package className="w-12 h-12 text-green-200 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Calibragem</p>
                <p className="text-3xl font-bold mt-2">
                  {loadingTotais ? '...' : totais?.totalCalibragem || 0}
                </p>
              </div>
              <Gauge className="w-12 h-12 text-orange-200 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Outros</p>
                <p className="text-3xl font-bold mt-2">
                  {loadingTotais ? '...' : totais?.totalOutros || 0}
                </p>
              </div>
              <Briefcase className="w-12 h-12 text-purple-200 opacity-80" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">Total Geral</p>
                <p className="text-3xl font-bold mt-2">
                  {loadingTotais ? '...' : totais?.totalGeral || 0}
                </p>
              </div>
              <Award className="w-12 h-12 text-pink-200 opacity-80" />
            </div>
          </Card>
        </div>
        
        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Evolução */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div style={{ height: '400px' }}>
              {loadingEvolucao ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">A carregar...</p>
                </div>
              ) : (
                <Line data={evolucaoChartData} options={evolucaoChartOptions} />
              )}
            </div>
          </Card>
          
          {/* Gráfico de Ranking */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div style={{ height: '400px' }}>
              {loadingRanking ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">A carregar...</p>
                </div>
              ) : (
                <Bar data={rankingChartData} options={rankingChartOptions} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
