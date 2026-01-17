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

      const { kpis, resultados, complementares, alertas, periodoLabel, comparativoMesAnterior } = dashboardData;

      // Cores
      const verde = '#10b981';
      const vermelho = '#ef4444';
      const azul = '#3b82f6';
      const roxo = '#8b5cf6';
      const laranja = '#f97316';
      const cinza = '#6b7280';
      const cinzaClaro = '#f3f4f6';

      // ========== CABEÇALHO ==========
      doc.fontSize(24).fillColor('#1f2937').text('Relatório de Resultados', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(16).fillColor(verde).text(nomeLoja, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(cinza).text(`Período: ${periodoLabel}`, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { align: 'center' });
      
      doc.moveDown(1);

      // ========== KPIs PRINCIPAIS ==========
      doc.fontSize(14).fillColor('#1f2937').text('Indicadores Principais', { underline: true });
      doc.moveDown(0.5);

      // Tabela de KPIs
      const kpiY = doc.y;
      const colWidth = 125;
      
      // Serviços
      doc.rect(40, kpiY, colWidth, 60).fill(azul);
      doc.fillColor('white').fontSize(10).text('Serviços', 50, kpiY + 10);
      doc.fontSize(20).text(String(kpis.servicosRealizados), 50, kpiY + 28);
      
      // Objetivo
      doc.rect(40 + colWidth + 10, kpiY, colWidth, 60).fill(roxo);
      doc.fillColor('white').fontSize(10).text('Objetivo', 50 + colWidth + 10, kpiY + 10);
      doc.fontSize(20).text(String(kpis.objetivoMensal), 50 + colWidth + 10, kpiY + 28);
      
      // Desvio
      const desvioColor = kpis.desvioObjetivoDiario >= 0 ? verde : vermelho;
      doc.rect(40 + (colWidth + 10) * 2, kpiY, colWidth, 60).fill(desvioColor);
      doc.fillColor('white').fontSize(10).text('Desvio Obj. Diário', 50 + (colWidth + 10) * 2, kpiY + 10);
      doc.fontSize(20).text(`${kpis.desvioObjetivoDiario >= 0 ? '+' : ''}${kpis.desvioObjetivoDiario.toFixed(1)}%`, 50 + (colWidth + 10) * 2, kpiY + 28);
      
      // Taxa Reparação
      const taxaColor = kpis.taxaReparacao >= 22 ? verde : laranja;
      doc.rect(40 + (colWidth + 10) * 3, kpiY, colWidth, 60).fill(taxaColor);
      doc.fillColor('white').fontSize(10).text('Taxa Reparação', 50 + (colWidth + 10) * 3, kpiY + 10);
      doc.fontSize(20).text(`${kpis.taxaReparacao.toFixed(1)}%`, 50 + (colWidth + 10) * 3, kpiY + 28);

      doc.y = kpiY + 80;

      // ========== ALERTAS ==========
      if (alertas && alertas.length > 0) {
        doc.fontSize(14).fillColor('#1f2937').text('Alertas', { underline: true });
        doc.moveDown(0.3);
        
        alertas.forEach(alerta => {
          const alertaColor = alerta.tipo === 'success' ? verde : alerta.tipo === 'warning' ? laranja : vermelho;
          const icon = alerta.tipo === 'success' ? '✓' : alerta.tipo === 'warning' ? '⚠' : '✗';
          doc.fontSize(10).fillColor(alertaColor).text(`${icon} ${alerta.mensagem}`);
        });
        doc.moveDown(0.5);
      }

      // ========== VENDAS COMPLEMENTARES ==========
      doc.fontSize(14).fillColor('#1f2937').text('Vendas Complementares', { underline: true });
      doc.moveDown(0.5);

      const compY = doc.y;
      const compData = [
        { label: 'Escovas', valor: complementares.escovasQtd, percent: complementares.escovasPercent },
        { label: 'Polimento', valor: complementares.polimentoQtd },
        { label: 'Tratamento', valor: complementares.tratamentoQtd },
        { label: 'Lavagens', valor: complementares.lavagensTotal },
        { label: 'Outros', valor: complementares.outrosQtd },
      ];

      let compX = 40;
      compData.forEach((item, i) => {
        doc.rect(compX, compY, 100, 45).fill(cinzaClaro);
        doc.fillColor('#1f2937').fontSize(9).text(item.label, compX + 10, compY + 8);
        doc.fontSize(16).text(String(item.valor), compX + 10, compY + 22);
        if (item.percent !== undefined && item.percent !== null) {
          doc.fontSize(8).fillColor(cinza).text(`(${(item.percent * 100).toFixed(1)}%)`, compX + 50, compY + 26);
        }
        compX += 105;
      });

      doc.y = compY + 60;

      // ========== BARRA DE PROGRESSO ESCOVAS ==========
      doc.fontSize(12).fillColor('#1f2937').text('Progresso Escovas (Objetivo: 10%)');
      doc.moveDown(0.3);
      
      const barY = doc.y;
      const barWidth = 500;
      const escovasPercent = (complementares.escovasPercent || 0) * 100;
      const progressWidth = Math.min(escovasPercent / 15 * barWidth, barWidth); // Escala até 15%
      
      // Barra de fundo
      doc.rect(40, barY, barWidth, 20).fill(cinzaClaro);
      
      // Barra de progresso
      const progressColor = escovasPercent >= 10 ? verde : escovasPercent >= 7.5 ? laranja : vermelho;
      doc.rect(40, barY, progressWidth, 20).fill(progressColor);
      
      // Marcadores
      const marker75 = barWidth * (7.5 / 15);
      const marker10 = barWidth * (10 / 15);
      doc.strokeColor(cinza).lineWidth(2);
      doc.moveTo(40 + marker75, barY).lineTo(40 + marker75, barY + 20).stroke();
      doc.moveTo(40 + marker10, barY).lineTo(40 + marker10, barY + 20).stroke();
      
      doc.fontSize(8).fillColor(cinza);
      doc.text('7.5%', 40 + marker75 - 10, barY + 22);
      doc.text('10%', 40 + marker10 - 8, barY + 22);
      doc.text(`${escovasPercent.toFixed(1)}%`, 40 + progressWidth - 15, barY + 5);

      doc.y = barY + 45;

      // ========== COMPARATIVO MÊS ANTERIOR ==========
      doc.fontSize(14).fillColor('#1f2937').text('Comparativo com Mês Anterior', { underline: true });
      doc.moveDown(0.5);

      const compMesY = doc.y;
      const compMesData = [
        { label: 'Serviços', atual: kpis.servicosRealizados, anterior: comparativoMesAnterior.servicosAnterior, variacao: comparativoMesAnterior.variacaoServicos },
        { label: 'Reparações', atual: resultados.totalReparacoes, anterior: comparativoMesAnterior.reparacoesAnterior, variacao: comparativoMesAnterior.variacaoReparacoes },
        { label: 'Escovas', atual: complementares.escovasQtd, anterior: comparativoMesAnterior.escovasAnterior, variacao: comparativoMesAnterior.variacaoEscovas },
      ];

      let compMesX = 40;
      compMesData.forEach(item => {
        doc.rect(compMesX, compMesY, 170, 55).fill(cinzaClaro);
        doc.fillColor('#1f2937').fontSize(10).text(item.label, compMesX + 10, compMesY + 8);
        doc.fontSize(14).text(`${item.atual} (ant: ${item.anterior})`, compMesX + 10, compMesY + 24);
        
        if (item.variacao !== null) {
          const varColor = item.variacao >= 0 ? verde : vermelho;
          const varIcon = item.variacao >= 0 ? '↑' : '↓';
          doc.fontSize(10).fillColor(varColor).text(`${varIcon} ${Math.abs(item.variacao).toFixed(1)}%`, compMesX + 10, compMesY + 40);
        }
        compMesX += 175;
      });

      doc.y = compMesY + 70;

      // ========== ANÁLISE IA ==========
      if (analiseIA) {
        // Nova página se necessário
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(14).fillColor('#1f2937').text('Análise Inteligente', { underline: true });
        doc.moveDown(0.5);

        // Foco Urgente
        if (analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0) {
          doc.fontSize(11).fillColor(vermelho).text('🎯 Foco Urgente:');
          analiseIA.focoUrgente.forEach(item => {
            doc.fontSize(10).fillColor('#1f2937').text(`  • ${item}`);
          });
          doc.moveDown(0.3);
        }

        // Pontos Positivos
        if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
          doc.fontSize(11).fillColor(verde).text('✓ Pontos Positivos:');
          analiseIA.pontosPositivos.forEach(item => {
            doc.fontSize(10).fillColor('#1f2937').text(`  • ${item}`);
          });
          doc.moveDown(0.3);
        }

        // Resumo
        if (analiseIA.resumo) {
          doc.fontSize(11).fillColor(azul).text('💡 Resumo:');
          doc.fontSize(10).fillColor('#1f2937').text(analiseIA.resumo, { width: 500 });
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
          { align: 'center', width: doc.page.width - 80 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
