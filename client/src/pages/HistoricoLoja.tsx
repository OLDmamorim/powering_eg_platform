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
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PeriodoFiltro = 'mes_atual' | 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior';

type PeriodoComparacao = 'q1_ano_anterior_vs_atual' | 'q2_ano_anterior_vs_atual' | 'q3_ano_anterior_vs_atual' | 'q4_ano_anterior_vs_atual' | 's1_ano_anterior_vs_atual' | 's2_ano_anterior_vs_atual' | 'ano_completo';

export default function HistoricoLoja() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojaId, setLojaId] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_anterior');
  const [historyData, setHistoryData] = useState<any>(null);
  const [exportando, setExportando] = useState(false);
  const [modoComparacao, setModoComparacao] = useState(false);
  const [periodoComparacao, setPeriodoComparacao] = useState<PeriodoComparacao>('q4_ano_anterior_vs_atual');
  const [comparacaoData, setComparacaoData] = useState<any>(null);

  const { data: lojasGestor } = trpc.lojas.getByGestor.useQuery(undefined, { enabled: user?.role === 'gestor' });
  const { data: lojasAdmin } = trpc.lojas.list.useQuery(undefined, { enabled: user?.role === 'admin' });
  const lojas = user?.role === 'admin' ? lojasAdmin : lojasGestor;
  
  const generateHistoryMutation = trpc.lojaHistory.generate.useQuery(
    { lojaId: parseInt(lojaId), periodo },
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

    try {
      toast.info("🤖 A analisar histórico da loja com IA...");
      const result = await generateHistoryMutation.refetch();
      if (result.data) {
        setHistoryData(result.data);
        toast.success("Histórico gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar histórico:", error);
      toast.error("Erro ao gerar histórico. Tente novamente.");
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

  const periodoLabels: Record<PeriodoFiltro, string> = {
    mes_atual: 'Mês Atual',
    mes_anterior: 'Mês Anterior',
    trimestre_anterior: 'Trimestre Anterior',
    semestre_anterior: 'Semestre Anterior',
    ano_anterior: 'Ano Anterior',
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
      drawSectionHeader('📊 Métricas Gerais', COLORS.primary);
      
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
        drawColoredSection('🎯 Análise de Resultados', COLORS.indigoLight, COLORS.indigo, 50);
        
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
        const trendSymbol = historyData.analiseResultados.tendenciaServicos === 'subida' ? '↑' : 
                           historyData.analiseResultados.tendenciaServicos === 'descida' ? '↓' : '→';
        doc.text(`Tendência: ${trendSymbol} ${historyData.analiseResultados.tendenciaServicos}   |   Melhor: ${historyData.analiseResultados.melhorMes}   |   Pior: ${historyData.analiseResultados.piorMes}`, 20, yPos);
        
        yPos += 18;
      }

      // ========== ANÁLISE COMERCIAL ==========
      if (historyData.analiseComercial) {
        drawColoredSection('🛒 Análise Comercial (Vendas Complementares)', COLORS.emeraldLight, COLORS.emerald, 45);
        
        const comercialCardWidth = (pageWidth - 48) / 4;
        const comercialCardHeight = 20;
        
        const comercialMetrics = [
          { value: `€${historyData.analiseComercial.totalVendasComplementares}`, label: 'Total Vendas' },
          { value: `€${historyData.analiseComercial.mediaVendasMensal}`, label: 'Média Mensal' },
          { value: `€${historyData.analiseComercial.escovasTotal}`, label: 'Escovas' },
          { value: `€${historyData.analiseComercial.polimentoTotal}`, label: 'Polimento' },
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
        
        const trendSymbol = historyData.analiseComercial.tendenciaVendas === 'subida' ? '↑' : 
                           historyData.analiseComercial.tendenciaVendas === 'descida' ? '↓' : '→';
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`Tendência: ${trendSymbol} ${historyData.analiseComercial.tendenciaVendas}`, 20, yPos);
        
        yPos += 18;
      }

      // ========== RESUMO EXECUTIVO ==========
      if (historyData.resumoGeral) {
        checkPageSpace(50);
        drawColoredSection('📋 Resumo Executivo', COLORS.skyLight, COLORS.sky, 35);
        
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
        drawSectionHeader('⚠️ Alertas Operacionais', COLORS.danger);
        
        historyData.alertasOperacionais.forEach((alerta: any) => {
          checkPageSpace(25);
          const alertBgColor = alerta.urgencia === 'alta' ? COLORS.dangerLight : 
                              alerta.urgencia === 'média' ? COLORS.orangeLight : COLORS.warningLight;
          const alertBorderColor = alerta.urgencia === 'alta' ? COLORS.danger : 
                                   alerta.urgencia === 'média' ? COLORS.orange : COLORS.warning;
          
          doc.setFillColor(alertBgColor[0], alertBgColor[1], alertBgColor[2]);
          doc.roundedRect(14, yPos, pageWidth - 28, 18, 2, 2, 'F');
          doc.setDrawColor(alertBorderColor[0], alertBorderColor[1], alertBorderColor[2]);
          doc.setLineWidth(0.5);
          doc.roundedRect(14, yPos, pageWidth - 28, 18, 2, 2, 'S');
          
          // Tipo
          doc.setTextColor(alertBorderColor[0], alertBorderColor[1], alertBorderColor[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(alerta.tipo, 18, yPos + 6);
          
          // Descrição
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(8);
          const descLines = doc.splitTextToSize(alerta.descricao, pageWidth - 80);
          doc.text(descLines[0], 18, yPos + 13);
          
          // Badge de urgência
          doc.setFillColor(alertBorderColor[0], alertBorderColor[1], alertBorderColor[2]);
          doc.roundedRect(pageWidth - 40, yPos + 3, 22, 8, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(alerta.urgencia.toUpperCase(), pageWidth - 29, yPos + 8, { align: 'center' });
          
          yPos += 22;
        });
        yPos += 5;
      }

      // ========== PROBLEMAS IDENTIFICADOS ==========
      if (historyData.problemasRecorrentes && historyData.problemasRecorrentes.length > 0) {
        checkPageSpace(40);
        drawSectionHeader('🔍 Problemas Identificados', COLORS.warning);
        
        historyData.problemasRecorrentes.forEach((problema: any) => {
          checkPageSpace(25);
          const probBgColor = problema.gravidade === 'alta' ? COLORS.dangerLight : 
                             problema.gravidade === 'média' ? COLORS.orangeLight : COLORS.warningLight;
          const probBorderColor = problema.gravidade === 'alta' ? COLORS.danger : 
                                  problema.gravidade === 'média' ? COLORS.orange : COLORS.warning;
          
          doc.setFillColor(probBgColor[0], probBgColor[1], probBgColor[2]);
          doc.roundedRect(14, yPos, pageWidth - 28, 20, 2, 2, 'F');
          doc.setDrawColor(probBorderColor[0], probBorderColor[1], probBorderColor[2]);
          doc.setLineWidth(0.5);
          doc.roundedRect(14, yPos, pageWidth - 28, 20, 2, 2, 'S');
          
          // Problema
          doc.setTextColor(probBorderColor[0], probBorderColor[1], probBorderColor[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(problema.problema, 18, yPos + 7);
          
          // Categoria e frequência
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(7);
          doc.text(`Categoria: ${problema.categoria}  |  ${problema.frequencia}`, 18, yPos + 14);
          
          // Badge de gravidade
          doc.setFillColor(probBorderColor[0], probBorderColor[1], probBorderColor[2]);
          doc.roundedRect(pageWidth - 40, yPos + 5, 22, 8, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(problema.gravidade.toUpperCase(), pageWidth - 29, yPos + 10, { align: 'center' });
          
          yPos += 24;
        });
        yPos += 5;
      }

      // ========== PONTOS FORTES ==========
      if (historyData.pontosFortes && historyData.pontosFortes.length > 0) {
        checkPageSpace(40);
        drawColoredSection('✅ Pontos Fortes', COLORS.successLight, COLORS.success, Math.min(historyData.pontosFortes.length * 8 + 5, 60));
        
        doc.setFontSize(9);
        doc.setTextColor(COLORS.success[0] * 0.7, COLORS.success[1] * 0.7, COLORS.success[2] * 0.7);
        
        historyData.pontosFortes.slice(0, 8).forEach((ponto: string) => {
          checkPageSpace(10);
          const lines = doc.splitTextToSize(`✓ ${ponto}`, pageWidth - 48);
          doc.text(lines[0], 20, yPos);
          yPos += 7;
        });
        
        if (historyData.pontosFortes.length > 8) {
          doc.text(`... e mais ${historyData.pontosFortes.length - 8} pontos`, 20, yPos);
          yPos += 7;
        }
        yPos += 10;
      }

      // ========== TENDÊNCIAS ==========
      if (historyData.tendencias && historyData.tendencias.length > 0) {
        checkPageSpace(40);
        drawSectionHeader('📈 Tendências Identificadas', COLORS.primary);
        
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        
        historyData.tendencias.slice(0, 6).forEach((tendencia: string) => {
          checkPageSpace(10);
          const lines = doc.splitTextToSize(`→ ${tendencia}`, pageWidth - 38);
          doc.text(lines[0], 18, yPos);
          yPos += 7;
        });
        
        if (historyData.tendencias.length > 6) {
          doc.text(`... e mais ${historyData.tendencias.length - 6} tendências`, 18, yPos);
          yPos += 7;
        }
        yPos += 10;
      }

      // ========== RECOMENDAÇÕES PRIORITÁRIAS ==========
      if (historyData.recomendacoes && historyData.recomendacoes.length > 0) {
        checkPageSpace(50);
        drawColoredSection('💡 Recomendações Prioritárias', COLORS.purpleLight, COLORS.purple, Math.min(historyData.recomendacoes.length * 25 + 10, 100));
        
        const sortedRecs = [...historyData.recomendacoes].sort((a: any, b: any) => {
          const prioOrder: Record<string, number> = { alta: 0, média: 1, baixa: 2 };
          return (prioOrder[a.prioridade] || 2) - (prioOrder[b.prioridade] || 2);
        });
        
        sortedRecs.slice(0, 5).forEach((rec: any) => {
          checkPageSpace(28);
          
          // Card branco
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(20, yPos, pageWidth - 48, 22, 2, 2, 'F');
          doc.setDrawColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(20, yPos, pageWidth - 48, 22, 2, 2, 'S');
          
          // Badge de prioridade
          const prioBgColor = rec.prioridade === 'alta' ? COLORS.danger : 
                             rec.prioridade === 'média' ? COLORS.orange : COLORS.primary;
          doc.setFillColor(prioBgColor[0], prioBgColor[1], prioBgColor[2]);
          doc.roundedRect(24, yPos + 3, 18, 6, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.text(rec.prioridade.toUpperCase(), 33, yPos + 7, { align: 'center' });
          
          // Recomendação
          doc.setTextColor(COLORS.purple[0] * 0.7, COLORS.purple[1] * 0.7, COLORS.purple[2] * 0.7);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          const recLines = doc.splitTextToSize(rec.recomendacao, pageWidth - 100);
          doc.text(recLines[0], 46, yPos + 7);
          
          // Categoria badge
          doc.setFillColor(COLORS.purpleLight[0], COLORS.purpleLight[1], COLORS.purpleLight[2]);
          doc.roundedRect(pageWidth - 65, yPos + 2, 30, 6, 1, 1, 'F');
          doc.setTextColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.text(rec.categoria, pageWidth - 50, yPos + 6, { align: 'center' });
          
          // Justificativa
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(7);
          const justLines = doc.splitTextToSize(rec.justificativa, pageWidth - 58);
          doc.text(justLines[0], 24, yPos + 16);
          
          yPos += 26;
        });
        
        if (sortedRecs.length > 5) {
          doc.setFontSize(8);
          doc.setTextColor(COLORS.purple[0], COLORS.purple[1], COLORS.purple[2]);
          doc.text(`... e mais ${sortedRecs.length - 5} recomendações`, 24, yPos);
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
              {/* Período */}
              <div className="flex-1 min-w-[180px] space-y-2">
                <Label htmlFor="periodo">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Período
                </Label>
                <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
                  <SelectTrigger id="periodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                    <SelectItem value="trimestre_anterior">Trimestre Anterior</SelectItem>
                    <SelectItem value="semestre_anterior">Semestre Anterior</SelectItem>
                    <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                    <SelectItem value="mes_atual">Mês Atual (em curso)</SelectItem>
                  </SelectContent>
                </Select>
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
                  disabled={!lojaId || generateHistoryMutation.isFetching}
                  size="lg"
                >
                  {generateHistoryMutation.isFetching ? (
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
                      <p className="text-xs text-emerald-600">Escovas</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.polimentoTotal}</p>
                      <p className="text-xs text-emerald-600">Polimento</p>
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
