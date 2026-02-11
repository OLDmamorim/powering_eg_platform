import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

interface DashboardData {
  volanteNome: string;
  periodo: string;
  totalApoios: number;
  lojasApoiadas: number;
  coberturaFerias: number;
  substituicoes: number;
  outro: number;
  rankingLojas: Array<{ nome: string; count: number }>;
}

export async function gerarPDFPortalVolanteDashboard(data: DashboardData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#0066CC';
      const leftMargin = 50;
      const pageWidth = doc.page.width - 100;

      // Logo ExpressGlass
      try {
        doc.image('/home/ubuntu/powering_eg_platform/server/assets/expressglass-logo.png', leftMargin, 35, { width: 150 });
      } catch (e) {
        console.warn('Logo não encontrado');
      }

      // Título
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Dashboard do Volante', leftMargin, 75, { align: 'center', width: pageWidth });

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text(data.volanteNome, leftMargin, 100, { align: 'center', width: pageWidth });

      doc.fontSize(10)
         .text(`Período: ${data.periodo}`, leftMargin, 115, { align: 'center', width: pageWidth });

      // Linha separadora
      doc.strokeColor(primaryColor).lineWidth(2);
      doc.moveTo(leftMargin, 135).lineTo(leftMargin + pageWidth, 135).stroke();

      let yPos = 155;

      // ===== RESUMO DE ATIVIDADE =====
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Resumo de Atividade', leftMargin, yPos);

      yPos += 25;

      // Cards de métricas em grid 2x2
      const cardWidth = (pageWidth - 15) / 2;
      const cardHeight = 55;
      const cardSpacing = 15;

      const cards = [
        { label: 'Total de Apoios', value: data.totalApoios, color: '#8B5CF6', x: leftMargin },
        { label: 'Lojas Apoiadas', value: data.lojasApoiadas, color: '#3B82F6', x: leftMargin + cardWidth + cardSpacing },
        { label: 'Coberturas Férias', value: data.coberturaFerias, color: '#10B981', x: leftMargin },
        { label: 'Substituições', value: data.substituicoes, color: '#F59E0B', x: leftMargin + cardWidth + cardSpacing }
      ];

      // Primeira linha
      for (let i = 0; i < 2; i++) {
        const card = cards[i];
        doc.rect(card.x, yPos, cardWidth, cardHeight).lineWidth(2).strokeColor(card.color).stroke();
        
        doc.fontSize(9)
           .fillColor(card.color)
           .font('Helvetica-Bold')
           .text(card.label, card.x + 10, yPos + 12, { width: cardWidth - 20 });
        
        doc.fontSize(20)
           .text(card.value.toString(), card.x + 10, yPos + 28, { width: cardWidth - 20, align: 'center' });
      }

      yPos += cardHeight + 10;

      // Segunda linha
      for (let i = 2; i < 4; i++) {
        const card = cards[i];
        doc.rect(card.x, yPos, cardWidth, cardHeight).lineWidth(2).strokeColor(card.color).stroke();
        
        doc.fontSize(9)
           .fillColor(card.color)
           .font('Helvetica-Bold')
           .text(card.label, card.x + 10, yPos + 12, { width: cardWidth - 20 });
        
        doc.fontSize(20)
           .text(card.value.toString(), card.x + 10, yPos + 28, { width: cardWidth - 20, align: 'center' });
      }

      yPos += cardHeight + 25;

      // ===== GRÁFICOS =====
      const chartWidth = 220;
      const chartHeight = 180;

      // Gráfico de pizza
      const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight, backgroundColour: 'white' });
      
      const total = data.coberturaFerias + data.substituicoes + data.outro;
      
      const pieChartConfig = {
        type: 'doughnut' as const,
        data: {
          labels: ['Cobertura Férias', 'Substituição Vidros', 'Outro'],
          datasets: [{
            data: [data.coberturaFerias, data.substituicoes, data.outro],
            backgroundColor: ['#10B981', '#F59E0B', '#6B7280'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              position: 'bottom' as const,
              labels: { font: { size: 10 }, padding: 8 }
            },
            title: {
              display: true,
              text: 'Tipos de Apoio',
              font: { size: 12, weight: 'bold' as const }
            }
          }
        }
      };

      const pieChartBuffer = await chartJSNodeCanvas.renderToBuffer(pieChartConfig as any);

      // Gráfico de barras
      const barChartConfig = {
        type: 'bar' as const,
        data: {
          labels: data.rankingLojas.slice(0, 5).map(r => r.nome.length > 12 ? r.nome.substring(0, 12) + '...' : r.nome),
          datasets: [{
            label: 'Apoios',
            data: data.rankingLojas.slice(0, 5).map(r => r.count),
            backgroundColor: '#3B82F6',
            borderWidth: 0
          }]
        },
        options: {
          responsive: false,
          indexAxis: 'y' as const,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Top 5 Lojas',
              font: { size: 12, weight: 'bold' as const }
            }
          },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      };

      const barChartBuffer = await chartJSNodeCanvas.renderToBuffer(barChartConfig as any);

      // Posicionar gráficos
      const pieX = leftMargin + 20;
      const barX = leftMargin + pageWidth - chartWidth - 20;

      doc.image(pieChartBuffer, pieX, yPos, { width: chartWidth, height: chartHeight });
      doc.image(barChartBuffer, barX, yPos, { width: chartWidth, height: chartHeight });

      yPos += chartHeight + 25;

      // ===== RANKING COMPLETO =====
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Ranking Completo', leftMargin, yPos);

      yPos += 20;

      const tableTop = yPos;
      const colWidths = [35, pageWidth - 100, 65];
      const rowHeight = 18;

      // Cabeçalho
      doc.rect(leftMargin, tableTop, pageWidth, rowHeight).fillAndStroke('#E5E7EB', '#E5E7EB');
      
      doc.fontSize(9)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text('#', leftMargin + 5, tableTop + 5, { width: colWidths[0] - 10 })
         .text('Loja', leftMargin + colWidths[0] + 5, tableTop + 5, { width: colWidths[1] - 10 })
         .text('Apoios', leftMargin + colWidths[0] + colWidths[1] + 5, tableTop + 5, { width: colWidths[2] - 10, align: 'right' });

      yPos = tableTop + rowHeight;

      // Linhas
      data.rankingLojas.slice(0, 10).forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(leftMargin, yPos, pageWidth, rowHeight).fillAndStroke(bgColor, bgColor);

        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
        
        doc.fontSize(8)
           .fillColor('#666666')
           .font('Helvetica')
           .text(medal, leftMargin + 5, yPos + 5, { width: colWidths[0] - 10 })
           .text(item.nome, leftMargin + colWidths[0] + 5, yPos + 5, { width: colWidths[1] - 10 })
           .text(item.count.toString(), leftMargin + colWidths[0] + colWidths[1] + 5, yPos + 5, { width: colWidths[2] - 10, align: 'right' });

        yPos += rowHeight;
      });

      // Rodapé
      const footerY = doc.page.height - 40;
      doc.fontSize(8)
         .fillColor('#999999')
         .font('Helvetica')
         .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', leftMargin, footerY, { align: 'center', width: pageWidth });

      const now = new Date();
      const dataFormatada = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      doc.fontSize(7).text(`Gerado em ${dataFormatada}`, leftMargin, footerY + 12, { align: 'center', width: pageWidth });

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}
