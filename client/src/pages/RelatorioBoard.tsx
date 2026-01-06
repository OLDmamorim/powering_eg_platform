import { useState, useRef } from "react";
import { RelatorioIACategorias } from "@/components/RelatorioIACategorias";
import { HistoricoRelatoriosIA } from "@/components/HistoricoRelatoriosIA";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Store, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  Download,
  RefreshCw,
  Calendar,
  Sparkles,
  Building2,
  ClipboardList,
  AlertCircle,
  PieChart,
  Activity,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Bar, Line, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Streamdown } from "streamdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

type PeriodoFiltro = 'mes_atual' | 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior';

const periodoLabels: Record<PeriodoFiltro, string> = {
  mes_atual: 'Mês Atual',
  mes_anterior: 'Mês Anterior',
  trimestre_anterior: 'Trimestre Anterior',
  semestre_anterior: 'Semestre Anterior',
  ano_anterior: 'Ano Anterior',
};

export default function RelatorioBoard() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_atual');
  const [analiseIA, setAnaliseIA] = useState<string | null>(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [showRelatorioIA, setShowRelatorioIA] = useState(false);

  // Query para obter dados do relatório
  const { data: dadosRelatorio, isLoading, refetch } = trpc.relatorioBoard.gerarDados.useQuery(
    { periodo },
    { staleTime: 5 * 60 * 1000 } // 5 minutos
  );

  // Mutation para gerar análise IA
  const gerarAnaliseIAMutation = trpc.relatorioBoard.gerarAnaliseIA.useMutation({
    onSuccess: (data) => {
      setAnaliseIA(data.analise);
      setIsGeneratingIA(false);
      toast.success("Análise IA gerada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar análise IA");
      setIsGeneratingIA(false);
    },
  });

  const handleGerarAnaliseIA = () => {
    setIsGeneratingIA(true);
    gerarAnaliseIAMutation.mutate({ periodo });
  };

  const handleDownloadMarkdown = () => {
    if (!analiseIA) return;
    const blob = new Blob([analiseIA], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-board-${periodo}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório descarregado!");
  };

  const handleExportPDF = () => {
    if (!dadosRelatorio) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Título
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Board - PoweringEG', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Período
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${dadosRelatorio.periodo.label}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`${new Date(dadosRelatorio.periodo.dataInicio).toLocaleDateString('pt-PT')} - ${new Date(dadosRelatorio.periodo.dataFim).toLocaleDateString('pt-PT')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // KPIs Principais
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicadores Principais (KPIs)', 14, yPos);
      yPos += 8;

      const kpisData = [
        ['Lojas', kpis.totalLojas.toString()],
        ['Gestores', kpis.totalGestores.toString()],
        ['Relatórios', `${kpis.totalRelatoriosLivres + kpis.totalRelatoriosCompletos} (${kpis.totalRelatoriosLivres} livres + ${kpis.totalRelatoriosCompletos} completos)`],
        ['Pendentes', `${kpis.totalPendentes} (${kpis.pendentesResolvidos} resolvidos)`],
        ['Taxa de Resolução', `${kpis.taxaResolucaoPendentes}%`],
        ['Ocorrências', `${kpis.totalOcorrencias} (${kpis.ocorrenciasCriticas} críticas)`],
        ['Total Serviços', kpis.totalServicos.toString()],
        ['Média Cumprimento Objetivo', `${(kpis.mediaObjetivo * 100).toFixed(1)}%`],
        ['Taxa de Reparação Média', `${((kpis.mediaTaxaReparacao || 0) * 100).toFixed(1)}%`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Indicador', 'Valor']],
        body: kpisData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Análise por Gestor
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Análise por Gestor', 14, yPos);
      yPos += 8;

      const gestoresData = analiseGestores.slice(0, 10).map(g => [
        g.gestorNome || 'Desconhecido',
        g.totalLojas.toString(),
        (g.relatoriosLivres + g.relatoriosCompletos).toString(),
        g.pendentesAtivos.toString(),
        `${g.pontuacao}/100`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Gestor', 'Lojas', 'Relatórios', 'Pendentes', 'Score']],
        body: gestoresData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Análise de Resultados
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Análise de Resultados', 14, yPos);
      yPos += 8;

      const resultadosData = [
        ['Total Serviços', analiseResultados.totalServicos.toString()],
        ['Objetivo Total', analiseResultados.objetivoTotal.toString()],
        ['Desvio Médio', `${(analiseResultados.desvioMedio * 100).toFixed(1)}%`],
        ['Lojas Acima do Objetivo', analiseResultados.lojasAcimaObjetivo.toString()],
        ['Lojas Abaixo do Objetivo', analiseResultados.lojasAbaixoObjetivo.toString()],
        ['Taxa Reparação Média', `${((analiseResultados.mediaTaxaReparacao || 0) * 100).toFixed(1)}%`],
        ['Vendas Complementares', `€${(analiseResultados.vendasComplementaresTotal || 0).toFixed(2)}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: resultadosData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Top 5 Lojas
      if (analiseResultados.top5Lojas && analiseResultados.top5Lojas.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Top 5 Lojas (Melhor Performance)', 14, yPos);
        yPos += 6;
        doc.setTextColor(0, 0, 0);

        const top5Data = analiseResultados.top5Lojas.map((l, idx) => [
          (idx + 1).toString(),
          l.lojaNome,
          l.valor.toString(),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Pos.', 'Loja', 'Serviços']],
          body: top5Data,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Bottom 5 Lojas
      if (analiseResultados.bottom5Lojas && analiseResultados.bottom5Lojas.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text('Bottom 5 Lojas (Precisam Atenção)', 14, yPos);
        yPos += 6;
        doc.setTextColor(0, 0, 0);

        const bottom5Data = analiseResultados.bottom5Lojas.map((l, idx) => [
          (idx + 1).toString(),
          l.lojaNome,
          l.valor.toString(),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Pos.', 'Loja', 'Serviços']],
          body: bottom5Data,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Análise de Pendentes
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Análise de Pendentes', 14, yPos);
      yPos += 8;

      const pendentesData = [
        ['Pendentes Ativos', analisePendentes.totalAtivos.toString()],
        ['Pendentes Resolvidos', analisePendentes.totalResolvidos.toString()],
        ['Taxa de Resolução', `${analisePendentes.taxaResolucao}%`],
        ['Pendentes Antigos (>7 dias)', analisePendentes.pendentesAntigos.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: pendentesData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Pendentes por Loja (Top 10)
      if (analisePendentes.porLoja && analisePendentes.porLoja.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Pendentes por Loja (Top 10)', 14, yPos);
        yPos += 6;

        const pendentesLojaData = analisePendentes.porLoja.slice(0, 10).map(l => [
          l.lojaNome,
          l.count.toString(),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Loja', 'Pendentes']],
          body: pendentesLojaData,
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11] },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Análise de Ocorrências
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Análise de Ocorrências', 14, yPos);
      yPos += 8;

      const ocorrenciasData = [
        ['Total', analiseOcorrencias.totalOcorrencias.toString()],
        ['Críticas', analiseOcorrencias.porImpacto.critico.toString()],
        ['Alto Impacto', analiseOcorrencias.porImpacto.alto.toString()],
        ['Médio Impacto', analiseOcorrencias.porImpacto.medio.toString()],
        ['Baixo Impacto', analiseOcorrencias.porImpacto.baixo.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Tipo', 'Quantidade']],
        body: ocorrenciasData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 14, right: 14 },
      });

      // Rodapé em todas as páginas
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `PoweringEG Platform - Relatório Board - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Download
      const fileName = `RelatorioBoard_${periodoLabels[periodo]}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dadosRelatorio) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">
          Erro ao carregar dados do relatório
        </div>
      </DashboardLayout>
    );
  }

  const { kpis, analiseGestores, analiseCategorias, analiseOcorrencias, analiseResultados, analisePendentes, analiseRelatorios, evolucaoTemporal } = dadosRelatorio;

  // Dados para gráficos
  const chartColors = {
    primary: 'rgba(37, 99, 235, 0.8)',
    primaryLight: 'rgba(37, 99, 235, 0.2)',
    success: 'rgba(34, 197, 94, 0.8)',
    successLight: 'rgba(34, 197, 94, 0.2)',
    warning: 'rgba(245, 158, 11, 0.8)',
    warningLight: 'rgba(245, 158, 11, 0.2)',
    danger: 'rgba(239, 68, 68, 0.8)',
    dangerLight: 'rgba(239, 68, 68, 0.2)',
    purple: 'rgba(147, 51, 234, 0.8)',
    purpleLight: 'rgba(147, 51, 234, 0.2)',
    cyan: 'rgba(6, 182, 212, 0.8)',
    cyanLight: 'rgba(6, 182, 212, 0.2)',
  };

  // Gráfico de evolução temporal
  const evolucaoData = {
    labels: evolucaoTemporal.map(e => e.mes),
    datasets: [
      {
        label: 'Relatórios',
        data: evolucaoTemporal.map(e => e.relatorios),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primaryLight,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Pendentes',
        data: evolucaoTemporal.map(e => e.pendentes),
        borderColor: chartColors.warning,
        backgroundColor: chartColors.warningLight,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Gráfico de relatórios por gestor
  const relatoriosPorGestorData = {
    labels: analiseRelatorios.porGestor.slice(0, 8).map(g => (g.gestorNome || 'Desconhecido').split(' ')[0]),
    datasets: [
      {
        label: 'Livres',
        data: analiseRelatorios.porGestor.slice(0, 8).map(g => g.livres),
        backgroundColor: chartColors.primary,
      },
      {
        label: 'Completos',
        data: analiseRelatorios.porGestor.slice(0, 8).map(g => g.completos),
        backgroundColor: chartColors.success,
      },
    ],
  };

  // Gráfico de ocorrências por impacto
  const ocorrenciasImpactoData = {
    labels: ['Crítico', 'Alto', 'Médio', 'Baixo'],
    datasets: [{
      data: [
        analiseOcorrencias.porImpacto.critico,
        analiseOcorrencias.porImpacto.alto,
        analiseOcorrencias.porImpacto.medio,
        analiseOcorrencias.porImpacto.baixo,
      ],
      backgroundColor: [
        chartColors.danger,
        'rgba(249, 115, 22, 0.8)',
        chartColors.warning,
        chartColors.success,
      ],
      borderWidth: 2,
    }],
  };

  // Gráfico de categorias
  const categoriasData = {
    labels: analiseCategorias.slice(0, 6).map(c => c.categoria.length > 15 ? c.categoria.substring(0, 15) + '...' : c.categoria),
    datasets: [
      {
        label: 'A Acompanhar',
        data: analiseCategorias.slice(0, 6).map(c => c.acompanhar),
        backgroundColor: chartColors.primary,
      },
      {
        label: 'Em Tratamento',
        data: analiseCategorias.slice(0, 6).map(c => c.emTratamento),
        backgroundColor: chartColors.warning,
      },
      {
        label: 'Tratado',
        data: analiseCategorias.slice(0, 6).map(c => c.tratado),
        backgroundColor: chartColors.success,
      },
    ],
  };

  // Gráfico de pendentes por loja
  const pendentesPorLojaData = {
    labels: analisePendentes.porLoja.slice(0, 8).map(l => l.lojaNome.length > 12 ? l.lojaNome.substring(0, 12) + '...' : l.lojaNome),
    datasets: [{
      label: 'Pendentes',
      data: analisePendentes.porLoja.slice(0, 8).map(l => l.count),
      backgroundColor: chartColors.danger,
    }],
  };

  // Gráfico de performance dos gestores
  const performanceGestoresData = {
    labels: analiseGestores.slice(0, 6).map(g => (g.gestorNome || 'Desconhecido').split(' ')[0]),
    datasets: [{
      label: 'Score de Performance',
      data: analiseGestores.slice(0, 6).map(g => g.pontuacao),
      backgroundColor: analiseGestores.slice(0, 6).map(g => 
        g.pontuacao >= 70 ? chartColors.success :
        g.pontuacao >= 40 ? chartColors.warning :
        chartColors.danger
      ),
    }],
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={reportRef}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Relatório Board
            </h1>
            <p className="text-muted-foreground mt-1">
              Relatório executivo completo para apresentação à administração
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => setShowRelatorioIA(true)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Gerar Relatório IA para Board
            </Button>
          </div>
        </div>

        {/* Histórico de Relatórios IA */}
        <HistoricoRelatoriosIA />

        {/* Período Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Período: {dadosRelatorio.periodo.label}
                </span>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {new Date(dadosRelatorio.periodo.dataInicio).toLocaleDateString('pt-PT')} - {new Date(dadosRelatorio.periodo.dataFim).toLocaleDateString('pt-PT')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principais */}
        <Tabs defaultValue="resumo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
            <TabsTrigger value="resumo" className="gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="gestores" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Gestores</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Categorias</span>
            </TabsTrigger>
            <TabsTrigger value="ocorrencias" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Ocorrências</span>
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Pendentes</span>
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Análise IA</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumo Executivo */}
          <TabsContent value="resumo" className="space-y-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Lojas</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{kpis.totalLojas}</p>
                    </div>
                    <Store className="h-10 w-10 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Gestores</p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{kpis.totalGestores}</p>
                    </div>
                    <Users className="h-10 w-10 text-purple-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Relatórios</p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                        {kpis.totalRelatoriosLivres + kpis.totalRelatoriosCompletos}
                      </p>
                      <p className="text-xs text-green-600/70">{kpis.totalRelatoriosLivres} livres + {kpis.totalRelatoriosCompletos} completos</p>
                    </div>
                    <FileText className="h-10 w-10 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pendentes</p>
                      <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{kpis.totalPendentes}</p>
                      <p className="text-xs text-amber-600/70">{kpis.pendentesResolvidos} resolvidos</p>
                    </div>
                    <Clock className="h-10 w-10 text-amber-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Ocorrências</p>
                      <p className="text-3xl font-bold text-red-900 dark:text-red-100">{kpis.totalOcorrencias}</p>
                      <p className="text-xs text-red-600/70">{kpis.ocorrenciasCriticas} críticas</p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Indicadores de Performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Taxa de Resolução de Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={kpis.taxaResolucaoPendentes} className="h-3" />
                    </div>
                    <span className={`text-2xl font-bold ${kpis.taxaResolucaoPendentes >= 70 ? 'text-green-600' : kpis.taxaResolucaoPendentes >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {kpis.taxaResolucaoPendentes}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    Média Cumprimento Objetivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${(kpis.mediaObjetivo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(kpis.mediaObjetivo || 0) >= 0 ? '+' : ''}{(kpis.mediaObjetivo || 0).toFixed(1)}%
                    </span>
                    {(kpis.mediaObjetivo || 0) >= 0 ? (
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Taxa de Reparação Média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-600">
                      {((kpis.mediaTaxaReparacao || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Evolução */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Evolução Temporal (Últimos 6 Meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  <Line 
                    data={evolucaoData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                      },
                      scales: {
                        y: { beginAtZero: true },
                      },
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Gestores */}
          <TabsContent value="gestores" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Score de Performance por Gestor
                  </CardTitle>
                  <CardDescription>
                    Pontuação baseada em relatórios, pendentes resolvidos e atividade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={performanceGestoresData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 100 } },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Relatórios por Gestor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Relatórios por Gestor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={relatoriosPorGestorData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } },
                        scales: { 
                          x: { stacked: true },
                          y: { stacked: true, beginAtZero: true },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Gestores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Análise Detalhada por Gestor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Gestor</th>
                        <th className="text-center py-3 px-4 font-medium">Lojas</th>
                        <th className="text-center py-3 px-4 font-medium">Rel. Livres</th>
                        <th className="text-center py-3 px-4 font-medium">Rel. Completos</th>
                        <th className="text-center py-3 px-4 font-medium">Pend. Ativos</th>
                        <th className="text-center py-3 px-4 font-medium">Taxa Resolução</th>
                        <th className="text-center py-3 px-4 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analiseGestores.map((gestor, idx) => (
                        <tr key={gestor.gestorId} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                          <td className="py-3 px-4 font-medium">{gestor.gestorNome}</td>
                          <td className="text-center py-3 px-4">{gestor.totalLojas}</td>
                          <td className="text-center py-3 px-4">{gestor.relatoriosLivres}</td>
                          <td className="text-center py-3 px-4">{gestor.relatoriosCompletos}</td>
                          <td className="text-center py-3 px-4">
                            <Badge variant={gestor.pendentesAtivos > 5 ? 'destructive' : gestor.pendentesAtivos > 0 ? 'secondary' : 'outline'}>
                              {gestor.pendentesAtivos}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={gestor.taxaResolucao >= 70 ? 'text-green-600' : gestor.taxaResolucao >= 40 ? 'text-amber-600' : 'text-red-600'}>
                              {gestor.taxaResolucao}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge className={
                              gestor.pontuacao >= 70 ? 'bg-green-500' : 
                              gestor.pontuacao >= 40 ? 'bg-amber-500' : 
                              'bg-red-500'
                            }>
                              {gestor.pontuacao}/100
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Relatórios */}
          <TabsContent value="relatorios" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Relatórios Livres</p>
                      <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{analiseRelatorios.totalLivres}</p>
                    </div>
                    <FileText className="h-12 w-12 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Relatórios Completos</p>
                      <p className="text-4xl font-bold text-green-900 dark:text-green-100">{analiseRelatorios.totalCompletos}</p>
                    </div>
                    <ClipboardList className="h-12 w-12 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Lojas por Relatórios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Top 15 Lojas por Relatórios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analiseRelatorios.porLoja.slice(0, 15).map((loja, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-6 text-sm text-muted-foreground">{idx + 1}.</span>
                      <span className="flex-1 font-medium truncate">{loja.lojaNome}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {loja.livres} livres
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {loja.completos} completos
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Categorias */}
          <TabsContent value="categorias" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-purple-500" />
                  Distribuição por Categoria e Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '400px' }}>
                  <Bar 
                    data={categoriasData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top' } },
                      scales: { 
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Categorias */}
            <Card>
              <CardHeader>
                <CardTitle>Análise Detalhada por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Categoria</th>
                        <th className="text-center py-3 px-4 font-medium">Total</th>
                        <th className="text-center py-3 px-4 font-medium">A Acompanhar</th>
                        <th className="text-center py-3 px-4 font-medium">Em Tratamento</th>
                        <th className="text-center py-3 px-4 font-medium">Tratado</th>
                        <th className="text-center py-3 px-4 font-medium">Taxa Resolução</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analiseCategorias.map((cat, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                          <td className="py-3 px-4 font-medium">{cat.categoria}</td>
                          <td className="text-center py-3 px-4">{cat.total}</td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">{cat.acompanhar}</Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">{cat.emTratamento}</Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700">{cat.tratado}</Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={cat.taxaResolucao >= 70 ? 'text-green-600 font-medium' : cat.taxaResolucao >= 40 ? 'text-amber-600' : 'text-red-600'}>
                              {cat.taxaResolucao}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Ocorrências */}
          <TabsContent value="ocorrencias" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico de Ocorrências por Impacto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Ocorrências por Impacto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    <Doughnut 
                      data={ocorrenciasImpactoData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'right' } },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas de Ocorrências */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Estatísticas de Ocorrências
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Por Abrangência</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Nacional: {analiseOcorrencias.porAbrangencia.nacional}
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        Regional: {analiseOcorrencias.porAbrangencia.regional}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Zona: {analiseOcorrencias.porAbrangencia.zona}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Por Estado</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm">Reportado: {analiseOcorrencias.porEstado.reportado}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-sm">Em Análise: {analiseOcorrencias.porEstado.emAnalise}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm">Em Resolução: {analiseOcorrencias.porEstado.emResolucao}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm">Resolvido: {analiseOcorrencias.porEstado.resolvido}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Temas Mais Frequentes</p>
                    <div className="flex flex-wrap gap-2">
                      {analiseOcorrencias.temasMaisFrequentes.slice(0, 5).map((tema, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tema.tema} ({tema.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Pendentes */}
          <TabsContent value="pendentes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-amber-600">Ativos</p>
                    <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{analisePendentes.totalAtivos}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-600">Resolvidos</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{analisePendentes.totalResolvidos}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-600">Taxa Resolução</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analisePendentes.taxaResolucao}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-600">Antigos (&gt;7 dias)</p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-100">{analisePendentes.pendentesAntigos}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Pendentes por Loja */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-red-500" />
                  Pendentes por Loja (Top 8)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  <Bar 
                    data={pendentesPorLojaData}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true } },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Análise IA */}
          <TabsContent value="ia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Análise Inteligente com IA
                </CardTitle>
                <CardDescription>
                  Gere uma análise executiva completa com recomendações estratégicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!analiseIA && !isGeneratingIA && (
                  <div className="text-center py-12">
                    <Sparkles className="h-16 w-16 mx-auto text-purple-300 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Clique no botão abaixo para gerar uma análise executiva completa com IA
                    </p>
                    <Button onClick={handleGerarAnaliseIA} size="lg" className="gap-2">
                      <Sparkles className="h-5 w-5" />
                      Gerar Análise IA
                    </Button>
                  </div>
                )}

                {isGeneratingIA && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                    <p className="text-muted-foreground">A gerar análise executiva...</p>
                    <p className="text-xs text-muted-foreground">Isto pode demorar alguns segundos</p>
                  </div>
                )}

                {analiseIA && !isGeneratingIA && (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <Button onClick={handleDownloadMarkdown} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Descarregar Markdown
                      </Button>
                      <Button onClick={handleGerarAnaliseIA} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Regenerar
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert border rounded-lg p-6 bg-muted/30">
                      <Streamdown>{analiseIA}</Streamdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal de Relatório IA para Board */}
      <RelatorioIACategorias
        open={showRelatorioIA}
        onOpenChange={setShowRelatorioIA}
      />
    </DashboardLayout>
  );
}
