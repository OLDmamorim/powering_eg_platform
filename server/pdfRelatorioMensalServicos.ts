import PDFDocument from 'pdfkit';

interface DadosRelatorioMensal {
  volanteNome: string;
  ano: number;
  mes: number;
  totais: {
    substituicaoLigeiro: number;
    reparacao: number;
    calibragem: number;
    outros: number;
    total: number;
    diasTrabalhados: number;
    lojasVisitadas: number;
  };
  porLoja: Array<{
    lojaId: number;
    lojaNome: string;
    substituicaoLigeiro: number;
    reparacao: number;
    calibragem: number;
    outros: number;
    total: number;
    visitas: number;
  }>;
}

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export async function gerarPDFRelatorioMensalServicos(dados: DadosRelatorioMensal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc.fontSize(20).fillColor('#0d9488').text('Relatório Mensal de Serviços', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#666').text(`${nomesMeses[dados.mes - 1]} ${dados.ano}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).fillColor('#888').text(`Volante: ${dados.volanteNome}`, { align: 'center' });
      doc.moveDown(1.5);

      // Linha separadora
      doc.strokeColor('#0d9488').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Resumo Geral
      doc.fontSize(16).fillColor('#333').text('Resumo Geral', { underline: true });
      doc.moveDown(0.5);

      const resumoY = doc.y;
      doc.fontSize(11).fillColor('#666');
      
      // Coluna esquerda
      doc.text(`Dias Trabalhados: ${dados.totais.diasTrabalhados}`, 70, resumoY);
      doc.text(`Lojas Visitadas: ${dados.totais.lojasVisitadas}`, 70, resumoY + 20);
      doc.text(`Total de Serviços: ${dados.totais.total}`, 70, resumoY + 40);
      
      // Coluna direita
      doc.text(`Substituição Ligeiro: ${dados.totais.substituicaoLigeiro}`, 320, resumoY);
      doc.text(`Reparação: ${dados.totais.reparacao}`, 320, resumoY + 20);
      doc.text(`Calibragem: ${dados.totais.calibragem}`, 320, resumoY + 40);
      doc.text(`Outros: ${dados.totais.outros}`, 320, resumoY + 60);

      doc.y = resumoY + 90;
      doc.moveDown(1);

      // Linha separadora
      doc.strokeColor('#ddd').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Detalhes por Loja
      doc.fontSize(16).fillColor('#333').text('Detalhes por Loja', { underline: true });
      doc.moveDown(0.5);

      // Cabeçalho da tabela
      const tableTop = doc.y;
      doc.fontSize(10).fillColor('#fff');
      doc.rect(50, tableTop, 495, 25).fill('#0d9488');
      
      doc.text('Loja', 60, tableTop + 8, { width: 150 });
      doc.text('Subst.', 220, tableTop + 8, { width: 50, align: 'center' });
      doc.text('Repar.', 280, tableTop + 8, { width: 50, align: 'center' });
      doc.text('Calib.', 340, tableTop + 8, { width: 50, align: 'center' });
      doc.text('Outros', 400, tableTop + 8, { width: 50, align: 'center' });
      doc.text('Total', 460, tableTop + 8, { width: 50, align: 'center' });

      let currentY = tableTop + 30;
      doc.fontSize(9).fillColor('#333');

      for (let i = 0; i < dados.porLoja.length; i++) {
        const loja = dados.porLoja[i];
        
        // Verificar se precisa de nova página
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
        }

        // Linha alternada
        if (i % 2 === 0) {
          doc.rect(50, currentY - 5, 495, 20).fill('#f9f9f9');
        }

        doc.fillColor('#333');
        doc.text(loja.lojaNome, 60, currentY, { width: 150, ellipsis: true });
        doc.text(loja.substituicaoLigeiro.toString(), 220, currentY, { width: 50, align: 'center' });
        doc.text(loja.reparacao.toString(), 280, currentY, { width: 50, align: 'center' });
        doc.text(loja.calibragem.toString(), 340, currentY, { width: 50, align: 'center' });
        doc.text(loja.outros.toString(), 400, currentY, { width: 50, align: 'center' });
        doc.text(loja.total.toString(), 460, currentY, { width: 50, align: 'center' });

        currentY += 20;
      }

      // Rodapé
      doc.fontSize(8).fillColor('#888');
      doc.text(
        'PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass',
        50,
        750,
        { align: 'center', width: 495 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
