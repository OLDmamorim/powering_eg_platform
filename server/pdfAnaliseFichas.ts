/**
 * Serviço para gerar PDF do Relatório de Análise de Fichas de Serviço
 * Converte o relatório para PDF em base64
 */

export async function gerarPDFAnaliseFichas(relatorio: {
  nomeLoja: string;
  numeroLoja: number | null;
  totalFichas: number;
  fichasAbertas5Dias: number;
  fichasAposAgendamento: number;
  fichasStatusAlerta: number;
  fichasSemNotas: number;
  fichasNotasAntigas: number;
  fichasDevolverVidro: number;
  fichasSemEmailCliente: number;
  resumo: string;
  conteudoRelatorio: string;
}, dataAnalise: Date): Promise<string> {
  const PDFDocument = (await import('pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const base64 = pdfBuffer.toString('base64');
        resolve(base64);
      });
      doc.on('error', reject);
      
      const pageWidth = 515; // A4 width - margins
      
      // Cabeçalho com logo em texto
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#e53935')
         .text('EXPRESS', 40, 40, { continued: true })
         .fillColor('#1a365d')
         .font('Helvetica')
         .text('GLASS');
      
      doc.moveDown(0.5);
      
      // Título do relatório
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Análise de Fichas de Serviço', { align: 'center' });
      
      const dataFormatada = dataAnalise.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text(dataFormatada, { align: 'center' });
      
      doc.moveDown(1);
      
      // Linha separadora
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      
      // Aviso para imprimir
      const avisoY = doc.y;
      doc.rect(40, avisoY, pageWidth, 30)
         .fillColor('#fef3c7')
         .fill();
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#92400e')
         .text('⚠️ IMPRIMIR ESTE RELATÓRIO E ATUAR EM CONFORMIDADE NOS PROCESSOS IDENTIFICADOS', 50, avisoY + 10, { align: 'center' });
      
      doc.moveDown(1.5);
      
      // Nome da loja
      const numeroLojaTexto = relatorio.numeroLoja ? ` (#${relatorio.numeroLoja})` : '';
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text(`${relatorio.nomeLoja}${numeroLojaTexto}`);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Relatório de Monitorização de Fichas de Serviço');
      
      doc.moveDown(0.5);
      
      // Linha separadora
      doc.strokeColor('#333333')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // Métricas em tabela horizontal
      const metricasY = doc.y;
      const metricaWidth = pageWidth / 4;
      
      const metricas = [
        { label: 'Total Fichas', valor: relatorio.totalFichas, cor: '#333333' },
        { label: 'Abertas +5 dias', valor: relatorio.fichasAbertas5Dias, cor: relatorio.fichasAbertas5Dias > 0 ? '#dc2626' : '#059669' },
        { label: 'Status Alerta', valor: relatorio.fichasStatusAlerta, cor: relatorio.fichasStatusAlerta > 0 ? '#ea580c' : '#059669' },
        { label: 'Sem Notas', valor: relatorio.fichasSemNotas, cor: relatorio.fichasSemNotas > 0 ? '#d97706' : '#059669' },
      ];
      
      metricas.forEach((metrica, index) => {
        const x = 40 + (index * metricaWidth);
        
        // Valor grande
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor(metrica.cor)
           .text(String(metrica.valor), x, metricasY, { width: metricaWidth, align: 'center' });
        
        // Label pequeno
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666666')
           .text(metrica.label.toUpperCase(), x, metricasY + 28, { width: metricaWidth, align: 'center' });
      });
      
      doc.y = metricasY + 55;
      doc.moveDown(1);
      
      // Linha separadora
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // Resumo da Análise
      if (relatorio.resumo) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text('Resumo da Análise');
        
        doc.moveDown(0.5);
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#333333')
           .text(relatorio.resumo, { width: pageWidth, lineGap: 3 });
        
        doc.moveDown(1);
      }
      
      // Conteúdo do relatório (processar HTML para texto)
      const conteudoTexto = processarHTMLParaTexto(relatorio.conteudoRelatorio);
      
      if (conteudoTexto) {
        // Verificar se precisa de nova página
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text('Detalhes das Fichas');
        
        doc.moveDown(0.5);
        
        // Processar o conteúdo linha por linha
        const linhas = conteudoTexto.split('\n');
        
        for (const linha of linhas) {
          // Verificar se precisa de nova página
          if (doc.y > 750) {
            doc.addPage();
          }
          
          const linhaLimpa = linha.trim();
          if (!linhaLimpa) {
            doc.moveDown(0.3);
            continue;
          }
          
          // Título de secção (em maiúsculas ou com emoji)
          if (linhaLimpa.startsWith('🔴') || linhaLimpa.startsWith('🟠') || linhaLimpa.startsWith('🟡') || 
              linhaLimpa.startsWith('📋') || linhaLimpa.startsWith('⚠️') || linhaLimpa.startsWith('📧') ||
              linhaLimpa.match(/^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+:$/)) {
            doc.moveDown(0.5);
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text(linhaLimpa);
            doc.moveDown(0.3);
          }
          // Item de lista
          else if (linhaLimpa.startsWith('•') || linhaLimpa.startsWith('-') || linhaLimpa.match(/^\d+\./)) {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#333333')
               .text(linhaLimpa, { indent: 15, width: pageWidth - 15, lineGap: 2 });
          }
          // Texto normal
          else {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#333333')
               .text(linhaLimpa, { width: pageWidth, lineGap: 2 });
          }
        }
      }
      
      // Rodapé
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#999999')
           .text(
             'PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass',
             40,
             doc.page.height - 30,
             { align: 'center', width: pageWidth }
           );
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Converte HTML para texto simples
 */
function processarHTMLParaTexto(html: string): string {
  if (!html) return '';
  
  let texto = html;
  
  // Remover tags de estilo e script
  texto = texto.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  texto = texto.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Converter headers para texto com quebra de linha
  texto = texto.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n');
  
  // Converter parágrafos
  texto = texto.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
  
  // Converter listas
  texto = texto.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
  texto = texto.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n');
  
  // Converter divs e spans
  texto = texto.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  texto = texto.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  
  // Converter strong/bold
  texto = texto.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
  texto = texto.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
  
  // Converter br
  texto = texto.replace(/<br\s*\/?>/gi, '\n');
  
  // Remover todas as outras tags HTML
  texto = texto.replace(/<[^>]+>/g, '');
  
  // Decodificar entidades HTML
  texto = texto.replace(/&nbsp;/g, ' ');
  texto = texto.replace(/&amp;/g, '&');
  texto = texto.replace(/&lt;/g, '<');
  texto = texto.replace(/&gt;/g, '>');
  texto = texto.replace(/&quot;/g, '"');
  texto = texto.replace(/&#39;/g, "'");
  
  // Limpar espaços extras
  texto = texto.replace(/\n\s*\n\s*\n/g, '\n\n');
  texto = texto.replace(/  +/g, ' ');
  
  return texto.trim();
}
