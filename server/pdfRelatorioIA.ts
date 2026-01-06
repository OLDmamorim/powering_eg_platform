/**
 * Serviço para gerar PDF do Relatório IA
 * Converte o conteúdo markdown do relatório para PDF em base64
 */

export async function gerarPDFRelatorioIA(conteudo: string, dataRelatorio: Date): Promise<string> {
  // Usar PDFKit para gerar o PDF
  const PDFDocument = (await import('pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
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
      
      // Cabeçalho
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('Relatório IA - Análise Executiva', { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(11)
         .font('Helvetica')
         .text(`Data: ${new Date(dataRelatorio).toLocaleDateString('pt-PT', {
           day: '2-digit',
           month: 'long',
           year: 'numeric',
         })}`, { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(9)
         .text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, { align: 'center' });
      
      doc.moveDown(1);
      
      // Linha separadora
      doc.strokeColor('#cccccc')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // Processar o conteúdo markdown
      const linhas = conteudo.split('\n');
      
      for (const linha of linhas) {
        // Verificar se precisa de nova página
        if (doc.y > 750) {
          doc.addPage();
        }
        
        // Título principal (#)
        if (linha.startsWith('# ')) {
          doc.moveDown(0.5);
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .text(limparTexto(linha.replace(/^# /, '')));
          doc.moveDown(0.5);
        }
        // Subtítulo (##)
        else if (linha.startsWith('## ')) {
          doc.moveDown(0.5);
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .text(limparTexto(linha.replace(/^## /, '')));
          doc.moveDown(0.3);
        }
        // Sub-subtítulo (###)
        else if (linha.startsWith('### ')) {
          doc.moveDown(0.3);
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(limparTexto(linha.replace(/^### /, '')));
          doc.moveDown(0.2);
        }
        // Bullet points
        else if (linha.trim().startsWith('- ') || linha.trim().startsWith('* ')) {
          const texto = linha.replace(/^\s*[-*]\s*/, '');
          doc.fontSize(10)
             .font('Helvetica')
             .text(`• ${limparTexto(texto)}`, { indent: 15 });
        }
        // Linhas em branco
        else if (linha.trim() === '') {
          doc.moveDown(0.3);
        }
        // Texto normal
        else if (linha.trim()) {
          doc.fontSize(10)
             .font('Helvetica')
             .text(limparTexto(linha));
        }
      }
      
      // Adicionar rodapé em todas as páginas
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#888888')
           .text(
             `PoweringEG Platform - Página ${i + 1} de ${range.count}`,
             50,
             780,
             { align: 'center' }
           );
        doc.fillColor('#000000');
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Limpar texto de formatação markdown e emojis
 */
function limparTexto(texto: string): string {
  return texto
    // Remover negrito e itálico
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remover emojis comuns
    .replace(/[📊🎯📈💡⚠️🔍📋✅❌🏆📉🔔🚨🏷️]/g, '')
    .trim();
}
