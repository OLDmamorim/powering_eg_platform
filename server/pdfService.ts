import PDFDocument from 'pdfkit';

interface DashboardData {
  kpis: {
    servicosRealizados: number;
    objetivoMensal: number;
    taxaReparacao: number;
    desvioObjetivoDiario: number;
    vendasComplementares: number;
  };
  resultados: {
    totalServicos: number;
    objetivoMensal: number;
    desvioPercentualMes: number | null;
    taxaReparacao: number | null;
    totalReparacoes: number;
    gapReparacoes22: number;
  };
  complementares: {
    escovasQtd: number;
    escovasPercent: number | null;
    polimentoQtd: number;
    tratamentoQtd: number;
    lavagensTotal: number;
    outrosQtd: number;
  };
  alertas: Array<{ tipo: 'warning' | 'danger' | 'success'; mensagem: string }>;
  periodoLabel: string;
  comparativoMesAnterior: {
    servicosAnterior: number;
    variacaoServicos: number | null;
    reparacoesAnterior: number;
    variacaoReparacoes: number | null;
    escovasAnterior: number;
    variacaoEscovas: number | null;
  };
  evolucao?: Array<{
    mes: number;
    ano: number;
    totalServicos: number;
    objetivoMensal: number;
    qtdReparacoes: number;
  }>;
}

interface AnaliseIA {
  focoUrgente: string[];
  pontosPositivos: string[];
  resumo: string;
}

// Helper para desenhar retângulo com texto centrado
function drawKPIBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: string,
  label: string,
  value: string
) {
  // Fundo
  doc.rect(x, y, width, height).fill(bgColor);
  
  // Label (pequeno, no topo)
  doc.fillColor('white').fontSize(9);
  doc.text(label, x, y + 8, { width, align: 'center' });
  
  // Valor (grande, centrado)
  doc.fontSize(22);
  doc.text(value, x, y + 25, { width, align: 'center' });
}

// Helper para desenhar caixa de complementar
function drawCompBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: number,
  percent?: string
) {
  doc.rect(x, y, width, height).fill('#f3f4f6');
  doc.fillColor('#374151').fontSize(9);
  doc.text(label, x + 8, y + 8, { width: width - 16 });
  doc.fontSize(18);
  doc.text(String(value), x + 8, y + 24, { width: width - 16 });
  if (percent) {
    doc.fontSize(8).fillColor('#6b7280');
    doc.text(percent, x + 8, y + 45, { width: width - 16 });
  }
}

export async function gerarPDFResultados(
  nomeLoja: string,
  dashboardData: DashboardData,
  analiseIA?: AnaliseIA | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true 
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { kpis, complementares, alertas, periodoLabel, comparativoMesAnterior, resultados } = dashboardData;

      // Cores
      const verde = '#10b981';
      const vermelho = '#ef4444';
      const azul = '#3b82f6';
      const roxo = '#8b5cf6';
      const laranja = '#f97316';
      const cinza = '#6b7280';

      const pageWidth = doc.page.width - 80; // 40 margin each side
      let currentY = 40;

      // ========== CABEÇALHO ==========
      doc.fontSize(22).fillColor('#1f2937');
      doc.text('Relatório de Resultados', 40, currentY, { align: 'center', width: pageWidth });
      currentY += 30;
      
      doc.fontSize(16).fillColor(verde);
      doc.text(nomeLoja, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 22;
      
      doc.fontSize(10).fillColor(cinza);
      doc.text(`Período: ${periodoLabel}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 14;
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 30;

      // ========== KPIs PRINCIPAIS ==========
      doc.fontSize(13).fillColor('#1f2937');
      doc.text('Indicadores Principais', 40, currentY);
      currentY += 20;

      // 4 KPIs em linha
      const kpiWidth = (pageWidth - 30) / 4; // 30 = 3 gaps de 10px
      const kpiHeight = 55;
      
      // Serviços (azul)
      drawKPIBox(doc, 40, currentY, kpiWidth, kpiHeight, azul, 'Serviços', String(kpis.servicosRealizados));
      
      // Objetivo (roxo)
      drawKPIBox(doc, 40 + kpiWidth + 10, currentY, kpiWidth, kpiHeight, roxo, 'Objetivo', String(kpis.objetivoMensal));
      
      // Desvio Obj. Diário (verde/vermelho)
      const desvioColor = kpis.desvioObjetivoDiario >= 0 ? verde : vermelho;
      const desvioValue = `${kpis.desvioObjetivoDiario >= 0 ? '+' : ''}${kpis.desvioObjetivoDiario.toFixed(1)}%`;
      drawKPIBox(doc, 40 + (kpiWidth + 10) * 2, currentY, kpiWidth, kpiHeight, desvioColor, 'Desvio Obj. Diário', desvioValue);
      
      // Taxa Reparação (verde/laranja)
      const taxaColor = kpis.taxaReparacao >= 22 ? verde : laranja;
      drawKPIBox(doc, 40 + (kpiWidth + 10) * 3, currentY, kpiWidth, kpiHeight, taxaColor, 'Taxa Reparação', `${kpis.taxaReparacao.toFixed(1)}%`);
      
      currentY += kpiHeight + 25;

      // ========== ALERTAS ==========
      if (alertas && alertas.length > 0) {
        doc.fontSize(13).fillColor('#1f2937');
        doc.text('Alertas', 40, currentY);
        currentY += 18;
        
        alertas.forEach(alerta => {
          const alertaColor = alerta.tipo === 'success' ? verde : alerta.tipo === 'warning' ? laranja : vermelho;
          const icon = alerta.tipo === 'success' ? '✓' : alerta.tipo === 'warning' ? '!' : '✗';
          doc.fontSize(10).fillColor(alertaColor);
          doc.text(`${icon} ${alerta.mensagem}`, 50, currentY, { width: pageWidth - 20 });
          currentY += 14;
        });
        currentY += 15;
      }

      // ========== VENDAS COMPLEMENTARES ==========
      doc.fontSize(13).fillColor('#1f2937');
      doc.text('Vendas Complementares', 40, currentY);
      currentY += 18;

      // 5 caixas em linha
      const compWidth = (pageWidth - 40) / 5; // 40 = 4 gaps de 10px
      const compHeight = 58;
      
      const escovasPercent = complementares.escovasPercent !== null ? `(${(complementares.escovasPercent * 100).toFixed(1)}%)` : '';
      
      drawCompBox(doc, 40, currentY, compWidth, compHeight, 'Escovas', complementares.escovasQtd, escovasPercent);
      drawCompBox(doc, 40 + compWidth + 10, currentY, compWidth, compHeight, 'Polimento', complementares.polimentoQtd);
      drawCompBox(doc, 40 + (compWidth + 10) * 2, currentY, compWidth, compHeight, 'Tratamento', complementares.tratamentoQtd);
      drawCompBox(doc, 40 + (compWidth + 10) * 3, currentY, compWidth, compHeight, 'Lavagens', complementares.lavagensTotal);
      drawCompBox(doc, 40 + (compWidth + 10) * 4, currentY, compWidth, compHeight, 'Outros', complementares.outrosQtd);
      
      currentY += compHeight + 25;

      // ========== BARRA DE PROGRESSO ESCOVAS ==========
      doc.fontSize(12).fillColor('#1f2937');
      doc.text('Progresso Escovas (Objetivo: 10%)', 40, currentY);
      currentY += 16;
      
      const barWidth = pageWidth;
      const barHeight = 22;
      const escovasPercValue = (complementares.escovasPercent || 0) * 100;
      const maxPercent = 15; // Escala até 15%
      const progressWidth = Math.min((escovasPercValue / maxPercent) * barWidth, barWidth);
      
      // Barra de fundo
      doc.rect(40, currentY, barWidth, barHeight).fill('#e5e7eb');
      
      // Barra de progresso
      const progressColor = escovasPercValue >= 10 ? verde : escovasPercValue >= 7.5 ? laranja : vermelho;
      if (progressWidth > 0) {
        doc.rect(40, currentY, progressWidth, barHeight).fill(progressColor);
      }
      
      // Marcadores
      const marker75X = 40 + (7.5 / maxPercent) * barWidth;
      const marker10X = 40 + (10 / maxPercent) * barWidth;
      
      doc.strokeColor('#374151').lineWidth(2);
      doc.moveTo(marker75X, currentY).lineTo(marker75X, currentY + barHeight).stroke();
      doc.moveTo(marker10X, currentY).lineTo(marker10X, currentY + barHeight).stroke();
      
      // Labels dos marcadores
      doc.fontSize(8).fillColor('#374151');
      doc.text('7.5%', marker75X - 12, currentY + barHeight + 3);
      doc.text('10%', marker10X - 10, currentY + barHeight + 3);
      
      // Valor atual
      doc.fontSize(10).fillColor('white');
      if (progressWidth > 40) {
        doc.text(`${escovasPercValue.toFixed(1)}%`, 40 + progressWidth - 35, currentY + 5);
      } else {
        doc.fillColor('#374151');
        doc.text(`${escovasPercValue.toFixed(1)}%`, 40 + progressWidth + 5, currentY + 5);
      }
      
      currentY += barHeight + 30;

      // ========== COMPARATIVO MÊS ANTERIOR ==========
      doc.fontSize(13).fillColor('#1f2937');
      doc.text('Comparativo com Mês Anterior', 40, currentY);
      currentY += 18;

      // 3 caixas em linha
      const compMesWidth = (pageWidth - 20) / 3; // 20 = 2 gaps de 10px
      const compMesHeight = 65;
      
      // Serviços
      doc.rect(40, currentY, compMesWidth, compMesHeight).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(10);
      doc.text('Serviços', 50, currentY + 8);
      doc.fontSize(16);
      doc.text(`${kpis.servicosRealizados} (ant: ${comparativoMesAnterior.servicosAnterior})`, 50, currentY + 24);
      if (comparativoMesAnterior.variacaoServicos !== null) {
        const varColor = comparativoMesAnterior.variacaoServicos >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoServicos >= 0 ? '↑' : '↓';
        doc.fontSize(11).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoServicos).toFixed(1)}%`, 50, currentY + 46);
      }
      
      // Reparações
      doc.rect(40 + compMesWidth + 10, currentY, compMesWidth, compMesHeight).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(10);
      doc.text('Reparações', 50 + compMesWidth + 10, currentY + 8);
      doc.fontSize(16);
      doc.text(`${resultados.totalReparacoes} (ant: ${comparativoMesAnterior.reparacoesAnterior})`, 50 + compMesWidth + 10, currentY + 24);
      if (comparativoMesAnterior.variacaoReparacoes !== null) {
        const varColor = comparativoMesAnterior.variacaoReparacoes >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoReparacoes >= 0 ? '↑' : '↓';
        doc.fontSize(11).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoReparacoes).toFixed(1)}%`, 50 + compMesWidth + 10, currentY + 46);
      }
      
      // Escovas
      doc.rect(40 + (compMesWidth + 10) * 2, currentY, compMesWidth, compMesHeight).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(10);
      doc.text('Escovas', 50 + (compMesWidth + 10) * 2, currentY + 8);
      doc.fontSize(16);
      doc.text(`${complementares.escovasQtd} (ant: ${comparativoMesAnterior.escovasAnterior})`, 50 + (compMesWidth + 10) * 2, currentY + 24);
      if (comparativoMesAnterior.variacaoEscovas !== null) {
        const varColor = comparativoMesAnterior.variacaoEscovas >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoEscovas >= 0 ? '↑' : '↓';
        doc.fontSize(11).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoEscovas).toFixed(1)}%`, 50 + (compMesWidth + 10) * 2, currentY + 46);
      }
      
      currentY += compMesHeight + 25;

      // ========== ANÁLISE IA ==========
      if (analiseIA) {
        // Verificar se precisa de nova página
        if (currentY > 650) {
          doc.addPage();
          currentY = 40;
        }
        
        doc.fontSize(13).fillColor('#1f2937');
        doc.text('Análise Inteligente', 40, currentY);
        currentY += 20;

        // Foco Urgente
        if (analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0) {
          doc.fontSize(11).fillColor(vermelho);
          doc.text('Foco Urgente:', 40, currentY);
          currentY += 14;
          analiseIA.focoUrgente.forEach(item => {
            doc.fontSize(10).fillColor('#374151');
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += 14;
          });
          currentY += 8;
        }

        // Pontos Positivos
        if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
          doc.fontSize(11).fillColor(verde);
          doc.text('Pontos Positivos:', 40, currentY);
          currentY += 14;
          analiseIA.pontosPositivos.forEach(item => {
            doc.fontSize(10).fillColor('#374151');
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += 14;
          });
          currentY += 8;
        }

        // Resumo
        if (analiseIA.resumo) {
          doc.fontSize(11).fillColor(azul);
          doc.text('Resumo:', 40, currentY);
          currentY += 14;
          doc.fontSize(10).fillColor('#374151');
          doc.text(analiseIA.resumo, 50, currentY, { width: pageWidth - 20 });
        }
      }

      // ========== RODAPÉ ==========
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(cinza);
        doc.text(
          `PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass | Página ${i + 1} de ${pageCount}`,
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
