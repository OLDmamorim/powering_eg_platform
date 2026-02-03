import PDFDocument from 'pdfkit';

interface ColaboradorRH {
  nome: string;
  codigoColaborador?: string | null;
  cargo: string;
  tipo: string;
}

interface LojaComColaboradores {
  loja: { id: number; nome: string; numeroLoja?: number | null };
  colaboradores: ColaboradorRH[];
}

interface DadosRelacaoRH {
  gestorNome: string;
  mes: string;
  totalColaboradores: number;
  colaboradoresPorLoja: LojaComColaboradores[];
  volantes: ColaboradorRH[];
  recalbras: ColaboradorRH[];
  observacoes?: string;
}

const cargoNomes: Record<string, string> = {
  'responsavel_loja': 'Responsável de Loja',
  'tecnico': 'Técnico',
  'administrativo': 'Administrativo'
};

// Logo ExpressGlass em base64 (PNG)
const LOGO_BASE64 = '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';

export async function gerarPDFRelacaoRH(dados: DadosRelacaoRH): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      let currentY = 40;

      // Cores
      const verde = '#059669';
      const azul = '#3b82f6';
      const laranja = '#f97316';
      const cinza = '#6b7280';

      // ========== CABEÇALHO COM LOGO ==========
      try {
        const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
        const logoWidth = 180;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoBuffer, logoX, currentY, { width: logoWidth });
        currentY += 55;
      } catch (logoError) {
        // Fallback para texto se o logo falhar
        doc.fontSize(24).fillColor(verde).font('Helvetica-Bold');
        doc.text('EXPRESSGLASS', 40, currentY, { align: 'center', width: pageWidth });
        currentY += 30;
      }

      doc.fontSize(16).fillColor('#1f2937').font('Helvetica');
      doc.text('Relacao de Colaboradores', 40, currentY, { align: 'center', width: pageWidth });
      currentY += 20;

      doc.fontSize(12).fillColor(cinza);
      const mesCapitalizado = dados.mes.charAt(0).toUpperCase() + dados.mes.slice(1);
      doc.text(mesCapitalizado, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 30;

      // Linha separadora
      doc.moveTo(40, currentY).lineTo(doc.page.width - 40, currentY).stroke(verde);
      currentY += 20;

      // ========== INFO BOX ==========
      doc.rect(40, currentY, pageWidth, 70).fill('#f0fdf4').stroke('#bbf7d0');
      
      doc.fontSize(11).fillColor('#166534').font('Helvetica-Bold');
      doc.text('Gestor:', 55, currentY + 12);
      doc.font('Helvetica').text(dados.gestorNome, 110, currentY + 12);
      
      doc.font('Helvetica-Bold').text('Total de Colaboradores:', 55, currentY + 30);
      doc.font('Helvetica').text(dados.totalColaboradores.toString(), 190, currentY + 30);
      
      doc.font('Helvetica-Bold').text('Data de Envio:', 55, currentY + 48);
      const dataEnvio = new Date().toLocaleDateString('pt-PT', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.font('Helvetica').text(dataEnvio, 145, currentY + 48);
      
      currentY += 90;

      // ========== LOJAS COM COLABORADORES ==========
      for (const { loja, colaboradores } of dados.colaboradoresPorLoja) {
        if (colaboradores.length === 0) continue;

        // Verificar se precisa de nova página
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 40;
        }

        // Cabeçalho da loja (sem emoji)
        doc.rect(40, currentY, pageWidth, 25).fill(verde);
        doc.fontSize(11).fillColor('white').font('Helvetica-Bold');
        const lojaTexto = `${loja.nome}${loja.numeroLoja ? ` (Loja ${loja.numeroLoja})` : ''} - ${colaboradores.length} colaborador${colaboradores.length !== 1 ? 'es' : ''}`;
        doc.text(lojaTexto, 50, currentY + 7, { width: pageWidth - 20 });
        currentY += 30;

        // Cabeçalho da tabela
        doc.rect(40, currentY, pageWidth, 20).fill('#f3f4f6');
        doc.fontSize(9).fillColor('#374151').font('Helvetica-Bold');
        doc.text('Nome', 50, currentY + 6);
        doc.text('Codigo', 280, currentY + 6);
        doc.text('Cargo', 360, currentY + 6);
        currentY += 22;

        // Linhas de colaboradores
        colaboradores.forEach((colab, index) => {
          if (currentY > doc.page.height - 60) {
            doc.addPage();
            currentY = 40;
          }

          const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
          doc.rect(40, currentY, pageWidth, 18).fill(bgColor);
          
          doc.fontSize(9).fillColor('#1f2937').font('Helvetica');
          doc.text(colab.nome, 50, currentY + 5, { width: 220 });
          doc.text(colab.codigoColaborador || '-', 280, currentY + 5);
          doc.text(cargoNomes[colab.cargo] || colab.cargo, 360, currentY + 5);
          currentY += 18;
        });

        currentY += 15;
      }

      // ========== VOLANTES ==========
      if (dados.volantes.length > 0) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 40;
        }

        doc.rect(40, currentY, pageWidth, 25).fill(azul);
        doc.fontSize(11).fillColor('white').font('Helvetica-Bold');
        doc.text(`Volantes da Zona - ${dados.volantes.length} colaborador${dados.volantes.length !== 1 ? 'es' : ''}`, 50, currentY + 7);
        currentY += 30;

        doc.rect(40, currentY, pageWidth, 20).fill('#dbeafe');
        doc.fontSize(9).fillColor('#1e40af').font('Helvetica-Bold');
        doc.text('Nome', 50, currentY + 6);
        doc.text('Codigo', 280, currentY + 6);
        doc.text('Cargo', 360, currentY + 6);
        currentY += 22;

        dados.volantes.forEach((colab, index) => {
          if (currentY > doc.page.height - 60) {
            doc.addPage();
            currentY = 40;
          }

          const bgColor = index % 2 === 0 ? '#eff6ff' : '#dbeafe';
          doc.rect(40, currentY, pageWidth, 18).fill(bgColor);
          
          doc.fontSize(9).fillColor('#1e40af').font('Helvetica');
          doc.text(colab.nome, 50, currentY + 5, { width: 220 });
          doc.text(colab.codigoColaborador || '-', 280, currentY + 5);
          doc.text(cargoNomes[colab.cargo] || colab.cargo, 360, currentY + 5);
          currentY += 18;
        });

        currentY += 15;
      }

      // ========== RECALBRA ==========
      if (dados.recalbras.length > 0) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 40;
        }

        doc.rect(40, currentY, pageWidth, 25).fill(laranja);
        doc.fontSize(11).fillColor('white').font('Helvetica-Bold');
        doc.text(`Recalbra - ${dados.recalbras.length} colaborador${dados.recalbras.length !== 1 ? 'es' : ''}`, 50, currentY + 7);
        currentY += 30;

        doc.rect(40, currentY, pageWidth, 20).fill('#fed7aa');
        doc.fontSize(9).fillColor('#9a3412').font('Helvetica-Bold');
        doc.text('Nome', 50, currentY + 6);
        doc.text('Codigo', 280, currentY + 6);
        doc.text('Cargo', 360, currentY + 6);
        currentY += 22;

        dados.recalbras.forEach((colab, index) => {
          if (currentY > doc.page.height - 60) {
            doc.addPage();
            currentY = 40;
          }

          const bgColor = index % 2 === 0 ? '#fff7ed' : '#fed7aa';
          doc.rect(40, currentY, pageWidth, 18).fill(bgColor);
          
          doc.fontSize(9).fillColor('#9a3412').font('Helvetica');
          doc.text(colab.nome, 50, currentY + 5, { width: 220 });
          doc.text(colab.codigoColaborador || '-', 280, currentY + 5);
          doc.text(cargoNomes[colab.cargo] || colab.cargo, 360, currentY + 5);
          currentY += 18;
        });

        currentY += 15;
      }

      // ========== OBSERVAÇÕES ==========
      if (dados.observacoes) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 40;
        }

        doc.rect(40, currentY, pageWidth, 60).fill('#fef3c7').stroke('#f59e0b');
        doc.fontSize(10).fillColor('#92400e').font('Helvetica-Bold');
        doc.text('Observacoes do Gestor:', 50, currentY + 10);
        doc.font('Helvetica').fontSize(9);
        doc.text(dados.observacoes, 50, currentY + 28, { width: pageWidth - 20 });
        currentY += 70;
      }

      // ========== RODAPÉ ==========
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(cinza).font('Helvetica');
        doc.text(
          `PoweringEG Platform - Pagina ${i + 1} de ${totalPages}`,
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
