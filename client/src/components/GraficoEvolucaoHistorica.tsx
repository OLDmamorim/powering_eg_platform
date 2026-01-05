import { useMemo } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, TrendingUp, Target, BarChart3 } from 'lucide-react';
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

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function GraficoEvolucaoHistorica() {
  // Query para evolução global
  const { data: evolucao, isLoading } = trpc.resultados.evolucaoGlobal.useQuery({
    mesesAtras: 12,
  });

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (!evolucao || evolucao.length === 0) return null;

    const labels = evolucao.map((e) => `${mesesNomes[e.mes - 1]} ${e.ano}`);
    const servicos = evolucao.map((e) => e.totalServicos);
    const objetivos = evolucao.map((e) => e.objetivoMensal);
    const desvios = evolucao.map((e) => e.desvioPercentualMes);

    return {
      labels,
      servicos,
      objetivos,
      desvios,
    };
  }, [evolucao]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    if (!evolucao || evolucao.length === 0) return null;

    const totalServicos = evolucao.reduce((acc, e) => acc + e.totalServicos, 0);
    const totalObjetivos = evolucao.reduce((acc, e) => acc + e.objetivoMensal, 0);
    const mediaDesvio = evolucao.reduce((acc, e) => acc + e.desvioPercentualMes, 0) / evolucao.length;
    const mediaTaxaReparacao = evolucao.reduce((acc, e) => acc + e.taxaReparacao, 0) / evolucao.length;

    // Calcular tendência (últimos 3 meses vs 3 meses anteriores)
    const ultimos3 = evolucao.slice(-3);
    const anteriores3 = evolucao.slice(-6, -3);
    
    let tendencia = 0;
    if (ultimos3.length > 0 && anteriores3.length > 0) {
      const mediaUltimos = ultimos3.reduce((acc, e) => acc + e.totalServicos, 0) / ultimos3.length;
      const mediaAnteriores = anteriores3.reduce((acc, e) => acc + e.totalServicos, 0) / anteriores3.length;
      tendencia = mediaAnteriores > 0 ? ((mediaUltimos - mediaAnteriores) / mediaAnteriores) * 100 : 0;
    }

    return {
      totalServicos,
      totalObjetivos,
      mediaDesvio,
      mediaTaxaReparacao,
      tendencia,
      mesesAnalisados: evolucao.length,
    };
  }, [evolucao]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || !estatisticas) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Histórica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Sem dados históricos disponíveis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução Histórica - Últimos {estatisticas.mesesAnalisados} Meses
        </CardTitle>
        <CardDescription>
          Comparação de serviços realizados vs objetivos ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Serviços</div>
            <div className="text-2xl font-bold text-blue-600">
              {estatisticas.totalServicos.toLocaleString()}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Objetivos</div>
            <div className="text-2xl font-bold text-green-600">
              {estatisticas.totalObjetivos.toLocaleString()}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${estatisticas.mediaDesvio >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
            <div className="text-sm text-muted-foreground">Desvio Médio</div>
            <div className={`text-2xl font-bold ${estatisticas.mediaDesvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {estatisticas.mediaDesvio >= 0 ? '+' : ''}{estatisticas.mediaDesvio.toFixed(1)}%
            </div>
          </div>
          <div className={`rounded-lg p-4 ${estatisticas.tendencia >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'}`}>
            <div className="text-sm text-muted-foreground">Tendência</div>
            <div className={`text-2xl font-bold ${estatisticas.tendencia >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {estatisticas.tendencia >= 0 ? '+' : ''}{estatisticas.tendencia.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">vs trimestre anterior</div>
          </div>
        </div>

        {/* Gráfico de Linha - Serviços vs Objetivos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Serviços vs Objetivos
          </h4>
          <div style={{ height: '300px' }}>
            <Line
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: 'Serviços Realizados',
                    data: chartData.servicos,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                  },
                  {
                    label: 'Objetivo Mensal',
                    data: chartData.objetivos,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `${context.dataset.label}: ${(context.parsed.y ?? 0).toLocaleString()}`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => value.toLocaleString(),
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráfico de Barras - Desvio Percentual */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Desvio vs Objetivo (%)
          </h4>
          <div style={{ height: '250px' }}>
            <Bar
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: 'Desvio %',
                    data: chartData.desvios,
                    backgroundColor: chartData.desvios.map((d) =>
                      d >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                    ),
                    borderColor: chartData.desvios.map((d) =>
                      d >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                    ),
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.parsed.y ?? 0;
                        return `Desvio: ${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => `${value ?? 0}%`,
                    },
                  },
                },
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Verde = Acima do objetivo | Vermelho = Abaixo do objetivo
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
