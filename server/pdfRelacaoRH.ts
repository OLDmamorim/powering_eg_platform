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

      // ========== CABEÇALHO ==========
      doc.fontSize(24).fillColor(verde).font('Helvetica-Bold');
      doc.text('EXPRESSGLASS', 40, currentY, { align: 'center', width: pageWidth });
      currentY += 30;

      doc.fontSize(16).fillColor('#1f2937').font('Helvetica');
      doc.text('Relação de Colaboradores', 40, currentY, { align: 'center', width: pageWidth });
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

        // Cabeçalho da loja
        doc.rect(40, currentY, pageWidth, 25).fill(verde);
        doc.fontSize(11).fillColor('white').font('Helvetica-Bold');
        const lojaTexto = `🏪 ${loja.nome}${loja.numeroLoja ? ` (Loja ${loja.numeroLoja})` : ''} - ${colaboradores.length} colaborador${colaboradores.length !== 1 ? 'es' : ''}`;
        doc.text(lojaTexto, 50, currentY + 7, { width: pageWidth - 20 });
        currentY += 30;

        // Cabeçalho da tabela
        doc.rect(40, currentY, pageWidth, 20).fill('#f3f4f6');
        doc.fontSize(9).fillColor('#374151').font('Helvetica-Bold');
        doc.text('Nome', 50, currentY + 6);
        doc.text('Código', 280, currentY + 6);
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
        doc.text(`🚗 Volantes da Zona - ${dados.volantes.length} colaborador${dados.volantes.length !== 1 ? 'es' : ''}`, 50, currentY + 7);
        currentY += 30;

        doc.rect(40, currentY, pageWidth, 20).fill('#dbeafe');
        doc.fontSize(9).fillColor('#1e40af').font('Helvetica-Bold');
        doc.text('Nome', 50, currentY + 6);
        doc.text('Código', 280, currentY + 6);
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
        doc.text(`🔧 Recalbra - ${dados.recalbras.length} colaborador${dados.recalbras.length !== 1 ? 'es' : ''}`, 50, currentY + 7);
        currentY += 30;

        doc.rect(40, currentY, pageWidth, 20).fill('#fed7aa');
        doc.fontSize(9).fillColor('#9a3412').font('Helvetica-Bold');
        doc.text('Nome', 50, currentY + 6);
        doc.text('Código', 280, currentY + 6);
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
        doc.text('📝 Observações do Gestor:', 50, currentY + 10);
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
          `PoweringEG Platform - Página ${i + 1} de ${totalPages}`,
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
