import PDFDocument from 'pdfkit';

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
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#0066CC';
      const leftMargin = 50;
      const pageWidth = doc.page.width - 100;

      // Logo ExpressGlass
      try {
        doc.image('/home/ubuntu/powering_eg_platform/server/assets/expressglass-logo.png', leftMargin, 40, { width: 120 });
      } catch (e) {
        console.warn('Logo não encontrado:', e);
      }

      // Título
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Dashboard do Volante', leftMargin, 70, { align: 'center', width: pageWidth });

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text(data.volanteNome, leftMargin, 92, { align: 'center', width: pageWidth });

      doc.fontSize(9)
         .text(`Período: ${data.periodo}`, leftMargin, 107, { align: 'center', width: pageWidth });

      // Linha separadora
      doc.strokeColor(primaryColor).lineWidth(2);
      doc.moveTo(leftMargin, 125).lineTo(leftMargin + pageWidth, 125).stroke();

      let yPos = 140;

      // ===== RESUMO DE ATIVIDADE =====
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Resumo de Atividade', leftMargin, yPos);

      yPos += 20;

      // Cards de métricas em grid 2x2 (mais compacto)
      const cardWidth = (pageWidth - 15) / 2;
      const cardHeight = 45;
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
        
        doc.fontSize(8)
           .fillColor(card.color)
           .font('Helvetica-Bold')
           .text(card.label, card.x + 8, yPos + 8, { width: cardWidth - 16 });
        
        doc.fontSize(18)
           .text(card.value.toString(), card.x + 8, yPos + 22, { width: cardWidth - 16, align: 'center' });
      }

      yPos += cardHeight + 8;

      // Segunda linha
      for (let i = 2; i < 4; i++) {
        const card = cards[i];
        doc.rect(card.x, yPos, cardWidth, cardHeight).lineWidth(2).strokeColor(card.color).stroke();
        
        doc.fontSize(8)
           .fillColor(card.color)
           .font('Helvetica-Bold')
           .text(card.label, card.x + 8, yPos + 8, { width: cardWidth - 16 });
        
        doc.fontSize(18)
           .text(card.value.toString(), card.x + 8, yPos + 22, { width: cardWidth - 16, align: 'center' });
      }

      yPos += cardHeight + 20;

      // ===== DISTRIBUIÇÃO POR TIPO (mais compacto) =====
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Distribuição por Tipo de Apoio', leftMargin, yPos);

      yPos += 16;

      const total = data.totalApoios || 1;
      const tipos = [
        { nome: 'Cobertura Férias', valor: data.coberturaFerias, cor: '#10B981' },
        { nome: 'Substituição Vidros', valor: data.substituicoes, cor: '#F59E0B' },
        { nome: 'Outro', valor: data.outro, cor: '#6B7280' }
      ];

      tipos.forEach(tipo => {
        const percentage = ((tipo.valor / total) * 100).toFixed(1);
        doc.fontSize(9)
           .fillColor(tipo.cor)
           .font('Helvetica-Bold')
           .text('• ', leftMargin + 8, yPos, { continued: true })
           .fillColor('#333333')
           .font('Helvetica')
           .text(`${tipo.nome}: ${tipo.valor} (${percentage}%)`);
        yPos += 16;
      });

      yPos += 12;

      // ===== TOP 5 LOJAS (mais compacto) =====
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Top 5 Lojas Mais Apoiadas', leftMargin, yPos);

      yPos += 16;

      const top5 = data.rankingLojas.slice(0, 5);
      top5.forEach((loja, index) => {
        // Usar texto simples em vez de emojis
        const medal = index === 0 ? '1º' : index === 1 ? '2º' : index === 2 ? '3º' : `${index + 1}.`;
        const medalColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666666';
        
        doc.fontSize(9)
           .fillColor(medalColor)
           .font('Helvetica-Bold')
           .text(medal, leftMargin + 8, yPos, { continued: true })
           .fillColor('#333333')
           .font('Helvetica')
           .text(` ${loja.nome}`, { continued: true })
           .font('Helvetica-Bold')
           .text(` - ${loja.count} apoios`);
        yPos += 16;
      });

      yPos += 12;

      // ===== RANKING COMPLETO (mais compacto) =====
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Ranking Completo', leftMargin, yPos);

      yPos += 16;

      const tableTop = yPos;
      const colWidths = [30, pageWidth - 95, 65];
      const rowHeight = 16;

      // Cabeçalho
      doc.rect(leftMargin, tableTop, pageWidth, rowHeight).fillAndStroke('#E5E7EB', '#E5E7EB');
      
      doc.fontSize(8)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text('#', leftMargin + 4, tableTop + 4, { width: colWidths[0] - 8 })
         .text('Loja', leftMargin + colWidths[0] + 4, tableTop + 4, { width: colWidths[1] - 8 })
         .text('Apoios', leftMargin + colWidths[0] + colWidths[1] + 4, tableTop + 4, { width: colWidths[2] - 8, align: 'right' });

      yPos = tableTop + rowHeight;

      // Linhas (limitar a 8 para caber na página)
      data.rankingLojas.slice(0, 8).forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(leftMargin, yPos, pageWidth, rowHeight).fillAndStroke(bgColor, bgColor);

        const medal = index === 0 ? '1º' : index === 1 ? '2º' : index === 2 ? '3º' : `${index + 1}.`;
        const medalColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666666';
        
        doc.fontSize(7)
           .fillColor(medalColor)
           .font('Helvetica-Bold')
           .text(medal, leftMargin + 4, yPos + 4, { width: colWidths[0] - 8 })
           .fillColor('#666666')
           .font('Helvetica')
           .text(item.nome, leftMargin + colWidths[0] + 4, yPos + 4, { width: colWidths[1] - 8 })
           .text(item.count.toString(), leftMargin + colWidths[0] + colWidths[1] + 4, yPos + 4, { width: colWidths[2] - 8, align: 'right' });

        yPos += rowHeight;
      });

      // Rodapé
      const footerY = doc.page.height - 40;
      doc.fontSize(7)
         .fillColor('#999999')
         .font('Helvetica')
         .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', leftMargin, footerY, { align: 'center', width: pageWidth });

      const now = new Date();
      const dataFormatada = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      doc.fontSize(6).text(`Gerado em ${dataFormatada}`, leftMargin, footerY + 10, { align: 'center', width: pageWidth });

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}
