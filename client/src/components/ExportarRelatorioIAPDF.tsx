import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface AnaliseIA {
  resumo: string;
  pontosPositivos: string[];
  pontosNegativos: string[];
  sugestoes: string[];
  analisePontosDestacados?: {
    positivos: string[];
    negativos: string[];
    tendencias: string;
  };
  analiseResultados?: {
    resumoPerformance: string;
    lojasDestaque: string[];
    lojasAtencao: string[];
    tendenciasServicos: string;
    recomendacoes: string[];
  };
  comparacaoLojas?: {
    melhorLoja: { nome: string; servicos: number; desvio: number; objetivo?: number; taxaReparacao?: number } | null;
    piorLoja: { nome: string; servicos: number; desvio: number; objetivo?: number; taxaReparacao?: number } | null;
    maiorEvolucao: { nome: string; variacao: number } | null;
    menorEvolucao: { nome: string; variacao: number } | null;
    totalLojas: number;
    lojasAcimaMedia: number;
    lojasAbaixoMedia?: number;
    mediaTaxaReparacao?: number;
    mediaDesvio?: number;
    totalServicos?: number;
    totalObjetivo?: number;
    mediaVendasComplementares?: number;
  };
  dadosGraficos?: {
    rankingServicos: Array<{ 
      loja: string; 
      servicos: number; 
      desvio: number;
      objetivo?: number;
      taxaReparacao?: number;
      zona?: string | null;
      lojaId?: number;
    }>;
    evolucaoMensal: Array<{ mes: string; servicos: number; objetivo: number }>;
    distribuicaoDesvios?: Array<{ faixa: string; count: number }>;
  };
  insightsIA?: {
    resumoExecutivo?: string;
    analisePerformance?: string;
    tendenciasIdentificadas?: string;
    recomendacoesEstrategicas?: string[];
  };
  analiseZonasDetalhada?: Array<{
    zona: string;
    totalLojas: number;
    somaServicos: number;
    somaObjetivos: number;
    mediaDesvio: number;
    mediaTaxaReparacao: number;
    lojasAcimaObjetivo: number;
    taxaCumprimento: number;
    melhorLoja: string;
    melhorLojaDesvio: number;
    piorLoja: string;
    piorLojaDesvio: number;
  }>;
  rankingsDetalhados?: {
    cumprimentoObjetivo: {
      top5: Array<{ lojaNome: string; desvioPercentualMes: number; totalServicos: number; objetivoMensal: number; posicao?: number; taxaReparacao?: number; zona?: string | null }>;
      bottom5: Array<{ lojaNome: string; desvioPercentualMes: number; totalServicos: number; objetivoMensal: number; posicao?: number; taxaReparacao?: number; zona?: string | null }>;
    };
    taxaReparacao: {
      top5: Array<{ lojaNome: string; taxaReparacao: number; posicao?: number; qtdReparacoes?: number; qtdParaBrisas?: number; zona?: string | null }>;
      bottom5: Array<{ lojaNome: string; taxaReparacao: number; posicao?: number; qtdReparacoes?: number; qtdParaBrisas?: number; zona?: string | null }>;
    };
    vendasComplementares: {
      top5: Array<{ lojaNome: string; penetracaoEscovas?: number; escovasPercent?: number; totalVendas?: number; escovasVendas?: number; polimentoVendas?: number; posicao?: number }>;
      bottom5: Array<{ lojaNome: string; penetracaoEscovas?: number; escovasPercent?: number; totalVendas?: number; escovasVendas?: number; polimentoVendas?: number; posicao?: number }>;
    };
    crescimento: {
      top5: Array<{ lojaNome: string; crescimento: number; servicosAnterior: number; totalServicos: number; posicao?: number }>;
      bottom5: Array<{ lojaNome: string; crescimento: number; servicosAnterior: number; totalServicos: number; posicao?: number }>;
    };
  };
}

interface Props {
  analiseIA: AnaliseIA;
  periodo: string;
}

// Cores para o PDF
const COLORS = {
  primary: [147, 51, 234] as [number, number, number],      // Purple
  secondary: [59, 130, 246] as [number, number, number],    // Blue
  success: [34, 197, 94] as [number, number, number],       // Green
  danger: [239, 68, 68] as [number, number, number],        // Red
  warning: [245, 158, 11] as [number, number, number],      // Amber
  info: [6, 182, 212] as [number, number, number],          // Cyan
  muted: [100, 116, 139] as [number, number, number],       // Slate
  dark: [30, 41, 59] as [number, number, number],           // Dark
  light: [248, 250, 252] as [number, number, number],       // Light
};

export function ExportarRelatorioIAPDF({ analiseIA, periodo }: Props) {
  const [exportando, setExportando] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const barChartRef = useRef<any>(null);
  const doughnutChartRef = useRef<any>(null);

  const periodoLabels: Record<string, string> = {
    mes_anterior: 'Mês Anterior',
    mes_atual: 'Mês Atual',
    mensal: 'Mês Atual',
    trimestre_anterior: 'Trimestre Anterior',
    trimestral: 'Trimestre',
    semestre_anterior: 'Semestre Anterior',
    semestral: 'Semestre',
    ano_anterior: 'Ano Anterior',
    anual: 'Ano',
  };

  // Formatar percentagem
  const formatPercent = (value: number | undefined | null, multiplier: number = 100) => {
    if (value === undefined || value === null) return 'N/A';
    const val = value * multiplier;
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  // Desenhar caixa colorida com texto
  const drawColoredBox = (doc: jsPDF, x: number, y: number, width: number, height: number, color: [number, number, number], text: string, value: string, icon?: string) => {
    // Background
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Texto
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(text, x + 4, y + 8);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 4, y + 18);
    
    doc.setTextColor(0, 0, 0);
  };

  // Desenhar secção com cabeçalho colorido
  const drawSectionHeader = (doc: jsPDF, y: number, title: string, color: [number, number, number], pageWidth: number): number => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(14, y, pageWidth - 28, 10, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 18, y + 7);
    
    doc.setTextColor(0, 0, 0);
    return y + 14;
  };

  // Desenhar card de destaque
  const drawHighlightCard = (doc: jsPDF, x: number, y: number, width: number, title: string, name: string, metrics: { label: string; value: string }[], borderColor: [number, number, number]) => {
    // Border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, width, 35, 2, 2, 'S');
    
    // Header background
    doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(x, y, width, 8, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + 4, y + 6);
    
    // Name
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(name.length > 25 ? name.substring(0, 22) + '...' : name, x + 4, y + 16);
    
    // Metrics
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let metricY = y + 22;
    metrics.slice(0, 3).forEach((metric, idx) => {
      doc.setTextColor(100, 100, 100);
      doc.text(metric.label + ':', x + 4, metricY);
      doc.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(metric.value, x + 35, metricY);
      doc.setFont('helvetica', 'normal');
      metricY += 5;
    });
    
    doc.setTextColor(0, 0, 0);
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 15;

      // ==================== CAPA ====================
      // Fundo gradiente simulado
      doc.setFillColor(147, 51, 234);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório IA de Resultados', pageWidth / 2, 25, { align: 'center' });
      
      // Subtítulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${periodoLabels[periodo] || periodo}`, pageWidth / 2, 35, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, pageWidth / 2, 43, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      yPos = 60;

      // ==================== RESUMO EXECUTIVO ====================
      yPos = drawSectionHeader(doc, yPos, 'Resumo Executivo', COLORS.primary, pageWidth);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const resumoLines = doc.splitTextToSize(analiseIA.resumo, pageWidth - 28);
      doc.text(resumoLines, 14, yPos);
      yPos += resumoLines.length * 5 + 8;

      // ==================== KPIs PRINCIPAIS ====================
      if (analiseIA.comparacaoLojas) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        yPos = drawSectionHeader(doc, yPos, 'KPIs Principais', COLORS.secondary, pageWidth);
        
        const boxWidth = (pageWidth - 38) / 4;
        const boxHeight = 24;
        
        // Linha 1: 4 KPIs
        drawColoredBox(doc, 14, yPos, boxWidth, boxHeight, COLORS.muted, 
          'Lojas Analisadas', 
          analiseIA.comparacaoLojas.totalLojas.toString()
        );
        
        const taxaCumprimento = ((analiseIA.comparacaoLojas.lojasAcimaMedia / analiseIA.comparacaoLojas.totalLojas) * 100).toFixed(1);
        drawColoredBox(doc, 14 + boxWidth + 3, yPos, boxWidth, boxHeight, COLORS.secondary, 
          'Taxa Cumprimento', 
          `${taxaCumprimento}%`
        );
        
        drawColoredBox(doc, 14 + (boxWidth + 3) * 2, yPos, boxWidth, boxHeight, COLORS.success, 
          'Acima Objetivo', 
          analiseIA.comparacaoLojas.lojasAcimaMedia.toString()
        );
        
        const abaixoObjetivo = analiseIA.comparacaoLojas.lojasAbaixoMedia || 
          (analiseIA.comparacaoLojas.totalLojas - analiseIA.comparacaoLojas.lojasAcimaMedia);
        drawColoredBox(doc, 14 + (boxWidth + 3) * 3, yPos, boxWidth, boxHeight, COLORS.danger, 
          'Abaixo Objetivo', 
          abaixoObjetivo.toString()
        );
        
        yPos += boxHeight + 8;

        // Cards de Destaque: Melhor e Pior Loja
        if (analiseIA.comparacaoLojas.melhorLoja || analiseIA.comparacaoLojas.piorLoja) {
          const cardWidth = (pageWidth - 32) / 2;
          
          if (analiseIA.comparacaoLojas.melhorLoja) {
            drawHighlightCard(doc, 14, yPos, cardWidth, 'Líder de Performance', 
              analiseIA.comparacaoLojas.melhorLoja.nome,
              [
                { label: 'Serviços', value: analiseIA.comparacaoLojas.melhorLoja.servicos.toString() },
                { label: 'Desvio', value: formatPercent(analiseIA.comparacaoLojas.melhorLoja.desvio, 100) },
                { label: 'Taxa Rep.', value: analiseIA.comparacaoLojas.melhorLoja.taxaReparacao 
                  ? `${(analiseIA.comparacaoLojas.melhorLoja.taxaReparacao * 100).toFixed(2)}%` : 'N/A' }
              ],
              COLORS.success
            );
          }
          
          if (analiseIA.comparacaoLojas.piorLoja) {
            drawHighlightCard(doc, 14 + cardWidth + 4, yPos, cardWidth, 'Menor Performance', 
              analiseIA.comparacaoLojas.piorLoja.nome,
              [
                { label: 'Serviços', value: analiseIA.comparacaoLojas.piorLoja.servicos.toString() },
                { label: 'Desvio', value: formatPercent(analiseIA.comparacaoLojas.piorLoja.desvio, 100) },
                { label: 'Taxa Rep.', value: analiseIA.comparacaoLojas.piorLoja.taxaReparacao 
                  ? `${(analiseIA.comparacaoLojas.piorLoja.taxaReparacao * 100).toFixed(2)}%` : 'N/A' }
              ],
              COLORS.danger
            );
          }
          
          yPos += 42;
        }
      }

      // ==================== COMPARAÇÃO DE LOJAS (Tabela) ====================
      if (analiseIA.comparacaoLojas) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        yPos = drawSectionHeader(doc, yPos, 'Comparação de Lojas', COLORS.primary, pageWidth);

        const compData = [
          ['Melhor Loja', analiseIA.comparacaoLojas.melhorLoja?.nome || 'N/A', `${analiseIA.comparacaoLojas.melhorLoja?.servicos || 0} serviços`],
          ['Menos Serviços', analiseIA.comparacaoLojas.piorLoja?.nome || 'N/A', `${analiseIA.comparacaoLojas.piorLoja?.servicos || 0} serviços`],
          ['Maior Evolução', analiseIA.comparacaoLojas.maiorEvolucao?.nome || 'N/A', analiseIA.comparacaoLojas.maiorEvolucao?.variacao ? `+${analiseIA.comparacaoLojas.maiorEvolucao.variacao.toFixed(1)}%` : 'N/A'],
          ['Menor Evolução', analiseIA.comparacaoLojas.menorEvolucao?.nome || 'N/A', `${analiseIA.comparacaoLojas.menorEvolucao?.variacao?.toFixed(1) || 'N/A'}%`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Categoria', 'Loja', 'Valor']],
          body: compData,
          theme: 'grid',
          headStyles: { 
            fillColor: COLORS.primary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9, cellPadding: 4 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;

        // Estatísticas resumidas
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total de Lojas Analisadas: ${analiseIA.comparacaoLojas.totalLojas}`, 14, yPos);
        doc.text(`Lojas Acima do Objetivo: ${analiseIA.comparacaoLojas.lojasAcimaMedia}`, 100, yPos);
        yPos += 10;
      }

      // ==================== RANKING COMPLETO DE LOJAS ====================
      if (analiseIA.dadosGraficos?.rankingServicos && analiseIA.dadosGraficos.rankingServicos.length > 0) {
        doc.addPage();
        yPos = 20;

        yPos = drawSectionHeader(doc, yPos, 'Top 10 Lojas por Serviços', COLORS.secondary, pageWidth);

        const top10Data = analiseIA.dadosGraficos.rankingServicos.slice(0, 10).map((item, idx) => [
          (idx + 1).toString(),
          item.loja,
          item.servicos.toString(),
          `${item.desvio >= 0 ? '+' : ''}${(item.desvio * 100).toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Pos.', 'Loja', 'Serviços', 'Desvio']],
          body: top10Data,
          theme: 'grid',
          headStyles: { 
            fillColor: COLORS.secondary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { cellPadding: 3 },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
              const desvioStr = data.cell.raw as string;
              if (desvioStr.startsWith('+')) {
                data.cell.styles.textColor = COLORS.success;
                data.cell.styles.fontStyle = 'bold';
              } else if (desvioStr.startsWith('-')) {
                data.cell.styles.textColor = COLORS.danger;
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Continuar com restante das lojas se houver mais de 10
        if (analiseIA.dadosGraficos.rankingServicos.length > 10) {
          const restData = analiseIA.dadosGraficos.rankingServicos.slice(10).map((item, idx) => [
            (idx + 11).toString(),
            item.loja,
            item.servicos.toString(),
            `${item.desvio >= 0 ? '+' : ''}${(item.desvio * 100).toFixed(1)}%`,
          ]);

          // Verificar se precisa de nova página
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }

          autoTable(doc, {
            startY: yPos,
            head: [['Pos.', 'Loja', 'Serviços', 'Desvio']],
            body: restData,
            theme: 'grid',
            headStyles: { 
              fillColor: COLORS.secondary,
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 3 },
            margin: { left: 14, right: 14 },
            columnStyles: {
              0: { cellWidth: 15, halign: 'center' },
              1: { cellWidth: 80 },
              2: { cellWidth: 30, halign: 'center' },
              3: { cellWidth: 30, halign: 'center' },
            },
            didParseCell: (data) => {
              if (data.section === 'body' && data.column.index === 3) {
                const desvioStr = data.cell.raw as string;
                if (desvioStr.startsWith('+')) {
                  data.cell.styles.textColor = COLORS.success;
                  data.cell.styles.fontStyle = 'bold';
                } else if (desvioStr.startsWith('-')) {
                  data.cell.styles.textColor = COLORS.danger;
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // ==================== ANÁLISE POR ZONAS ====================
      if ((analiseIA as any).analiseZonasDetalhada && (analiseIA as any).analiseZonasDetalhada.length > 0) {
        doc.addPage();
        yPos = 20;

        yPos = drawSectionHeader(doc, yPos, 'Análise por Zonas', COLORS.info, pageWidth);

        const zonasData = (analiseIA as any).analiseZonasDetalhada.map((zona: any) => [
          zona.zona,
          zona.totalLojas.toString(),
          zona.somaServicos.toString(),
          zona.somaObjetivos.toString(),
          formatPercent(zona.mediaDesvio, 100),
          `${(zona.mediaTaxaReparacao * 100).toFixed(2)}%`,
          `${zona.lojasAcimaObjetivo}/${zona.totalLojas} (${zona.taxaCumprimento.toFixed(0)}%)`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Zona', 'Lojas', 'Serviços', 'Objetivo', 'Desvio', 'Taxa Rep.', 'Cumprimento']],
          body: zonasData,
          theme: 'grid',
          headStyles: { 
            fillColor: COLORS.info,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { cellPadding: 3 },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 35, halign: 'center' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const desvioStr = data.cell.raw as string;
              if (desvioStr.startsWith('+')) {
                data.cell.styles.textColor = COLORS.success;
                data.cell.styles.fontStyle = 'bold';
              } else if (desvioStr.startsWith('-')) {
                data.cell.styles.textColor = COLORS.danger;
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // ==================== ANÁLISE DE PERFORMANCE ====================
      if (analiseIA.analiseResultados) {
        doc.addPage();
        yPos = 20;

        yPos = drawSectionHeader(doc, yPos, 'Análise de Performance', COLORS.primary, pageWidth);

        // Lojas em Destaque
        if (analiseIA.analiseResultados.lojasDestaque && analiseIA.analiseResultados.lojasDestaque.length > 0) {
          doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
          doc.roundedRect(14, yPos, 4, 8, 1, 1, 'F');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
          doc.text('Lojas em Destaque:', 22, yPos + 6);
          yPos += 12;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.analiseResultados.lojasDestaque.slice(0, 5).forEach(loja => {
            const lines = doc.splitTextToSize(`• ${loja}`, pageWidth - 32);
            doc.text(lines, 22, yPos);
            yPos += lines.length * 4.5;
          });
          yPos += 6;
        }

        // Lojas que Precisam Atenção
        if (analiseIA.analiseResultados.lojasAtencao && analiseIA.analiseResultados.lojasAtencao.length > 0) {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFillColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
          doc.roundedRect(14, yPos, 4, 8, 1, 1, 'F');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
          doc.text('Lojas que Precisam Atenção:', 22, yPos + 6);
          yPos += 12;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.analiseResultados.lojasAtencao.slice(0, 5).forEach(loja => {
            const lines = doc.splitTextToSize(`• ${loja}`, pageWidth - 32);
            doc.text(lines, 22, yPos);
            yPos += lines.length * 4.5;
          });
          yPos += 6;
        }

        // Recomendações
        if (analiseIA.analiseResultados.recomendacoes && analiseIA.analiseResultados.recomendacoes.length > 0) {
          if (yPos > 220) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
          doc.roundedRect(14, yPos, 4, 8, 1, 1, 'F');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
          doc.text('Recomendações:', 22, yPos + 6);
          yPos += 12;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.analiseResultados.recomendacoes.forEach(rec => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 32);
            doc.text(lines, 22, yPos);
            yPos += lines.length * 4.5;
          });
        }
      }

      // ==================== PONTOS POSITIVOS E NEGATIVOS ====================
      if ((analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) || 
          (analiseIA.pontosNegativos && analiseIA.pontosNegativos.length > 0)) {
        doc.addPage();
        yPos = 20;

        // Pontos Positivos
        if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
          yPos = drawSectionHeader(doc, yPos, 'Pontos Positivos', COLORS.success, pageWidth);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.pontosPositivos.forEach(ponto => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const lines = doc.splitTextToSize(`• ${ponto}`, pageWidth - 32);
            doc.text(lines, 18, yPos);
            yPos += lines.length * 4.5;
          });
          yPos += 10;
        }

        // Pontos Negativos
        if (analiseIA.pontosNegativos && analiseIA.pontosNegativos.length > 0) {
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }

          yPos = drawSectionHeader(doc, yPos, 'Pontos Negativos', COLORS.danger, pageWidth);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.pontosNegativos.forEach(ponto => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const lines = doc.splitTextToSize(`• ${ponto}`, pageWidth - 32);
            doc.text(lines, 18, yPos);
            yPos += lines.length * 4.5;
          });
          yPos += 10;
        }
      }

      // ==================== SUGESTÕES DE MELHORIA ====================
      if (analiseIA.sugestoes && analiseIA.sugestoes.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        yPos = drawSectionHeader(doc, yPos, 'Sugestões de Melhoria', COLORS.warning, pageWidth);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        analiseIA.sugestoes.forEach((sugestao, idx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`${idx + 1}. ${sugestao}`, pageWidth - 32);
          doc.text(lines, 18, yPos);
          yPos += lines.length * 4.5 + 2;
        });
      }

      // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        // Texto do rodapé
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `PoweringEG Platform - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      // Download
      const fileName = `RelatorioIA_${periodoLabels[periodo]?.replace(/ /g, '') || periodo}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Button
      onClick={exportarPDF}
      disabled={exportando}
      variant="outline"
      size="sm"
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
  );
}
