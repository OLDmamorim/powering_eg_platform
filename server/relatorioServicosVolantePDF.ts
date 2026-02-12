import PDFDocument from 'pdfkit';
import { storagePut } from './storage';

interface ServicoLoja {
  lojaNome: string;
  substituicaoLigeiro: number;
  reparacao: number;
  calibragem: number;
  outros: number;
  total: number;
}

interface DadosRelatorioGestor {
  mesReferencia: string; // "YYYY-MM"
  volanteNome: string;
  gestorNome: string;
  totais: {
    substituicaoLigeiro: number;
    reparacao: number;
    calibragem: number;
    outros: number;
    total: number;
  };
  servicosPorLoja: ServicoLoja[];
}

interface DadosRelatorioLoja {
  mesReferencia: string; // "YYYY-MM"
  volanteNome: string;
  lojaNome: string;
  totais: {
    substituicaoLigeiro: number;
    reparacao: number;
    calibragem: number;
    outros: number;
    total: number;
  };
}

/**
 * Gerar PDF de relatório mensal de serviços para gestor
 */
export async function gerarPDFRelatorioGestor(dados: DadosRelatorioGestor): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const filename = `relatorio-servicos-${dados.volanteNome.replace(/\s+/g, '-')}-${dados.mesReferencia}.pdf`;
      const fileKey = `relatorios-servicos/${filename}`;
      
      try {
        const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        resolve({ url, filename });
      } catch (error) {
        reject(error);
      }
    });
    
    // Cabeçalho
    doc.fontSize(20).fillColor('#047857').text('PoweringEG Platform', { align: 'center' });
    doc.fontSize(14).fillColor('#333').text('Relatório Mensal de Serviços do Volante', { align: 'center' });
    doc.moveDown();
    
    // Informações do relatório
    const mesFormatado = formatarMes(dados.mesReferencia);
    doc.fontSize(11).fillColor('#666');
    doc.text(`Período: ${mesFormatado}`, { align: 'left' });
    doc.text(`Volante: ${dados.volanteNome}`, { align: 'left' });
    doc.text(`Gestor: ${dados.gestorNome}`, { align: 'left' });
    doc.moveDown(2);
    
    // Resumo de Totais
    doc.fontSize(14).fillColor('#047857').text('Resumo Geral de Serviços', { underline: true });
    doc.moveDown();
    
    const startY = doc.y;
    const colWidth = 120;
    const rowHeight = 25;
    
    // Cabeçalho da tabela de totais
    doc.fontSize(10).fillColor('#fff');
    doc.rect(50, startY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.text('Tipo de Serviço', 55, startY + 8, { width: colWidth - 10 });
    
    doc.rect(50 + colWidth, startY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.text('Quantidade', 55 + colWidth, startY + 8, { width: colWidth - 10, align: 'center' });
    
    let currentY = startY + rowHeight;
    
    // Linhas da tabela de totais
    const tiposServico = [
      { label: 'Substituição Ligeiro', valor: dados.totais.substituicaoLigeiro },
      { label: 'Reparação', valor: dados.totais.reparacao },
      { label: 'Calibragem', valor: dados.totais.calibragem },
      { label: 'Outros', valor: dados.totais.outros },
    ];
    
    doc.fillColor('#333');
    tiposServico.forEach((tipo, index) => {
      const bgColor = index % 2 === 0 ? '#f3f4f6' : '#ffffff';
      doc.rect(50, currentY, colWidth, rowHeight).fillAndStroke(bgColor, '#d1d5db');
      doc.fillColor('#333').text(tipo.label, 55, currentY + 8, { width: colWidth - 10 });
      
      doc.rect(50 + colWidth, currentY, colWidth, rowHeight).fillAndStroke(bgColor, '#d1d5db');
      doc.fillColor('#333').text(tipo.valor.toString(), 55 + colWidth, currentY + 8, { width: colWidth - 10, align: 'center' });
      
      currentY += rowHeight;
    });
    
    // Total geral
    doc.rect(50, currentY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.fillColor('#fff').fontSize(11).text('TOTAL GERAL', 55, currentY + 8, { width: colWidth - 10 });
    
    doc.rect(50 + colWidth, currentY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.fillColor('#fff').fontSize(11).text(dados.totais.total.toString(), 55 + colWidth, currentY + 8, { width: colWidth - 10, align: 'center' });
    
    doc.moveDown(4);
    
    // Detalhamento por Loja
    doc.fontSize(14).fillColor('#047857').text('Detalhamento por Loja', { underline: true });
    doc.moveDown();
    
    const lojaStartY = doc.y;
    const lojaColWidths = [140, 70, 70, 70, 70, 70];
    const lojaRowHeight = 22;
    
    // Cabeçalho da tabela de lojas
    doc.fontSize(9).fillColor('#fff');
    const headers = ['Loja', 'Subst.', 'Repar.', 'Calib.', 'Outros', 'Total'];
    let lojaCurrentX = 50;
    
    headers.forEach((header, i) => {
      doc.rect(lojaCurrentX, lojaStartY, lojaColWidths[i], lojaRowHeight).fillAndStroke('#047857', '#047857');
      doc.text(header, lojaCurrentX + 5, lojaStartY + 6, { width: lojaColWidths[i] - 10, align: 'center' });
      lojaCurrentX += lojaColWidths[i];
    });
    
    let lojaCurrentY = lojaStartY + lojaRowHeight;
    
    // Linhas da tabela de lojas
    doc.fillColor('#333');
    dados.servicosPorLoja.forEach((loja, index) => {
      const bgColor = index % 2 === 0 ? '#f3f4f6' : '#ffffff';
      lojaCurrentX = 50;
      
      const valores = [
        loja.lojaNome,
        loja.substituicaoLigeiro.toString(),
        loja.reparacao.toString(),
        loja.calibragem.toString(),
        loja.outros.toString(),
        loja.total.toString(),
      ];
      
      valores.forEach((valor, i) => {
        doc.rect(lojaCurrentX, lojaCurrentY, lojaColWidths[i], lojaRowHeight).fillAndStroke(bgColor, '#d1d5db');
        doc.fillColor('#333').fontSize(8).text(valor, lojaCurrentX + 5, lojaCurrentY + 6, { 
          width: lojaColWidths[i] - 10, 
          align: i === 0 ? 'left' : 'center' 
        });
        lojaCurrentX += lojaColWidths[i];
      });
      
      lojaCurrentY += lojaRowHeight;
      
      // Nova página se necessário
      if (lojaCurrentY > 700) {
        doc.addPage();
        lojaCurrentY = 50;
      }
    });
    
    // Rodapé
    doc.fontSize(8).fillColor('#999');
    doc.text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', 50, 750, { align: 'center', width: 500 });
    
    doc.end();
  });
}

/**
 * Gerar PDF de relatório mensal de serviços para loja
 */
export async function gerarPDFRelatorioLoja(dados: DadosRelatorioLoja): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const filename = `relatorio-servicos-${dados.lojaNome.replace(/\s+/g, '-')}-${dados.mesReferencia}.pdf`;
      const fileKey = `relatorios-servicos/${filename}`;
      
      try {
        const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        resolve({ url, filename });
      } catch (error) {
        reject(error);
      }
    });
    
    // Cabeçalho
    doc.fontSize(20).fillColor('#047857').text('PoweringEG Platform', { align: 'center' });
    doc.fontSize(14).fillColor('#333').text('Relatório Mensal de Serviços', { align: 'center' });
    doc.moveDown();
    
    // Informações do relatório
    const mesFormatado = formatarMes(dados.mesReferencia);
    doc.fontSize(11).fillColor('#666');
    doc.text(`Período: ${mesFormatado}`, { align: 'left' });
    doc.text(`Loja: ${dados.lojaNome}`, { align: 'left' });
    doc.text(`Volante: ${dados.volanteNome}`, { align: 'left' });
    doc.moveDown(2);
    
    // Resumo de Serviços
    doc.fontSize(14).fillColor('#047857').text('Serviços Realizados na Loja', { underline: true });
    doc.moveDown();
    
    const startY = doc.y;
    const colWidth = 120;
    const rowHeight = 25;
    
    // Cabeçalho da tabela
    doc.fontSize(10).fillColor('#fff');
    doc.rect(50, startY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.text('Tipo de Serviço', 55, startY + 8, { width: colWidth - 10 });
    
    doc.rect(50 + colWidth, startY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.text('Quantidade', 55 + colWidth, startY + 8, { width: colWidth - 10, align: 'center' });
    
    let currentY = startY + rowHeight;
    
    // Linhas da tabela
    const tiposServico = [
      { label: 'Substituição Ligeiro', valor: dados.totais.substituicaoLigeiro },
      { label: 'Reparação', valor: dados.totais.reparacao },
      { label: 'Calibragem', valor: dados.totais.calibragem },
      { label: 'Outros', valor: dados.totais.outros },
    ];
    
    doc.fillColor('#333');
    tiposServico.forEach((tipo, index) => {
      const bgColor = index % 2 === 0 ? '#f3f4f6' : '#ffffff';
      doc.rect(50, currentY, colWidth, rowHeight).fillAndStroke(bgColor, '#d1d5db');
      doc.fillColor('#333').text(tipo.label, 55, currentY + 8, { width: colWidth - 10 });
      
      doc.rect(50 + colWidth, currentY, colWidth, rowHeight).fillAndStroke(bgColor, '#d1d5db');
      doc.fillColor('#333').text(tipo.valor.toString(), 55 + colWidth, currentY + 8, { width: colWidth - 10, align: 'center' });
      
      currentY += rowHeight;
    });
    
    // Total geral
    doc.rect(50, currentY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.fillColor('#fff').fontSize(11).text('TOTAL GERAL', 55, currentY + 8, { width: colWidth - 10 });
    
    doc.rect(50 + colWidth, currentY, colWidth, rowHeight).fillAndStroke('#047857', '#047857');
    doc.fillColor('#fff').fontSize(11).text(dados.totais.total.toString(), 55 + colWidth, currentY + 8, { width: colWidth - 10, align: 'center' });
    
    doc.moveDown(4);
    
    // Mensagem de agradecimento
    doc.fontSize(11).fillColor('#333');
    doc.text('Agradecemos a colaboração e o apoio contínuo da vossa loja.', { align: 'center' });
    doc.text('Continuamos ao vosso dispor para qualquer necessidade.', { align: 'center' });
    
    // Rodapé
    doc.fontSize(8).fillColor('#999');
    doc.text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', 50, 750, { align: 'center', width: 500 });
    
    doc.end();
  });
}

/**
 * Formatar mês de YYYY-MM para "Mês de YYYY"
 */
function formatarMes(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${meses[parseInt(mes) - 1]} de ${ano}`;
}
