import PDFDocument from 'pdfkit';

interface DashboardVolanteData {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  resumo: {
    totalVisitas: number;
    totalPendentes: number;
    pendentesResolvidos: number;
    pendentesPendentes: number;
    taxaResolucao: number;
  };
  rankings: {
    topLojasVisitadas: Array<{ lojaId: number; lojaNome: string; visitas: number }>;
    topLojasPendentes: Array<{ lojaId: number; lojaNome: string; pendentesPendentes: number }>;
  };
}

export async function gerarPDFDashboardVolante(data: DashboardVolanteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cores
    const primaryColor = '#3b82f6';
    const successColor = '#22c55e';
    const warningColor = '#f59e0b';
    const dangerColor = '#ef4444';
    const grayColor = '#6b7280';

    // Cabeçalho
    doc.fontSize(24).fillColor(primaryColor).text('Dashboard do Volante', { align: 'center' });
    doc.moveDown(0.5);
    
    // Período
    const dataInicio = new Date(data.periodo.dataInicio).toLocaleDateString('pt-PT');
    const dataFim = new Date(data.periodo.dataFim).toLocaleDateString('pt-PT');
    doc.fontSize(12).fillColor(grayColor).text(`Período: ${dataInicio} - ${dataFim}`, { align: 'center' });
    doc.moveDown(1.5);

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Seção de Resumo
    doc.fontSize(16).fillColor('#000000').text('Resumo Geral', { underline: true });
    doc.moveDown(0.5);

    const resumoY = doc.y;
    const boxWidth = 120;
    const boxHeight = 80;
    const boxSpacing = 10;

    // Card 1: Total Visitas
    doc.rect(50, resumoY, boxWidth, boxHeight).fillAndStroke('#dbeafe', primaryColor);
    doc.fontSize(10).fillColor(primaryColor).text('Total de Visitas', 55, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(primaryColor).text(data.resumo.totalVisitas.toString(), 55, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 2: Pendentes em Aberto
    doc.rect(50 + boxWidth + boxSpacing, resumoY, boxWidth, boxHeight).fillAndStroke('#fef3c7', warningColor);
    doc.fontSize(10).fillColor(warningColor).text('Pendentes Aberto', 55 + boxWidth + boxSpacing, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(warningColor).text(data.resumo.pendentesPendentes.toString(), 55 + boxWidth + boxSpacing, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 3: Pendentes Resolvidos
    doc.rect(50 + (boxWidth + boxSpacing) * 2, resumoY, boxWidth, boxHeight).fillAndStroke('#d1fae5', successColor);
    doc.fontSize(10).fillColor(successColor).text('Resolvidos', 55 + (boxWidth + boxSpacing) * 2, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(successColor).text(data.resumo.pendentesResolvidos.toString(), 55 + (boxWidth + boxSpacing) * 2, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 4: Taxa de Resolução
    doc.rect(50 + (boxWidth + boxSpacing) * 3, resumoY, boxWidth, boxHeight).fillAndStroke('#f3e8ff', '#a855f7');
    doc.fontSize(10).fillColor('#a855f7').text('Taxa Resolução', 55 + (boxWidth + boxSpacing) * 3, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor('#a855f7').text(`${data.resumo.taxaResolucao}%`, 55 + (boxWidth + boxSpacing) * 3, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    doc.y = resumoY + boxHeight + 30;

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Seção de Rankings
    doc.fontSize(16).fillColor('#000000').text('Rankings', { underline: true });
    doc.moveDown(0.5);

    // Top Lojas Visitadas
    doc.fontSize(14).fillColor(successColor).text('🏆 Top 5 Lojas Mais Visitadas');
    doc.moveDown(0.3);

    data.rankings.topLojasVisitadas.forEach((loja, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      doc.fontSize(11).fillColor('#000000').text(`${medal} ${loja.lojaNome}`, 60, doc.y, { continued: true });
      doc.fillColor(primaryColor).text(`${loja.visitas} visitas`, { align: 'right' });
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);

    // Top Lojas com Pendentes
    doc.fontSize(14).fillColor(dangerColor).text('⚠️ Top 5 Lojas com Mais Pendentes');
    doc.moveDown(0.3);

    data.rankings.topLojasPendentes.forEach((loja, index) => {
      doc.fontSize(11).fillColor('#000000').text(`${index + 1}. ${loja.lojaNome}`, 60, doc.y, { continued: true });
      doc.fillColor(dangerColor).text(`${loja.pendentesPendentes} pendentes`, { align: 'right' });
      doc.moveDown(0.3);
    });

    // Rodapé
    doc.moveDown(2);
    doc.strokeColor(grayColor).lineWidth(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(grayColor).text('PoweringEG Platform 2.0 - Dashboard do Volante', { align: 'center' });
    doc.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, { align: 'center' });

    doc.end();
  });
}
