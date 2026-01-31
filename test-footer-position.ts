import PDFDocument from 'pdfkit';
import * as fs from 'fs';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 60, left: 40, right: 40 },
  bufferPages: true,
});

const chunks: Buffer[] = [];
doc.on('data', (chunk) => chunks.push(chunk));
doc.on('end', () => {
  const pdf = Buffer.concat(chunks);
  fs.writeFileSync('/tmp/test-footer.pdf', pdf);
  console.log('PDF salvo em /tmp/test-footer.pdf');
  console.log('Páginas:', doc.bufferedPageRange().count);
});

// Página 1 - conteúdo simples
doc.fontSize(20).text('Página 1 - Teste de Rodapé', 40, 100);
doc.fontSize(12).text('Este é um teste para verificar a posição do rodapé.', 40, 150);

// Adicionar rodapé
const range = doc.bufferedPageRange();
console.log('Range antes do rodapé:', range);

for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  const footerY = 841.89 - 30; // A4 height - 30pt
  console.log(`Página ${i}: footerY = ${footerY}`);
  doc.fontSize(8)
     .fillColor('#999999')
     .text('Rodapé de teste', 40, footerY, { align: 'center', width: 515 });
}

doc.flushPages();
doc.end();
