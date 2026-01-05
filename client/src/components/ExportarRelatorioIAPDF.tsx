import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

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
    melhorLoja: { nome: string; servicos: number; desvio: number } | null;
    piorLoja: { nome: string; servicos: number; desvio: number } | null;
    maiorEvolucao: { nome: string; variacao: number } | null;
    menorEvolucao: { nome: string; variacao: number } | null;
    totalLojas: number;
    lojasAcimaMedia: number;
  };
  dadosGraficos?: {
    rankingServicos: Array<{ loja: string; servicos: number; desvio: number }>;
    evolucaoMensal: Array<{ mes: string; servicos: number; objetivo: number }>;
  };
}

interface Props {
  analiseIA: AnaliseIA;
  periodo: string;
}

export function ExportarRelatorioIAPDF({ analiseIA, periodo }: Props) {
  const [exportando, setExportando] = useState(false);

  const periodoLabels: Record<string, string> = {
    mes_anterior: 'Mês Anterior',
    mensal: 'Mês Atual',
    trimestral: 'Trimestre',
    semestral: 'Semestre',
    anual: 'Ano',
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Título
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório IA de Resultados', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Período
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${periodoLabels[periodo] || periodo}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Resumo Executivo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Executivo', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const resumoLines = doc.splitTextToSize(analiseIA.resumo, pageWidth - 28);
      doc.text(resumoLines, 14, yPos);
      yPos += resumoLines.length * 5 + 10;

      // Comparação de Lojas (se disponível)
      if (analiseIA.comparacaoLojas) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Comparação de Lojas', 14, yPos);
        yPos += 8;

        const compData = [
          ['Melhor Loja', analiseIA.comparacaoLojas.melhorLoja?.nome || 'N/A', `${analiseIA.comparacaoLojas.melhorLoja?.servicos || 0} serviços`],
          ['Menos Serviços', analiseIA.comparacaoLojas.piorLoja?.nome || 'N/A', `${analiseIA.comparacaoLojas.piorLoja?.servicos || 0} serviços`],
          ['Maior Evolução', analiseIA.comparacaoLojas.maiorEvolucao?.nome || 'N/A', `${analiseIA.comparacaoLojas.maiorEvolucao?.variacao ? '+' + analiseIA.comparacaoLojas.maiorEvolucao.variacao.toFixed(1) + '%' : 'N/A'}`],
          ['Menor Evolução', analiseIA.comparacaoLojas.menorEvolucao?.nome || 'N/A', `${analiseIA.comparacaoLojas.menorEvolucao?.variacao?.toFixed(1) || 'N/A'}%`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Categoria', 'Loja', 'Valor']],
          body: compData,
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234] },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Estatísticas
        doc.setFontSize(10);
        doc.text(`Total de Lojas Analisadas: ${analiseIA.comparacaoLojas.totalLojas}`, 14, yPos);
        yPos += 5;
        doc.text(`Lojas Acima do Objetivo: ${analiseIA.comparacaoLojas.lojasAcimaMedia}`, 14, yPos);
        yPos += 10;
      }

      // Ranking de Serviços (se disponível)
      if (analiseIA.dadosGraficos?.rankingServicos && analiseIA.dadosGraficos.rankingServicos.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Top 10 Lojas por Serviços', 14, yPos);
        yPos += 8;

        const rankingData = analiseIA.dadosGraficos.rankingServicos.map((item, idx) => [
          (idx + 1).toString(),
          item.loja,
          item.servicos.toString(),
          `${item.desvio >= 0 ? '+' : ''}${item.desvio.toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Pos.', 'Loja', 'Serviços', 'Desvio']],
          body: rankingData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 80 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Análise de Performance
      if (analiseIA.analiseResultados) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Análise de Performance', 14, yPos);
        yPos += 8;

        // Lojas em Destaque
        if (analiseIA.analiseResultados.lojasDestaque && analiseIA.analiseResultados.lojasDestaque.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94);
          doc.text('Lojas em Destaque:', 14, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.analiseResultados.lojasDestaque.slice(0, 5).forEach(loja => {
            const lines = doc.splitTextToSize(`• ${loja}`, pageWidth - 28);
            doc.text(lines, 18, yPos);
            yPos += lines.length * 5;
          });
          yPos += 5;
        }

        // Lojas que Precisam Atenção
        if (analiseIA.analiseResultados.lojasAtencao && analiseIA.analiseResultados.lojasAtencao.length > 0) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(245, 158, 11);
          doc.text('Lojas que Precisam Atenção:', 14, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.analiseResultados.lojasAtencao.slice(0, 5).forEach(loja => {
            const lines = doc.splitTextToSize(`• ${loja}`, pageWidth - 28);
            doc.text(lines, 18, yPos);
            yPos += lines.length * 5;
          });
          yPos += 5;
        }

        // Recomendações
        if (analiseIA.analiseResultados.recomendacoes && analiseIA.analiseResultados.recomendacoes.length > 0) {
          if (yPos > 230) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text('Recomendações:', 14, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          analiseIA.analiseResultados.recomendacoes.forEach(rec => {
            const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 28);
            doc.text(lines, 18, yPos);
            yPos += lines.length * 5;
          });
        }
      }

      // Pontos Positivos
      if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Pontos Positivos', 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        analiseIA.pontosPositivos.forEach(ponto => {
          const lines = doc.splitTextToSize(`• ${ponto}`, pageWidth - 28);
          doc.text(lines, 18, yPos);
          yPos += lines.length * 5;
        });
        yPos += 5;
      }

      // Pontos Negativos
      if (analiseIA.pontosNegativos && analiseIA.pontosNegativos.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text('Pontos Negativos', 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        analiseIA.pontosNegativos.forEach(ponto => {
          const lines = doc.splitTextToSize(`• ${ponto}`, pageWidth - 28);
          doc.text(lines, 18, yPos);
          yPos += lines.length * 5;
        });
        yPos += 5;
      }

      // Sugestões
      if (analiseIA.sugestoes && analiseIA.sugestoes.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('Sugestões de Melhoria', 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        analiseIA.sugestoes.forEach(sugestao => {
          const lines = doc.splitTextToSize(`• ${sugestao}`, pageWidth - 28);
          doc.text(lines, 18, yPos);
          yPos += lines.length * 5;
        });
      }

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `PoweringEG Platform - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Download
      const fileName = `RelatorioIA_${periodoLabels[periodo] || periodo}_${new Date().toISOString().split('T')[0]}.pdf`;
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
