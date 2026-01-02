import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, AlertCircle, AlertTriangle } from "lucide-react";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DadosGraficos {
  distribuicaoStatus: Array<{
    categoria: string;
    acompanhar: number;
    emTratamento: number;
    tratado: number;
  }>;
  taxaResolucao: Array<{
    categoria: string;
    taxa: number;
  }>;
  topCategoriasCriticas: Array<{
    categoria: string;
    total: number;
  }>;
  // Dados de ocorrências estruturais
  ocorrenciasPorImpacto?: Array<{
    impacto: string;
    count: number;
  }>;
  ocorrenciasPorTema?: Array<{
    tema: string;
    count: number;
  }>;
}

interface GraficosRelatorioIAProps {
  dados: DadosGraficos;
}

export function GraficosRelatorioIA({ dados }: GraficosRelatorioIAProps) {
  // Gráfico 1: Distribuição de Status por Categoria (Barras Empilhadas)
  const dadosDistribuicao = {
    labels: dados.distribuicaoStatus.map(d => d.categoria),
    datasets: [
      {
        label: "Acompanhar",
        data: dados.distribuicaoStatus.map(d => d.acompanhar),
        backgroundColor: "rgba(59, 130, 246, 0.8)", // blue-500
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
      {
        label: "Em Tratamento",
        data: dados.distribuicaoStatus.map(d => d.emTratamento),
        backgroundColor: "rgba(245, 158, 11, 0.8)", // amber-500
        borderColor: "rgba(245, 158, 11, 1)",
        borderWidth: 1,
      },
      {
        label: "Tratado",
        data: dados.distribuicaoStatus.map(d => d.tratado),
        backgroundColor: "rgba(34, 197, 94, 0.8)", // green-500
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 1,
      },
    ],
  };

  const opcoesDistribuicao = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
  };

  // Gráfico 2: Taxa de Resolução por Categoria (Barras Horizontais)
  const dadosTaxaResolucao = {
    labels: dados.taxaResolucao.map(d => d.categoria),
    datasets: [
      {
        label: "Taxa de Resolução (%)",
        data: dados.taxaResolucao.map(d => d.taxa),
        backgroundColor: dados.taxaResolucao.map(d => 
          d.taxa >= 70 ? "rgba(34, 197, 94, 0.8)" : // verde se >= 70%
          d.taxa >= 40 ? "rgba(245, 158, 11, 0.8)" : // amarelo se >= 40%
          "rgba(239, 68, 68, 0.8)" // vermelho se < 40%
        ),
        borderColor: dados.taxaResolucao.map(d => 
          d.taxa >= 70 ? "rgba(34, 197, 94, 1)" :
          d.taxa >= 40 ? "rgba(245, 158, 11, 1)" :
          "rgba(239, 68, 68, 1)"
        ),
        borderWidth: 1,
      },
    ],
  };

  const opcoesTaxaResolucao = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  // Gráfico 3: Top 5 Categorias Críticas (Barras)
  const dadosTopCriticas = {
    labels: dados.topCategoriasCriticas.map(d => d.categoria),
    datasets: [
      {
        label: "Total de Pendentes",
        data: dados.topCategoriasCriticas.map(d => d.total),
        backgroundColor: "rgba(239, 68, 68, 0.8)", // red-500
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 1,
      },
    ],
  };

  const opcoesTopCriticas = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Gráfico 4: Ocorrências por Impacto (Doughnut)
  const impactoColors = {
    'Crítico': { bg: 'rgba(220, 38, 38, 0.8)', border: 'rgba(220, 38, 38, 1)' },
    'Alto': { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgba(249, 115, 22, 1)' },
    'Médio': { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(234, 179, 8, 1)' },
    'Baixo': { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgba(34, 197, 94, 1)' },
  };

  const dadosOcorrenciasImpacto = dados.ocorrenciasPorImpacto && dados.ocorrenciasPorImpacto.length > 0 ? {
    labels: dados.ocorrenciasPorImpacto.map(d => d.impacto),
    datasets: [
      {
        data: dados.ocorrenciasPorImpacto.map(d => d.count),
        backgroundColor: dados.ocorrenciasPorImpacto.map(d => 
          impactoColors[d.impacto as keyof typeof impactoColors]?.bg || 'rgba(156, 163, 175, 0.8)'
        ),
        borderColor: dados.ocorrenciasPorImpacto.map(d => 
          impactoColors[d.impacto as keyof typeof impactoColors]?.border || 'rgba(156, 163, 175, 1)'
        ),
        borderWidth: 2,
      },
    ],
  } : null;

  const opcoesOcorrenciasImpacto = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
    },
  };

  // Gráfico 5: Ocorrências por Tema (Barras Horizontais)
  const dadosOcorrenciasTema = dados.ocorrenciasPorTema && dados.ocorrenciasPorTema.length > 0 ? {
    labels: dados.ocorrenciasPorTema.map(d => d.tema),
    datasets: [
      {
        label: "Ocorrências",
        data: dados.ocorrenciasPorTema.map(d => d.count),
        backgroundColor: "rgba(147, 51, 234, 0.8)", // purple-600
        borderColor: "rgba(147, 51, 234, 1)",
        borderWidth: 1,
      },
    ],
  } : null;

  const opcoesOcorrenciasTema = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  const temOcorrencias = (dados.ocorrenciasPorImpacto && dados.ocorrenciasPorImpacto.length > 0) ||
                         (dados.ocorrenciasPorTema && dados.ocorrenciasPorTema.length > 0);

  return (
    <div className="space-y-6">
      {/* Seção de Ocorrências Estruturais (se houver dados) */}
      {temOcorrencias && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-5 w-5" />
            Ocorrências Estruturais
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gráfico: Ocorrências por Impacto */}
            {dadosOcorrenciasImpacto && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Ocorrências por Impacto
                  </CardTitle>
                  <CardDescription>
                    Distribuição das ocorrências por nível de impacto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ height: "250px" }}>
                    <Doughnut data={dadosOcorrenciasImpacto} options={opcoesOcorrenciasImpacto} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico: Ocorrências por Tema */}
            {dadosOcorrenciasTema && (
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Top Temas de Ocorrências
                  </CardTitle>
                  <CardDescription>
                    Temas mais frequentes nas ocorrências estruturais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ height: "250px" }}>
                    <Bar data={dadosOcorrenciasTema} options={opcoesOcorrenciasTema} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Separador visual se houver ocorrências */}
      {temOcorrencias && (
        <div className="flex items-center gap-2 text-lg font-semibold text-blue-600 dark:text-blue-400 pt-4 border-t">
          <BarChart3 className="h-5 w-5" />
          Relatórios por Categoria
        </div>
      )}

      {/* Gráfico 1: Distribuição de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição de Status por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <Bar data={dadosDistribuicao} options={opcoesDistribuicao} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico 2: Taxa de Resolução */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Taxa de Resolução por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <Bar data={dadosTaxaResolucao} options={opcoesTaxaResolucao} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico 3: Top 5 Categorias Críticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Top 5 Categorias Críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: "350px" }}>
            <Bar data={dadosTopCriticas} options={opcoesTopCriticas} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
