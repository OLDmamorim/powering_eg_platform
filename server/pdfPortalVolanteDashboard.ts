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
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cores
    const primaryColor = '#14b8a6'; // teal
    const purpleColor = '#8b5cf6';
    const blueColor = '#3b82f6';
    const orangeColor = '#f97316';
    const grayColor = '#6b7280';

    // Cabeçalho
    doc.fontSize(24).fillColor(primaryColor).text('Dashboard do Volante', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor(grayColor).text(data.volanteNome, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor(grayColor).text(`Período: ${data.periodo}`, { align: 'center' });
    doc.moveDown(1.5);

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Seção de Resumo
    doc.fontSize(16).fillColor('#000000').text('Resumo de Atividade', { underline: true });
    doc.moveDown(0.5);

    const resumoY = doc.y;
    const boxWidth = 120;
    const boxHeight = 80;
    const boxSpacing = 10;

    // Card 1: Total Apoios
    doc.rect(50, resumoY, boxWidth, boxHeight).fillAndStroke('#f3e8ff', purpleColor);
    doc.fontSize(10).fillColor(purpleColor).text('Total de Apoios', 55, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(purpleColor).text(data.totalApoios.toString(), 55, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 2: Lojas Apoiadas
    doc.rect(50 + boxWidth + boxSpacing, resumoY, boxWidth, boxHeight).fillAndStroke('#dbeafe', blueColor);
    doc.fontSize(10).fillColor(blueColor).text('Lojas Apoiadas', 55 + boxWidth + boxSpacing, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(blueColor).text(data.lojasApoiadas.toString(), 55 + boxWidth + boxSpacing, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 3: Coberturas Férias
    doc.rect(50 + (boxWidth + boxSpacing) * 2, resumoY, boxWidth, boxHeight).fillAndStroke('#ccfbf1', primaryColor);
    doc.fontSize(10).fillColor(primaryColor).text('Coberturas Férias', 55 + (boxWidth + boxSpacing) * 2, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(primaryColor).text(data.coberturaFerias.toString(), 55 + (boxWidth + boxSpacing) * 2, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    // Card 4: Substituições
    doc.rect(50 + (boxWidth + boxSpacing) * 3, resumoY, boxWidth, boxHeight).fillAndStroke('#fed7aa', orangeColor);
    doc.fontSize(10).fillColor(orangeColor).text('Substituições', 55 + (boxWidth + boxSpacing) * 3, resumoY + 10, { width: boxWidth - 10 });
    doc.fontSize(24).fillColor(orangeColor).text(data.substituicoes.toString(), 55 + (boxWidth + boxSpacing) * 3, resumoY + 35, { width: boxWidth - 10, align: 'center' });

    doc.y = resumoY + boxHeight + 30;

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Distribuição de Tipos de Apoio
    doc.fontSize(14).fillColor('#000000').text('Distribuição de Tipos de Apoio');
    doc.moveDown(0.5);

    const total = data.coberturaFerias + data.substituicoes + data.outro;
    if (total > 0) {
      const percentFerias = ((data.coberturaFerias / total) * 100).toFixed(1);
      const percentSubst = ((data.substituicoes / total) * 100).toFixed(1);
      const percentOutro = ((data.outro / total) * 100).toFixed(1);

      doc.fontSize(11).fillColor('#000000');
      doc.text(`• Cobertura Férias: ${data.coberturaFerias} (${percentFerias}%)`, 60);
      doc.text(`• Substituição Vidros: ${data.substituicoes} (${percentSubst}%)`, 60);
      doc.text(`• Outro: ${data.outro} (${percentOutro}%)`, 60);
    }

    doc.moveDown(1);

    // Linha separadora
    doc.strokeColor(primaryColor).lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Ranking de Lojas
    doc.fontSize(14).fillColor('#000000').text('🏆 Ranking de Lojas Mais Apoiadas');
    doc.moveDown(0.5);

    data.rankingLojas.slice(0, 10).forEach((loja, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      doc.fontSize(11).fillColor('#000000').text(`${medal} ${loja.nome}`, 60, doc.y, { continued: true });
      doc.fillColor(purpleColor).text(`${loja.count} apoios`, { align: 'right' });
      doc.moveDown(0.3);
    });

    // Rodapé
    doc.moveDown(2);
    doc.strokeColor(grayColor).lineWidth(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(grayColor).text('PoweringEG Platform 2.0 - Portal do Volante', { align: 'center' });
    doc.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, { align: 'center' });

    doc.end();
  });
}
