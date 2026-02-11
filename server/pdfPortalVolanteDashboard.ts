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
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cores padrão ExpressGlass
    const primaryColor = '#1a365d'; // azul ExpressGlass
    const purpleColor = '#8b5cf6';
    const blueColor = '#3b82f6';
    const tealColor = '#14b8a6';
    const orangeColor = '#f97316';
    const grayColor = '#666666';
    
    const leftMargin = 50;
    const pageWidth = doc.page.width - 100;

    // ============================================
    // CABEÇALHO COM LOGO
    // ============================================
    const path = await import('path');
    const fs = await import('fs');
    const logoPath = path.join(process.cwd(), 'server', 'assets', 'eglass-logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, leftMargin, 35, { width: 150 });
    } else {
      // Fallback para texto se imagem não existir
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#e53935')
         .text('EXPRESS', leftMargin, 40, { continued: true })
         .fillColor('#1a365d')
         .font('Helvetica')
         .text('GLASS');
    }
    
    doc.y = 70;
    
    // Título do relatório
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Dashboard do Volante', leftMargin, doc.y, { align: 'center', width: pageWidth });
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(grayColor)
       .text(data.volanteNome, leftMargin, doc.y + 5, { align: 'center', width: pageWidth });
    
    doc.fontSize(10)
       .fillColor(grayColor)
       .text(`Período: ${data.periodo}`, leftMargin, doc.y + 5, { align: 'center', width: pageWidth });
    
    doc.moveDown(1.5);
    
    // Linha separadora
    doc.strokeColor(primaryColor)
       .lineWidth(2)
       .moveTo(leftMargin, doc.y)
       .lineTo(leftMargin + pageWidth, doc.y)
       .stroke();
    
    doc.moveDown(1);

    // ============================================
    // RESUMO DE ATIVIDADE
    // ============================================
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Resumo de Atividade', leftMargin);
    
    doc.moveDown(0.5);

    const resumoY = doc.y;
    const boxWidth = 115;
    const boxHeight = 75;
    const boxSpacing = 10;

    // Card 1: Total Apoios
    doc.rect(leftMargin, resumoY, boxWidth, boxHeight).fillAndStroke('#f3e8ff', purpleColor);
    doc.fontSize(9).fillColor(purpleColor).text('Total de Apoios', leftMargin + 5, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(22).fillColor(purpleColor).text(data.totalApoios.toString(), leftMargin + 5, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 2: Lojas Apoiadas
    doc.rect(leftMargin + boxWidth + boxSpacing, resumoY, boxWidth, boxHeight).fillAndStroke('#dbeafe', blueColor);
    doc.fontSize(9).fillColor(blueColor).text('Lojas Apoiadas', leftMargin + boxWidth + boxSpacing + 5, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(22).fillColor(blueColor).text(data.lojasApoiadas.toString(), leftMargin + boxWidth + boxSpacing + 5, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 3: Coberturas Férias
    doc.rect(leftMargin + (boxWidth + boxSpacing) * 2, resumoY, boxWidth, boxHeight).fillAndStroke('#ccfbf1', tealColor);
    doc.fontSize(9).fillColor(tealColor).text('Coberturas Férias', leftMargin + (boxWidth + boxSpacing) * 2 + 5, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(22).fillColor(tealColor).text(data.coberturaFerias.toString(), leftMargin + (boxWidth + boxSpacing) * 2 + 5, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 4: Substituições
    doc.rect(leftMargin + (boxWidth + boxSpacing) * 3, resumoY, boxWidth, boxHeight).fillAndStroke('#fed7aa', orangeColor);
    doc.fontSize(9).fillColor(orangeColor).text('Substituições', leftMargin + (boxWidth + boxSpacing) * 3 + 5, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(22).fillColor(orangeColor).text(data.substituicoes.toString(), leftMargin + (boxWidth + boxSpacing) * 3 + 5, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    doc.y = resumoY + boxHeight + 25;

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(1);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke();
    doc.moveDown(1);

    // ============================================
    // DISTRIBUIÇÃO DE TIPOS DE APOIO
    // ============================================
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Distribuição de Tipos de Apoio', leftMargin);
    
    doc.moveDown(0.5);

    const total = data.coberturaFerias + data.substituicoes + data.outro;
    if (total > 0) {
      const percentFerias = ((data.coberturaFerias / total) * 100).toFixed(1);
      const percentSubst = ((data.substituicoes / total) * 100).toFixed(1);
      const percentOutro = ((data.outro / total) * 100).toFixed(1);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');
      doc.text(`• Cobertura Férias: ${data.coberturaFerias} (${percentFerias}%)`, leftMargin + 10);
      doc.text(`• Substituição Vidros: ${data.substituicoes} (${percentSubst}%)`, leftMargin + 10);
      doc.text(`• Outro: ${data.outro} (${percentOutro}%)`, leftMargin + 10);
    }

    doc.moveDown(1);

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(1);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke();
    doc.moveDown(1);

    // ============================================
    // RANKING DE LOJAS
    // ============================================
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('🏆 Ranking de Lojas Mais Apoiadas', leftMargin);
    
    doc.moveDown(0.5);

    data.rankingLojas.slice(0, 10).forEach((loja, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000')
         .text(`${medal} ${loja.nome}`, leftMargin + 10, doc.y, { continued: true });
      doc.fillColor(primaryColor).text(`${loja.count} apoios`, { align: 'right' });
      doc.moveDown(0.3);
    });

    // ============================================
    // RODAPÉ
    // ============================================
    const bottomMargin = 50;
    const footerY = doc.page.height - bottomMargin;
    
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(grayColor)
       .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', leftMargin, footerY, { align: 'center', width: pageWidth });
    
    doc.fontSize(7)
       .fillColor(grayColor)
       .text(`Gerado em ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, leftMargin, footerY + 10, { align: 'center', width: pageWidth });

    doc.end();
  });
}
