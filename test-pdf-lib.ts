import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';

async function main() {
  // Ler o PDF gerado pelo PDFKit
  const pdfBytes = fs.readFileSync('/tmp/test-pdf-short.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  console.log('Total de páginas:', pages.length);
  
  // Verificar cada página
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    console.log(`Página ${i + 1}: ${width}x${height}`);
    
    // Adicionar rodapé no fundo de cada página
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const text = 'PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass';
    const textWidth = font.widthOfTextAtSize(text, 8);
    
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: 20, // 20pt do fundo
      size: 8,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }
  
  // Remover páginas vazias (páginas 3 e 4 se existirem)
  // Verificar se as páginas têm conteúdo significativo
  // Por agora, vamos manter apenas as primeiras 2 páginas se houver mais
  while (pdfDoc.getPageCount() > 2) {
    pdfDoc.removePage(pdfDoc.getPageCount() - 1);
    console.log('Removida página vazia');
  }
  
  // Salvar o PDF modificado
  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync('/tmp/test-pdf-fixed.pdf', modifiedPdfBytes);
  console.log('PDF corrigido salvo em /tmp/test-pdf-fixed.pdf');
  console.log('Páginas finais:', pdfDoc.getPageCount());
}

main().catch(console.error);
