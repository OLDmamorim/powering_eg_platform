import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, AlertCircle } from "lucide-react";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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

  return (
    <div className="space-y-6">
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
