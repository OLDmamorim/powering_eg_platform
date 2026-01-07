import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Lightbulb, History, BarChart3, ShoppingCart, Clock, Target,
  AlertCircle, ArrowUp, ArrowDown, Minus, Calendar, Download, GitCompare
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import FiltroMesesCheckbox, { type MesSelecionado } from "@/components/FiltroMesesCheckbox";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

type PeriodoComparacao = 'q1_ano_anterior_vs_atual' | 'q2_ano_anterior_vs_atual' | 'q3_ano_anterior_vs_atual' | 'q4_ano_anterior_vs_atual' | 's1_ano_anterior_vs_atual' | 's2_ano_anterior_vs_atual' | 'ano_completo';

export default function HistoricoLoja() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojaId, setLojaId] = useState("");
  // Novo estado para múltiplos meses - por defeito o mês anterior
  const [mesesSelecionados, setMesesSelecionados] = useState<MesSelecionado[]>(() => {
    const hoje = new Date();
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return [{ mes: mesAnterior.getMonth() + 1, ano: mesAnterior.getFullYear() }];
  });
  const [historyData, setHistoryData] = useState<any>(null);
  const [exportando, setExportando] = useState(false);
  const [modoComparacao, setModoComparacao] = useState(false);
  const [periodoComparacao, setPeriodoComparacao] = useState<PeriodoComparacao>('q4_ano_anterior_vs_atual');
  const [comparacaoData, setComparacaoData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: lojasGestor } = trpc.lojas.getByGestor.useQuery(undefined, { enabled: user?.role === 'gestor' });
  const { data: lojasAdmin } = trpc.lojas.list.useQuery(undefined, { enabled: user?.role === 'admin' });
  const lojas = user?.role === 'admin' ? lojasAdmin : lojasGestor;
  
  // Nova query para múltiplos meses
  const generateHistoryMultiplosMesesQuery = trpc.lojaHistory.generateMultiplosMeses.useQuery(
    { lojaId: parseInt(lojaId), mesesSelecionados },
    { enabled: false }
  );

  

  if (!user || (user.role !== "gestor" && user.role !== "admin")) {
    setLocation("/dashboard");
    return null;
  }

  const handleGenerate = async () => {
    if (!lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }
    if (mesesSelecionados.length === 0) {
      toast.error("Por favor selecione pelo menos um mês");
      return;
    }

    try {
      setIsGenerating(true);
      toast.info("🤖 A analisar histórico da loja com IA...");
      const result = await generateHistoryMultiplosMesesQuery.refetch();
      if (result.data) {
        setHistoryData(result.data);
        toast.success("Histórico gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar histórico:", error);
      toast.error("Erro ao gerar histórico. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "alta": return "text-red-600 bg-red-50 border-red-200";
      case "média": return "text-orange-600 bg-orange-50 border-orange-200";
      case "baixa": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "text-red-600 bg-red-50";
      case "média": return "text-orange-600 bg-orange-50";
      case "baixa": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "subida": return <ArrowUp className="h-4 w-4 text-green-600" />;
      case "descida": return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };



  const comparacaoLabels: Record<PeriodoComparacao, string> = {
    'q1_ano_anterior_vs_atual': 'Q1 (Jan-Mar) Ano Anterior vs Atual',
    'q2_ano_anterior_vs_atual': 'Q2 (Abr-Jun) Ano Anterior vs Atual',
    'q3_ano_anterior_vs_atual': 'Q3 (Jul-Set) Ano Anterior vs Atual',
    'q4_ano_anterior_vs_atual': 'Q4 (Out-Dez) Ano Anterior vs Atual',
    's1_ano_anterior_vs_atual': '1º Semestre Ano Anterior vs Atual',
    's2_ano_anterior_vs_atual': '2º Semestre Ano Anterior vs Atual',
    'ano_completo': 'Ano Completo Anterior vs Atual',
  };

  // Query para comparação
  const comparacaoQuery = trpc.lojaHistory.comparar.useQuery(
    { lojaId: parseInt(lojaId), tipoComparacao: periodoComparacao },
    { enabled: false }
  );

  // Função para gerar comparação
  const handleGerarComparacao = async () => {
    if (!lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }

    try {
      toast.info("🤖 A gerar comparação entre períodos...");
      const result = await comparacaoQuery.refetch();
      if (result.data) {
        setComparacaoData(result.data as any);
        toast.success("Comparação gerada com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar comparação:", error);
      toast.error("Erro ao gerar comparação. Tente novamente.");
    }
  };

  // Função para exportar PDF - Layout profissional igual ao portal
  const exportarPDF = async () => {
    if (!historyData) {
      toast.error("Gere primeiro a análise para exportar");
      return;
    }

    setExportando(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 15;

      const lojaNome = lojas?.find((l: any) => l.id.toString() === lojaId)?.nome || 'Loja';

      // Cores do portal
      const COLORS = {
        primary: [59, 130, 246] as [number, number, number],
        primaryLight: [219, 234, 254] as [number, number, number],
        success: [34, 197, 94] as [number, number, number],
        successLight: [220, 252, 231] as [number, number, number],
        danger: [239, 68, 68] as [number, number, number],
        dangerLight: [254, 226, 226] as [number, number, number],
        warning: [245, 158, 11] as [number, number, number],
        warningLight: [254, 243, 199] as [number, number, number],
        purple: [139, 92, 246] as [number, number, number],
        purpleLight: [237, 233, 254] as [number, number, number],
        indigo: [99, 102, 241] as [number, number, number],
        indigoLight: [224, 231, 255] as [number, number, number],
        emerald: [16, 185, 129] as [number, number, number],
        emeraldLight: [209, 250, 229] as [number, number, number],
        orange: [249, 115, 22] as [number, number, number],
        orangeLight: [255, 237, 213] as [number, number, number],
        gray: [107, 114, 128] as [number, number, number],
        grayLight: [243, 244, 246] as [number, number, number],
        sky: [14, 165, 233] as [number, number, number],
        skyLight: [224, 242, 254] as [number, number, number],
      };

      // Função para verificar espaço na página
      const checkPageSpace = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Função para desenhar card de métrica (igual ao portal)
      const drawMetricCard = (x: number, y: number, width: number, height: number, value: string, label: string, bgColor: [number, number, number], textColor: [number, number, number]) => {
        // Fundo do card
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(x, y, width, height, 3, 3, 'F');
        // Borda
        doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, width, height, 3, 3, 'S');
        // Valor
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + width / 2, y + height / 2 - 2, { align: 'center' });
        // Label
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x + width / 2, y + height / 2 + 6, { align: 'center' });
      };

      // Função para desenhar cabeçalho de secção com ícone
      const drawSectionHeader = (title: string, bgColor: [number, number, number], textColor: [number, number, number] = [255, 255, 255]) => {
        checkPageSpace(20);
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(14, yPos, pageWidth - 28, 10, 2, 2, 'F');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 18, yPos + 7);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        yPos += 14;
      };

      // Função para desenhar secção com fundo colorido (igual ao portal)
      const drawColoredSection = (title: string, bgColor: [number, number, number], borderColor: [number, number, number], contentHeight: number) => {
        checkPageSpace(contentHeight + 25);
        // Fundo da secção
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(14, yPos, pageWidth - 28, contentHeight + 20, 4, 4, 'F');
        // Borda
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(14, yPos, pageWidth - 28, contentHeight + 20, 4, 4, 'S');
        // Título
        doc.setTextColor(borderColor[0] * 0.7, borderColor[1] * 0.7, borderColor[2] * 0.7);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, yPos + 10);
        doc.setFont('helvetica', 'normal');
        yPos += 18;
      };

      // ========== CABEÇALHO DO PDF ==========
      // Barra superior azul
      doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.rect(0, 0, pageWidth, 4, 'F');
      
      // Título principal
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`Histórico da Loja`, pageWidth / 2, 18, { align: 'center' });
      
      // Nome da loja
      doc.setFontSize(16);
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.text(lojaNome, pageWidth / 2, 27, { align: 'center' });
      
      // Período e data
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${historyData.periodoAnalisado}  •  Gerado em: ${new Date().toLocaleString('pt-PT')}`, pageWidth / 2, 34, { align: 'center' });
      
      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(14, 40, pageWidth - 14, 40);
      yPos = 48;

      // ========== MÉTRICAS GERAIS (6 cards coloridos) ==========
      drawSectionHeader('Métricas Gerais', COLORS.primary);
      
      const cardWidth = (pageWidth - 28 - 10) / 3; // 3 cards por linha
      const cardHeight = 22;
      const cardGap = 5;
      
      // Linha 1: 3 cards
      drawMetricCard(14, yPos, cardWidth, cardHeight, 
        (historyData.metricas?.totalRelatoriosLivres || 0).toString(), 
        'Relatórios Livres', COLORS.primaryLight, COLORS.primary);
      drawMetricCard(14 + cardWidth + cardGap, yPos, cardWidth, cardHeight, 
        (historyData.metricas?.totalRelatoriosCompletos || 0).toString(), 
        'Relatórios Completos', COLORS.purpleLight, COLORS.purple);
      drawMetricCard(14 + (cardWidth + cardGap) * 2, yPos, cardWidth, cardHeight, 
        (historyData.metricas?.totalPendentes || 0).toString(), 
        'Pendentes', COLORS.orangeLight, COLORS.orange);
      
      yPos += cardHeight + cardGap;
      
      // Linha 2: 3 cards
      drawMetricCard(14, yPos, cardWidth, cardHeight, 
        `${historyData.metricas?.taxaResolucao?.toFixed(0) || 0}%`, 
        'Taxa Resolução', COLORS.successLight, COLORS.success);
      drawMetricCard(14 + cardWidth + cardGap, yPos, cardWidth, cardHeight, 
        (historyData.metricas?.totalOcorrencias || 0).toString(), 
        'Ocorrências', COLORS.dangerLight, COLORS.danger);
      drawMetricCard(14 + (cardWidth + cardGap) * 2, yPos, cardWidth, cardHeight, 
        ((historyData.metricas?.totalRelatoriosLivres || 0) + (historyData.metricas?.totalRelatoriosCompletos || 0)).toString(), 
        'Total Visitas', COLORS.grayLight, COLORS.gray);
      
      yPos += cardHeight + 12;

      // ========== ANÁLISE DE RESULTADOS ==========
      if (historyData.analiseResultados) {
        drawColoredSection('Análise de Resultados', COLORS.indigoLight, COLORS.indigo, 50);
        
        const resultCardWidth = (pageWidth - 48) / 4;
        const resultCardHeight = 20;
        
        // 4 métricas em linha
        const resultMetrics = [
          { value: historyData.analiseResultados.totalServicos?.toString() || '0', label: 'Total Serviços' },
          { value: historyData.analiseResultados.objetivoTotal?.toString() || '0', label: 'Objetivo Total' },
          { value: `${historyData.analiseResultados.desvioMedio >= 0 ? '+' : ''}${historyData.analiseResultados.desvioMedio}%`, label: 'Desvio Médio' },
          { value: `${historyData.analiseResultados.taxaReparacaoMedia}%`, label: 'Taxa Reparação' },
        ];
        
        resultMetrics.forEach((metric, i) => {
          const x = 20 + i * (resultCardWidth + 4);
          // Card branco
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x, yPos, resultCardWidth, resultCardHeight, 2, 2, 'F');
          // Valor
          const valueColor = metric.label === 'Desvio Médio' 
            ? (historyData.analiseResultados.desvioMedio >= 0 ? COLORS.success : COLORS.danger)
            : COLORS.indigo;
          doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(metric.value, x + resultCardWidth / 2, yPos + 9, { align: 'center' });
          // Label
          doc.setTextColor(COLORS.indigo[0], COLORS.indigo[1], COLORS.indigo[2]);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(metric.label, x + resultCardWidth / 2, yPos + 16, { align: 'center' });
        });
        
        yPos += resultCardHeight + 6;
        
        // Tendência e meses
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const trendText = historyData.analiseResultados.tendenciaServicos === 'subida' ? 'em subida' : 
                           historyData.analiseResultados.tendenciaServicos === 'descida' ? 'em descida' : 'estavel';
        doc.text(`Tendencia: ${trendText}   |   Melhor: ${historyData.analiseResultados.melhorMes}   |   Pior: ${historyData.analiseResultados.piorMes}`, 20, yPos);
        
        yPos += 18;
        
        // ========== GRÁFICO DE EVOLUÇÃO DE SERVIÇOS ==========
        if (historyData.dadosMensais?.resultados && historyData.dadosMensais.resultados.length > 1) {
          checkPageSpace(90);
          drawSectionHeader('Evolução Mensal de Serviços', COLORS.indigo);
          
          const chartX = 20;
          const chartY = yPos;
          const chartWidth = pageWidth - 40;
          const chartHeight = 60;
          const data = historyData.dadosMensais.resultados;
          
          // Fundo do gráfico
          doc.setFillColor(250, 250, 255);
          doc.roundedRect(chartX - 5, chartY - 5, chartWidth + 10, chartHeight + 25, 3, 3, 'F');
          doc.setDrawColor(200, 200, 220);
          doc.setLineWidth(0.3);
          doc.roundedRect(chartX - 5, chartY - 5, chartWidth + 10, chartHeight + 25, 3, 3, 'S');
          
          // Calcular escalas
          const maxServicos = Math.max(...data.map((d: { servicos: number; objetivo: number }) => Math.max(d.servicos, d.objetivo)));
          const minServicos = 0;
          const range = maxServicos - minServicos || 1;
          
          // Desenhar linhas de grade horizontais
          doc.setDrawColor(230, 230, 240);
          doc.setLineWidth(0.2);
          for (let i = 0; i <= 4; i++) {
            const y = chartY + chartHeight - (i / 4) * chartHeight;
            doc.line(chartX, y, chartX + chartWidth, y);
            const value = Math.round(minServicos + (i / 4) * range);
            doc.setFontSize(6);
            doc.setTextColor(120, 120, 140);
            doc.text(value.toString(), chartX - 3, y + 1, { align: 'right' });
          }
          
          // Desenhar barras e linha
          const barWidth = (chartWidth - 20) / data.length;
          const barGap = 4;
          
          data.forEach((d: { mes: string; servicos: number; objetivo: number; taxaReparacao: number }, i: number) => {
            const x = chartX + 10 + i * barWidth;
            const servicosHeight = ((d.servicos - minServicos) / range) * chartHeight;
            const objetivoHeight = ((d.objetivo - minServicos) / range) * chartHeight;
            
            // Barra de serviços (azul)
            doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.rect(x + barGap/2, chartY + chartHeight - servicosHeight, (barWidth - barGap) * 0.45, servicosHeight, 'F');
            
            // Barra de objetivo (cinza)
            doc.setFillColor(180, 180, 200);
            doc.rect(x + barGap/2 + (barWidth - barGap) * 0.5, chartY + chartHeight - objetivoHeight, (barWidth - barGap) * 0.45, objetivoHeight, 'F');
            
            // Label do mês
            doc.setFontSize(6);
            doc.setTextColor(80, 80, 100);
            doc.text(d.mes, x + barWidth/2, chartY + chartHeight + 8, { align: 'center' });
          });
          
          // Legenda
          doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
          doc.rect(chartX + chartWidth - 70, chartY + chartHeight + 12, 8, 4, 'F');
          doc.setFontSize(6);
          doc.setTextColor(60, 60, 80);
          doc.text('Serviços', chartX + chartWidth - 60, chartY + chartHeight + 15);
          
          doc.setFillColor(180, 180, 200);
          doc.rect(chartX + chartWidth - 35, chartY + chartHeight + 12, 8, 4, 'F');
          doc.text('Objetivo', chartX + chartWidth - 25, chartY + chartHeight + 15);
          
          yPos = chartY + chartHeight + 28;
        }
      }

      // ========== ANÁLISE COMERCIAL ==========
      if (historyData.analiseComercial) {
        drawColoredSection('Análise Comercial (Vendas Complementares)', COLORS.emeraldLight, COLORS.emerald, 45);
        
        const comercialCardWidth = (pageWidth - 48) / 4;
        const comercialCardHeight = 20;
        
        const comercialMetrics = [
          { value: `€${historyData.analiseComercial.totalVendasComplementares}`, label: 'Total Vendas' },
          { value: `€${historyData.analiseComercial.mediaVendasMensal}`, label: 'Média Mensal' },
          { value: `€${historyData.analiseComercial.escovasTotal}`, label: `Escovas (${historyData.analiseComercial.escovasQtdTotal || 0} un.)` },
          { value: `€${historyData.analiseComercial.polimentoTotal}`, label: `Polimento (${historyData.analiseComercial.polimentoQtdTotal || 0} un.)` },
        ];
        
        comercialMetrics.forEach((metric, i) => {
          const x = 20 + i * (comercialCardWidth + 4);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x, yPos, comercialCardWidth, comercialCardHeight, 2, 2, 'F');
          doc.setTextColor(COLORS.emerald[0], COLORS.emerald[1], COLORS.emerald[2]);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(metric.value, x + comercialCardWidth / 2, yPos + 9, { align: 'center' });
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(metric.label, x + comercialCardWidth / 2, yPos + 16, { align: 'center' });
        });
        
        yPos += comercialCardHeight + 6;
        
        const trendTextComercial = historyData.analiseComercial.tendenciaVendas === 'subida' ? 'em subida' : 
                           historyData.analiseComercial.tendenciaVendas === 'descida' ? 'em descida' : 'estavel';
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`Tendencia: ${trendTextComercial}`, 20, yPos);
        
        yPos += 18;
        
        // ========== GRÁFICO DE EVOLUÇÃO DE VENDAS ==========
        if (historyData.dadosMensais?.vendas && historyData.dadosMensais.vendas.length > 0) {
          // Verificar se há algum mês com escovas abaixo de 7.5%
          const mesesComAlerta = historyData.dadosMensais.vendas.filter(
            (d: { escovasPercent?: number }) => d.escovasPercent !== undefined && d.escovasPercent < 7.5
          );
          const temAlerta = mesesComAlerta.length > 0;
          
          checkPageSpace(temAlerta ? 115 : 95);
          drawSectionHeader('Evolução Mensal de Vendas Complementares', COLORS.emerald);
          
          // Se há alerta, mostrar caixa de aviso primeiro
          if (temAlerta) {
            // Caixa de alerta vermelha
            doc.setFillColor(254, 226, 226);
            doc.roundedRect(14, yPos, pageWidth - 28, 18, 2, 2, 'F');
            doc.setDrawColor(239, 68, 68);
            doc.setLineWidth(0.5);
            doc.roundedRect(14, yPos, pageWidth - 28, 18, 2, 2, 'S');
            
            // Texto do alerta
            doc.setTextColor(185, 28, 28);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('ALERTA: % Escovas abaixo de 7.5% - Retira totalidade do premio do mes!', 20, yPos + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const mesesAlerta = mesesComAlerta.map((d: { mes: string; escovasPercent?: number }) => 
              `${d.mes}: ${d.escovasPercent?.toFixed(2) || 0}%`
            ).join(' | ');
            doc.text(`Meses afetados: ${mesesAlerta}`, 20, yPos + 14);
            
            yPos += 22;
          }
          
          const chartX = 20;
          const chartY = yPos;
          const chartWidth = pageWidth - 40;
          const chartHeight = 55;
          const data = historyData.dadosMensais.vendas;
          
          // Fundo do gráfico
          doc.setFillColor(245, 255, 250);
          doc.roundedRect(chartX - 5, chartY - 5, chartWidth + 10, chartHeight + 35, 3, 3, 'F');
          doc.setDrawColor(200, 230, 210);
          doc.setLineWidth(0.3);
          doc.roundedRect(chartX - 5, chartY - 5, chartWidth + 10, chartHeight + 35, 3, 3, 'S');
          
          // Calcular escalas
          const maxVendas = Math.max(...data.map((d: { total: number }) => d.total));
          const minVendas = 0;
          const range = maxVendas - minVendas || 1;
          
          // Desenhar linhas de grade horizontais
          doc.setDrawColor(220, 240, 225);
          doc.setLineWidth(0.2);
          for (let i = 0; i <= 4; i++) {
            const y = chartY + chartHeight - (i / 4) * chartHeight;
            doc.line(chartX, y, chartX + chartWidth, y);
            const value = Math.round(minVendas + (i / 4) * range);
            doc.setFontSize(6);
            doc.setTextColor(100, 140, 110);
            doc.text(`EUR ${value}`, chartX - 3, y + 1, { align: 'right' });
          }
          
          // Desenhar barras empilhadas
          const barWidth = (chartWidth - 20) / data.length;
          const barGap = 6;
          
          data.forEach((d: { mes: string; total: number; escovas: number; escovasQtd?: number; polimento: number; polimentoQtd?: number; escovasPercent?: number }, i: number) => {
            const x = chartX + 10 + i * barWidth;
            const escovasHeight = ((d.escovas - minVendas) / range) * chartHeight;
            const polimentoHeight = ((d.polimento - minVendas) / range) * chartHeight;
            const escovasPercentValue = d.escovasPercent || 0;
            const escovasQtdValue = d.escovasQtd || 0;
            const isAbaixoLimite = escovasPercentValue < 7.5;
            
            // Barra de escovas (verde escuro, ou vermelho se abaixo do limite)
            if (isAbaixoLimite) {
              doc.setFillColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
            } else {
              doc.setFillColor(COLORS.emerald[0], COLORS.emerald[1], COLORS.emerald[2]);
            }
            doc.rect(x + barGap/2, chartY + chartHeight - escovasHeight - polimentoHeight, barWidth - barGap, escovasHeight, 'F');
            
            // Barra de polimento (verde claro)
            doc.setFillColor(134, 239, 172);
            doc.rect(x + barGap/2, chartY + chartHeight - polimentoHeight, barWidth - barGap, polimentoHeight, 'F');
            
            // Label do mês
            doc.setFontSize(6);
            doc.setTextColor(60, 100, 70);
            doc.text(d.mes, x + barWidth/2, chartY + chartHeight + 8, { align: 'center' });
            
            // Mostrar % escovas e quantidade abaixo da barra com destaque se abaixo de 7.5%
            doc.setFontSize(5);
            if (isAbaixoLimite) {
              doc.setTextColor(185, 28, 28);
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setTextColor(40, 80, 50);
              doc.setFont('helvetica', 'normal');
            }
            doc.text(`${escovasPercentValue.toFixed(1)}%`, x + barWidth/2, chartY + chartHeight + 14, { align: 'center' });
            // Mostrar quantidade de escovas
            doc.setTextColor(60, 100, 70);
            doc.setFont('helvetica', 'normal');
            doc.text(`(${escovasQtdValue} un.)`, x + barWidth/2, chartY + chartHeight + 19, { align: 'center' });
          });
          
          // Legenda
          doc.setFillColor(COLORS.emerald[0], COLORS.emerald[1], COLORS.emerald[2]);
          doc.rect(chartX + chartWidth - 90, chartY + chartHeight + 26, 8, 4, 'F');
          doc.setFontSize(6);
          doc.setTextColor(40, 80, 50);
          doc.text('Escovas', chartX + chartWidth - 80, chartY + chartHeight + 29);
          
          doc.setFillColor(134, 239, 172);
          doc.rect(chartX + chartWidth - 55, chartY + chartHeight + 26, 8, 4, 'F');
          doc.text('Polimento', chartX + chartWidth - 45, chartY + chartHeight + 29);
          
          // Linha de referência 7.5%
          doc.setFillColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
          doc.rect(chartX + chartWidth - 20, chartY + chartHeight + 26, 8, 4, 'F');
          doc.setTextColor(185, 28, 28);
          doc.text('<7.5%', chartX + chartWidth - 10, chartY + chartHeight + 29);
          
          yPos = chartY + chartHeight + 44;
        }
      }

      // ========== GRÁFICO DE EVOLUÇÃO DE TAXA DE REPARAÇÃO ==========
      if (historyData.dadosMensais?.resultados && historyData.dadosMensais.resultados.length > 1) {
        checkPageSpace(90);
        drawSectionHeader('Evolução Mensal de Taxa de Reparação', COLORS.purple);
        
        const chartX = 20;
        const chartY = yPos;
        const chartWidth = pageWidth - 40;
        const chartHeight = 55;
        const data = historyData.dadosMensais.resultados;
        
        // Fundo do gráfico
        doc.setFillColor(250, 245, 255);
        doc.roundedRect(chartX - 5, chartY - 5, chartWidth + 10, chartHeight + 25, 3, 3, 'F');
        doc.setDrawColor(200, 180, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(chartX - 5, chartY - 5, chartWidth + 10, chartHeight + 25, 3, 3, 'S');
        
        // Calcular escalas
        const maxTaxa = Math.max(...data.map((d: { taxaReparacao: number }) => d.taxaReparacao), 100);
        const minTaxa = 0;
        const range = maxTaxa - minTaxa || 1;
        
        // Desenhar linhas de grade horizontais
        doc.setDrawColor(230, 220, 240);
        doc.setLineWidth(0.2);
        for (let i = 0; i <= 4; i++) {
          const y = chartY + chartHeight - (i / 4) * chartHeight;
          doc.line(chartX, y, chartX + chartWidth, y);
          const value = Math.round(minTaxa + (i / 4) * range);
          doc.setFontSize(6);
          doc.setTextColor(120, 100, 140);
          doc.text(`${value}%`, chartX - 3, y + 1, { align: 'right' });
        }
        
        // Desenhar barras
        const barWidth = (chartWidth - 20) / data.length;
        const barGap = 4;
        
        data.forEach((d: { mes: string; taxaReparacao: number }, i: number) => {
          const x = chartX + 10 + i * barWidth;
          const taxaHeight = ((d.taxaReparacao - minTaxa) / range) * chartHeight;
          
          // Barra de taxa de reparação (roxo)
          doc.setFillColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.rect(x + barGap/2, chartY + chartHeight - taxaHeight, barWidth - barGap, taxaHeight, 'F');
          
          // Label do mês
          doc.setFontSize(6);
          doc.setTextColor(80, 60, 100);
          doc.text(d.mes, x + barWidth/2, chartY + chartHeight + 8, { align: 'center' });
          
          // Valor da taxa acima da barra
          doc.setFontSize(5);
          doc.setTextColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.text(`${d.taxaReparacao}%`, x + barWidth/2, chartY + chartHeight - taxaHeight - 2, { align: 'center' });
        });
        
        // Legenda
        doc.setFillColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
        doc.rect(chartX + chartWidth - 55, chartY + chartHeight + 12, 8, 4, 'F');
        doc.setFontSize(6);
        doc.setTextColor(80, 60, 100);
        doc.text('Taxa Reparacao', chartX + chartWidth - 45, chartY + chartHeight + 15);
        
        yPos = chartY + chartHeight + 28;
      }

      // ========== RESUMO EXECUTIVO ==========
      if (historyData.resumoGeral) {
        checkPageSpace(50);
        drawColoredSection('Resumo Executivo', COLORS.skyLight, COLORS.sky, 35);
        
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const resumoLines = doc.splitTextToSize(historyData.resumoGeral, pageWidth - 48);
        const maxLines = Math.min(resumoLines.length, 6);
        for (let i = 0; i < maxLines; i++) {
          doc.text(resumoLines[i], 20, yPos + i * 5);
        }
        if (resumoLines.length > 6) {
          doc.text('...', 20, yPos + 30);
        }
        yPos += Math.min(resumoLines.length * 5, 35) + 15;
      }

      // ========== ALERTAS OPERACIONAIS ==========
      if (historyData.alertasOperacionais && historyData.alertasOperacionais.length > 0) {
        checkPageSpace(40);
        drawSectionHeader('Alertas Operacionais', COLORS.danger);
        
        historyData.alertasOperacionais.forEach((alerta: any) => {
          // Calcular altura necessária para o texto
          doc.setFontSize(8);
          const descLines = doc.splitTextToSize(alerta.descricao, pageWidth - 50);
          const cardHeight = Math.max(24, 14 + descLines.length * 5);
          
          checkPageSpace(cardHeight + 5);
          const alertBgColor = alerta.urgencia === 'alta' ? COLORS.dangerLight : 
                              alerta.urgencia === 'média' ? COLORS.orangeLight : COLORS.warningLight;
          const alertBorderColor = alerta.urgencia === 'alta' ? COLORS.danger : 
                                   alerta.urgencia === 'média' ? COLORS.orange : COLORS.warning;
          
          doc.setFillColor(alertBgColor[0], alertBgColor[1], alertBgColor[2]);
          doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'F');
          doc.setDrawColor(alertBorderColor[0], alertBorderColor[1], alertBorderColor[2]);
          doc.setLineWidth(0.5);
          doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'S');
          
          // Tipo
          doc.setTextColor(alertBorderColor[0], alertBorderColor[1], alertBorderColor[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(alerta.tipo, 18, yPos + 7);
          
          // Badge de urgência (ao lado do título)
          doc.setFillColor(alertBorderColor[0], alertBorderColor[1], alertBorderColor[2]);
          doc.roundedRect(pageWidth - 40, yPos + 3, 22, 8, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(alerta.urgencia.toUpperCase(), pageWidth - 29, yPos + 8, { align: 'center' });
          
          // Descrição (texto completo com word wrap)
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(8);
          descLines.forEach((line: string, idx: number) => {
            doc.text(line, 18, yPos + 14 + idx * 5);
          });
          
          yPos += cardHeight + 4;
        });
        yPos += 5;
      }

      // ========== PROBLEMAS IDENTIFICADOS ==========
      if (historyData.problemasRecorrentes && historyData.problemasRecorrentes.length > 0) {
        checkPageSpace(40);
        drawSectionHeader('Problemas Identificados', COLORS.warning);
        
        historyData.problemasRecorrentes.forEach((problema: any) => {
          // Calcular altura necessária para o texto do problema
          doc.setFontSize(9);
          const probLines = doc.splitTextToSize(problema.problema, pageWidth - 70);
          const cardHeight = Math.max(22, 10 + probLines.length * 5 + 8);
          
          checkPageSpace(cardHeight + 5);
          const probBgColor = problema.gravidade === 'alta' ? COLORS.dangerLight : 
                             problema.gravidade === 'média' ? COLORS.orangeLight : COLORS.warningLight;
          const probBorderColor = problema.gravidade === 'alta' ? COLORS.danger : 
                                  problema.gravidade === 'média' ? COLORS.orange : COLORS.warning;
          
          doc.setFillColor(probBgColor[0], probBgColor[1], probBgColor[2]);
          doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'F');
          doc.setDrawColor(probBorderColor[0], probBorderColor[1], probBorderColor[2]);
          doc.setLineWidth(0.5);
          doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'S');
          
          // Problema (texto completo com word wrap)
          doc.setTextColor(probBorderColor[0], probBorderColor[1], probBorderColor[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          probLines.forEach((line: string, idx: number) => {
            doc.text(line, 18, yPos + 7 + idx * 5);
          });
          
          // Categoria e frequência
          const infoYPos = yPos + 7 + probLines.length * 5 + 2;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(7);
          doc.text(`Categoria: ${problema.categoria}  |  ${problema.frequencia}`, 18, infoYPos);
          
          // Badge de gravidade
          doc.setFillColor(probBorderColor[0], probBorderColor[1], probBorderColor[2]);
          doc.roundedRect(pageWidth - 40, yPos + 5, 22, 8, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(problema.gravidade.toUpperCase(), pageWidth - 29, yPos + 10, { align: 'center' });
          
          yPos += cardHeight + 4;
        });
        yPos += 5;
      }

      // ========== PONTOS FORTES ==========
      if (historyData.pontosFortes && historyData.pontosFortes.length > 0) {
        checkPageSpace(40);
        drawSectionHeader('Pontos Fortes', COLORS.success);
        
        doc.setFontSize(9);
        doc.setTextColor(COLORS.success[0] * 0.7, COLORS.success[1] * 0.7, COLORS.success[2] * 0.7);
        
        historyData.pontosFortes.slice(0, 8).forEach((ponto: string) => {
          const lines = doc.splitTextToSize(`• ${ponto}`, pageWidth - 40);
          const neededSpace = lines.length * 5 + 3;
          checkPageSpace(neededSpace);
          lines.forEach((line: string) => {
            doc.text(line, 18, yPos);
            yPos += 5;
          });
          yPos += 2;
        });
        
        if (historyData.pontosFortes.length > 8) {
          doc.text(`... e mais ${historyData.pontosFortes.length - 8} pontos`, 18, yPos);
          yPos += 7;
        }
        yPos += 8;
      }

      // ========== TENDÊNCIAS ==========
      if (historyData.tendencias && historyData.tendencias.length > 0) {
        checkPageSpace(40);
        drawSectionHeader('Tendências Identificadas', COLORS.primary);
        
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        
        historyData.tendencias.slice(0, 6).forEach((tendencia: string) => {
          const lines = doc.splitTextToSize(`- ${tendencia}`, pageWidth - 40);
          const neededSpace = lines.length * 5 + 3;
          checkPageSpace(neededSpace);
          lines.forEach((line: string) => {
            doc.text(line, 18, yPos);
            yPos += 5;
          });
          yPos += 2;
        });
        
        if (historyData.tendencias.length > 6) {
          doc.text(`... e mais ${historyData.tendencias.length - 6} tendências`, 18, yPos);
          yPos += 7;
        }
        yPos += 8;
      }

      // ========== RECOMENDAÇÕES PRIORITÁRIAS ==========
      if (historyData.recomendacoes && historyData.recomendacoes.length > 0) {
        checkPageSpace(50);
        drawSectionHeader('Recomendações Prioritárias', COLORS.purple);
        
        const sortedRecs = [...historyData.recomendacoes].sort((a: any, b: any) => {
          const prioOrder: Record<string, number> = { alta: 0, média: 1, baixa: 2 };
          return (prioOrder[a.prioridade] || 2) - (prioOrder[b.prioridade] || 2);
        });
        
        sortedRecs.slice(0, 5).forEach((rec: any) => {
          // Calcular altura necessária para recomendação e justificativa
          doc.setFontSize(8);
          const recLines = doc.splitTextToSize(rec.recomendacao, pageWidth - 60);
          doc.setFontSize(7);
          const justLines = doc.splitTextToSize(rec.justificativa, pageWidth - 50);
          const cardHeight = Math.max(28, 12 + recLines.length * 5 + justLines.length * 4 + 4);
          
          checkPageSpace(cardHeight + 5);
          
          // Card com fundo roxo claro
          doc.setFillColor(COLORS.purpleLight[0], COLORS.purpleLight[1], COLORS.purpleLight[2]);
          doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'F');
          doc.setDrawColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'S');
          
          // Badge de prioridade (canto superior esquerdo)
          const prioBgColor = rec.prioridade === 'alta' ? COLORS.danger : 
                             rec.prioridade === 'média' ? COLORS.orange : COLORS.primary;
          doc.setFillColor(prioBgColor[0], prioBgColor[1], prioBgColor[2]);
          doc.roundedRect(18, yPos + 4, 20, 7, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(rec.prioridade.toUpperCase(), 28, yPos + 9, { align: 'center' });
          
          // Categoria badge (canto superior direito)
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(pageWidth - 55, yPos + 4, 35, 7, 1, 1, 'F');
          doc.setTextColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text(rec.categoria, pageWidth - 37.5, yPos + 9, { align: 'center' });
          
          // Recomendação (texto completo com word wrap)
          doc.setTextColor(COLORS.purple[0] * 0.7, COLORS.purple[1] * 0.7, COLORS.purple[2] * 0.7);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          let textYPos = yPos + 16;
          recLines.forEach((line: string) => {
            doc.text(line, 18, textYPos);
            textYPos += 5;
          });
          
          // Justificativa (texto completo com word wrap)
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          textYPos += 2;
          justLines.forEach((line: string) => {
            doc.text(line, 18, textYPos);
            textYPos += 4;
          });
          
          yPos += cardHeight + 4;
        });
        
        if (sortedRecs.length > 5) {
          doc.setFontSize(8);
          doc.setTextColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.text(`... e mais ${sortedRecs.length - 5} recomendações`, 18, yPos);
          yPos += 10;
        }
      }

      // ========== RODAPÉ EM TODAS AS PÁGINAS ==========
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        // Texto do rodapé
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(`PoweringEG Platform  •  Histórico da Loja: ${lojaNome}`, 14, pageHeight - 8);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      // ========== GUARDAR PDF ==========
      const fileName = `Historico_${lojaNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportando(false);
    }
  };

  // Função para calcular variação percentual
  const calcVariacao = (atual: number, anterior: number): { valor: number; tipo: 'subida' | 'descida' | 'igual' } => {
    if (anterior === 0) return { valor: 0, tipo: 'igual' };
    const variacao = ((atual - anterior) / anterior) * 100;
    return {
      valor: Math.abs(variacao),
      tipo: variacao > 0 ? 'subida' : variacao < 0 ? 'descida' : 'igual'
    };
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Histórico da Loja
          </h1>
          <p className="text-muted-foreground">
            Análise inteligente completa: operacional, resultados, comercial e pendentes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Período - Novo filtro de meses com checkboxes */}
              <div className="flex-1 min-w-[220px] space-y-2">
                <Label>
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Período (selecione meses)
                </Label>
                <FiltroMesesCheckbox
                  mesesSelecionados={mesesSelecionados}
                  onMesesChange={setMesesSelecionados}
                  placeholder="Selecionar meses"
                />
              </div>

              {/* Loja */}
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId} onValueChange={setLojaId}>
                  <SelectTrigger id="loja">
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas?.map((loja: any) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão */}
              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!lojaId || mesesSelecionados.length === 0 || isGenerating}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Gerar Análise IA
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setModoComparacao(!modoComparacao)}
                  className={modoComparacao ? 'bg-blue-50 border-blue-300' : ''}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Comparar Períodos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel de Comparação */}
        {modoComparacao && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <GitCompare className="h-5 w-5" />
                Comparação Entre Períodos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label>Tipo de Comparação</Label>
                  <Select value={periodoComparacao} onValueChange={(v) => setPeriodoComparacao(v as PeriodoComparacao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="q1_ano_anterior_vs_atual">Q1 (Jan-Mar) Ano Anterior vs Atual</SelectItem>
                      <SelectItem value="q2_ano_anterior_vs_atual">Q2 (Abr-Jun) Ano Anterior vs Atual</SelectItem>
                      <SelectItem value="q3_ano_anterior_vs_atual">Q3 (Jul-Set) Ano Anterior vs Atual</SelectItem>
                      <SelectItem value="q4_ano_anterior_vs_atual">Q4 (Out-Dez) Ano Anterior vs Atual</SelectItem>
                      <SelectItem value="s1_ano_anterior_vs_atual">1º Semestre Ano Anterior vs Atual</SelectItem>
                      <SelectItem value="s2_ano_anterior_vs_atual">2º Semestre Ano Anterior vs Atual</SelectItem>
                      <SelectItem value="ano_completo">Ano Completo Anterior vs Atual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGerarComparacao}
                  disabled={!lojaId || comparacaoQuery.isFetching}
                >
                  {comparacaoQuery.isFetching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A comparar...
                    </>
                  ) : (
                    <>
                      <GitCompare className="h-4 w-4 mr-2" />
                      Gerar Comparação
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                💡 A comparação permite analisar a evolução da loja entre períodos equivalentes de anos diferentes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Resultados da Comparação */}
        {comparacaoData && modoComparacao && (
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <GitCompare className="h-5 w-5" />
                  Comparação: {comparacaoData.periodo1?.label} vs {comparacaoData.periodo2?.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{comparacaoData.lojaNome}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tabela Comparativa */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-indigo-200">
                      <th className="text-left py-2 px-3 font-semibold text-indigo-900">Indicador</th>
                      <th className="text-center py-2 px-3 font-semibold text-indigo-700">{comparacaoData.periodo1?.label}</th>
                      <th className="text-center py-2 px-3 font-semibold text-indigo-700">{comparacaoData.periodo2?.label}</th>
                      <th className="text-center py-2 px-3 font-semibold text-indigo-900">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-indigo-100 hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Total Visitas</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo1?.dados?.totalVisitas || 0}</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo2?.dados?.totalVisitas || 0}</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.visitas?.tipo === 'subida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.visitas?.tipo === 'descida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.visitas?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.visitas?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.visitas?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.visitas?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-indigo-100 hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Total Serviços</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo1?.dados?.totalServicos || 0}</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo2?.dados?.totalServicos || 0}</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.servicos?.tipo === 'subida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.servicos?.tipo === 'descida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.servicos?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.servicos?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.servicos?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.servicos?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-indigo-100 hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Desvio Médio</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo1?.dados?.desvioMedio || 0}%</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo2?.dados?.desvioMedio || 0}%</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.desvioMedio?.tipo === 'subida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.desvioMedio?.tipo === 'descida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.desvioMedio?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.desvioMedio?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.desvioMedio?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.desvioMedio?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-indigo-100 hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Taxa Reparação</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo1?.dados?.taxaReparacaoMedia || 0}%</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo2?.dados?.taxaReparacaoMedia || 0}%</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.taxaReparacao?.tipo === 'subida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.taxaReparacao?.tipo === 'descida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.taxaReparacao?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.taxaReparacao?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.taxaReparacao?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.taxaReparacao?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-indigo-100 hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Pendentes</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo1?.dados?.totalPendentes || 0}</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo2?.dados?.totalPendentes || 0}</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.pendentes?.tipo === 'descida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.pendentes?.tipo === 'subida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.pendentes?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.pendentes?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.pendentes?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.pendentes?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-indigo-100 hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Taxa Resolução</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo1?.dados?.taxaResolucao || 0}%</td>
                      <td className="text-center py-2 px-3">{comparacaoData.periodo2?.dados?.taxaResolucao || 0}%</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.taxaResolucao?.tipo === 'subida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.taxaResolucao?.tipo === 'descida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.taxaResolucao?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.taxaResolucao?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.taxaResolucao?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.taxaResolucao?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-indigo-50/50">
                      <td className="py-2 px-3 font-medium">Vendas Complementares</td>
                      <td className="text-center py-2 px-3">€{comparacaoData.periodo1?.dados?.totalVendasComplementares || 0}</td>
                      <td className="text-center py-2 px-3">€{comparacaoData.periodo2?.dados?.totalVendasComplementares || 0}</td>
                      <td className="text-center py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          comparacaoData.variacoes?.vendasComplementares?.tipo === 'subida' ? 'bg-green-100 text-green-700' :
                          comparacaoData.variacoes?.vendasComplementares?.tipo === 'descida' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comparacaoData.variacoes?.vendasComplementares?.tipo === 'subida' && <ArrowUp className="h-3 w-3" />}
                          {comparacaoData.variacoes?.vendasComplementares?.tipo === 'descida' && <ArrowDown className="h-3 w-3" />}
                          {comparacaoData.variacoes?.vendasComplementares?.percentual > 0 ? '+' : ''}{comparacaoData.variacoes?.vendasComplementares?.percentual || 0}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Análise IA */}
              {comparacaoData.analiseIA && (
                <div className="mt-6 p-4 bg-white rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Análise Comparativa IA
                  </h4>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {comparacaoData.analiseIA}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {historyData && (
          <div className="space-y-6">
            {/* Cabeçalho com período */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {lojas?.find((l: any) => l.id.toString() === lojaId)?.nome}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Período: {historyData.periodoAnalisado}
                </p>
              </div>
              <Button
                onClick={exportarPDF}
                disabled={exportando}
                variant="outline"
                className="gap-2"
              >
                {exportando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A exportar...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </>
                )}
              </Button>
            </div>

            {/* Métricas Resumidas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{historyData.metricas?.totalRelatoriosLivres || 0}</p>
                  <p className="text-xs text-blue-600">Rel. Livres</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{historyData.metricas?.totalRelatoriosCompletos || 0}</p>
                  <p className="text-xs text-purple-600">Rel. Completos</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{historyData.metricas?.totalPendentes || 0}</p>
                  <p className="text-xs text-orange-600">Pendentes</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{historyData.metricas?.taxaResolucao?.toFixed(0) || 0}%</p>
                  <p className="text-xs text-green-600">Taxa Resolução</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{historyData.metricas?.totalOcorrencias || 0}</p>
                  <p className="text-xs text-red-600">Ocorrências</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">
                    {(historyData.metricas?.totalRelatoriosLivres || 0) + (historyData.metricas?.totalRelatoriosCompletos || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Visitas</p>
                </CardContent>
              </Card>
            </div>

            {/* Análise de Resultados */}
            {historyData.analiseResultados && (
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Target className="h-5 w-5" />
                    Análise de Resultados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{historyData.analiseResultados.totalServicos}</p>
                      <p className="text-xs text-indigo-600">Total Serviços</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{historyData.analiseResultados.objetivoTotal}</p>
                      <p className="text-xs text-indigo-600">Objetivo Total</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className={`text-2xl font-bold ${historyData.analiseResultados.desvioMedio >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {historyData.analiseResultados.desvioMedio >= 0 ? '+' : ''}{historyData.analiseResultados.desvioMedio}%
                      </p>
                      <p className="text-xs text-indigo-600">Desvio Médio</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{historyData.analiseResultados.taxaReparacaoMedia}%</p>
                      <p className="text-xs text-indigo-600">Taxa Reparação</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tendência:</span>
                      {getTrendIcon(historyData.analiseResultados.tendenciaServicos)}
                      <span className="capitalize">{historyData.analiseResultados.tendenciaServicos}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Melhor: {historyData.analiseResultados.melhorMes} | Pior: {historyData.analiseResultados.piorMes}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de Taxa de Reparação */}
            {historyData.dadosMensais?.resultados && historyData.dadosMensais.resultados.length > 0 && (
              <Card className="border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <BarChart3 className="h-5 w-5" />
                    Evolução da Taxa de Reparação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData.dadosMensais.resultados}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          dataKey="mes" 
                          tick={{ fontSize: 12 }}
                          stroke="#6366f1"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          stroke="#6366f1"
                          domain={[0, 'auto']}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Taxa Reparação']}
                          contentStyle={{ backgroundColor: '#f8fafc', borderColor: '#6366f1' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="taxaReparacao" 
                          name="Taxa Reparação (%)"
                          stroke="#6366f1" 
                          strokeWidth={3}
                          dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                        />
                        <ReferenceLine 
                          y={22} 
                          stroke="#10b981" 
                          strokeDasharray="5 5" 
                          label={{ value: 'Objetivo 22%', position: 'right', fill: '#10b981', fontSize: 11 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    A linha verde tracejada indica o objetivo de 22% de taxa de reparação
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Análise Comercial */}
            {historyData.analiseComercial && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <ShoppingCart className="h-5 w-5" />
                    Análise Comercial (Vendas Complementares)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.totalVendasComplementares}</p>
                      <p className="text-xs text-emerald-600">Total Vendas</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.mediaVendasMensal}</p>
                      <p className="text-xs text-emerald-600">Média Mensal</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.escovasTotal}</p>
                      <p className="text-xs text-emerald-600 font-semibold">Escovas ({historyData.analiseComercial.escovasQtdTotal || 0} un.)</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.polimentoTotal}</p>
                      <p className="text-xs text-emerald-600">Polimento ({historyData.analiseComercial.polimentoQtdTotal || 0} un.)</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Tendência:</span>
                    {getTrendIcon(historyData.analiseComercial.tendenciaVendas)}
                    <span className="capitalize">{historyData.analiseComercial.tendenciaVendas}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de Vendas Complementares */}
            {historyData.dadosMensais?.vendas && historyData.dadosMensais.vendas.length > 0 && (
              <Card className="border-emerald-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <ShoppingCart className="h-5 w-5" />
                    Evolução das Vendas Complementares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Alerta de Escovas abaixo de 7.5% */}
                  {historyData.dadosMensais.vendas.some((v: any) => v.escovasPercent < 7.5) && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Alerta: % Escovas abaixo do objetivo</p>
                        <p className="text-xs text-red-600">
                          {historyData.dadosMensais.vendas.filter((v: any) => v.escovasPercent < 7.5).length} mês(es) com percentagem de escovas inferior a 7.5%
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyData.dadosMensais.vendas}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          dataKey="mes" 
                          tick={{ fontSize: 12 }}
                          stroke="#10b981"
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 12 }}
                          stroke="#10b981"
                          tickFormatter={(value) => `€${value}`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          stroke="#ef4444"
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 15]}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => {
                            if (name === '% Escovas') return [`${value}%`, name];
                            if (name === 'Escovas (€)') {
                              const qtd = props.payload?.escovasQtd || 0;
                              return [`€${value.toFixed(2)} (${qtd} un.)`, name];
                            }
                            if (name === 'Polimento (€)') {
                              const qtd = props.payload?.polimentoQtd || 0;
                              return [`€${value.toFixed(2)} (${qtd} un.)`, name];
                            }
                            return [`€${value.toFixed(2)}`, name];
                          }}
                          contentStyle={{ backgroundColor: '#f8fafc', borderColor: '#10b981' }}
                        />
                        <Legend />
                        <Bar 
                          yAxisId="left"
                          dataKey="escovas" 
                          name="Escovas (€)"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="polimento" 
                          name="Polimento (€)"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="escovasPercent" 
                          name="% Escovas"
                          stroke="#ef4444" 
                          strokeWidth={3}
                          dot={({ cx, cy, payload }: any) => {
                            const isBelow = payload.escovasPercent < 7.5;
                            return (
                              <circle 
                                cx={cx} 
                                cy={cy} 
                                r={isBelow ? 8 : 5} 
                                fill={isBelow ? '#ef4444' : '#f97316'}
                                stroke={isBelow ? '#dc2626' : '#ea580c'}
                                strokeWidth={2}
                              />
                            );
                          }}
                        />
                        <ReferenceLine 
                          yAxisId="right"
                          y={7.5} 
                          stroke="#ef4444" 
                          strokeDasharray="5 5" 
                          label={{ value: 'Objetivo 7.5%', position: 'right', fill: '#ef4444', fontSize: 11 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Abaixo de 7.5% (alerta)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Acima de 7.5% (OK)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumo Geral */}
            <Card className="border-sky-200 bg-sky-50/50">
              <CardHeader>
                <CardTitle className="text-sky-900">Resumo Executivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-sky-800">{historyData.resumoGeral}</p>
              </CardContent>
            </Card>

            {/* Alertas Operacionais */}
            {historyData.alertasOperacionais && historyData.alertasOperacionais.length > 0 && (
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertCircle className="h-5 w-5" />
                    Alertas Operacionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historyData.alertasOperacionais.map((alerta: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${getSeverityColor(alerta.urgencia)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold">{alerta.tipo}</h4>
                            <p className="text-sm mt-1">{alerta.descricao}</p>
                          </div>
                          <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                            {alerta.urgencia}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evolução */}
            {historyData.evolucao && historyData.evolucao.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Evolução ao Longo do Tempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historyData.evolucao.map((item: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-semibold text-blue-900">{item.periodo}</h4>
                        <p className="text-gray-700">{item.descricao}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Problemas Recorrentes */}
            {historyData.problemasRecorrentes && historyData.problemasRecorrentes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Problemas Identificados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historyData.problemasRecorrentes.map((item: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${getSeverityColor(item.gravidade)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{item.problema}</h4>
                              <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">{item.categoria}</span>
                            </div>
                            <p className="text-sm mt-1">{item.frequencia}</p>
                          </div>
                          <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                            {item.gravidade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pontos Fortes */}
            {historyData.pontosFortes && historyData.pontosFortes.length > 0 && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5" />
                    Pontos Fortes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {historyData.pontosFortes.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-green-800">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tendências */}
            {historyData.tendencias && historyData.tendencias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tendências Identificadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {historyData.tendencias.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-1">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recomendações */}
            {historyData.recomendacoes && historyData.recomendacoes.length > 0 && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Lightbulb className="h-5 w-5" />
                    Recomendações Prioritárias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historyData.recomendacoes
                      .sort((a: any, b: any) => {
                        const prioOrder = { alta: 0, média: 1, baixa: 2 };
                        return prioOrder[a.prioridade as keyof typeof prioOrder] - prioOrder[b.prioridade as keyof typeof prioOrder];
                      })
                      .map((item: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg border border-purple-200 bg-white">
                          <div className="flex items-start gap-3">
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${getPriorityColor(item.prioridade)}`}>
                              {item.prioridade}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-purple-900">{item.recomendacao}</h4>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 rounded">{item.categoria}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{item.justificativa}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!historyData && lojaId && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione o período e a loja, depois clique em "Gerar Análise IA" para ver o histórico completo</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
