import PDFDocument from 'pdfkit';

interface EvolucaoItem {
  mes: number;
  ano: number;
  totalServicos: number | null;
  objetivoMensal: number | null;
  qtdReparacoes: number | null;
}

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
  ritmo?: {
    servicosFaltam: number;
    diasUteisRestantes: number;
    servicosPorDia: number;
    gapReparacoes: number;
  };
  evolucao?: EvolucaoItem[];
}

interface AnaliseIA {
  focoUrgente: string[];
  pontosPositivos: string[];
  resumo: string;
}

// Cores
const verde = '#10b981';
const vermelho = '#ef4444';
const azul = '#3b82f6';
const roxo = '#8b5cf6';
const laranja = '#f97316';
const cinza = '#6b7280';
const cinzaClaro = '#f3f4f6';

// Helper para desenhar KPI box
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
  doc.rect(x, y, width, height).fill(bgColor);
  doc.fillColor('white').fontSize(9);
  doc.text(label, x, y + 8, { width, align: 'center' });
  doc.fontSize(20);
  doc.text(value, x, y + 26, { width, align: 'center' });
}

// Helper para desenhar caixa de info
function drawInfoBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  subtext?: string,
  bgColor: string = cinzaClaro
) {
  doc.rect(x, y, width, height).fill(bgColor);
  doc.fillColor('#374151').fontSize(9);
  doc.text(label, x + 8, y + 6, { width: width - 16 });
  doc.fontSize(16);
  doc.text(value, x + 8, y + 20, { width: width - 16 });
  if (subtext) {
    doc.fontSize(8).fillColor(cinza);
    doc.text(subtext, x + 8, y + 40, { width: width - 16 });
  }
}

// Helper para desenhar gráfico de barras simples
function drawBarChart(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { label: string; value: number; objetivo?: number }[],
  title: string,
  maxValue?: number
) {
  // Título
  doc.fontSize(11).fillColor('#374151');
  doc.text(title, x, y);
  y += 16;
  
  const chartHeight = height - 20;
  const barWidth = (width - 40) / data.length;
  const max = maxValue || Math.max(...data.map(d => Math.max(d.value, d.objetivo || 0))) * 1.2;
  
  // Desenhar barras
  data.forEach((item, i) => {
    const barX = x + 20 + i * barWidth;
    const barH = (item.value / max) * chartHeight;
    
    // Barra de valor
    doc.rect(barX + 5, y + chartHeight - barH, barWidth - 20, barH).fill(azul);
    
    // Linha de objetivo se existir
    if (item.objetivo) {
      const objY = y + chartHeight - (item.objetivo / max) * chartHeight;
      doc.strokeColor(vermelho).lineWidth(2);
      doc.moveTo(barX, objY).lineTo(barX + barWidth - 10, objY).stroke();
    }
    
    // Label
    doc.fontSize(7).fillColor(cinza);
    doc.text(item.label, barX, y + chartHeight + 3, { width: barWidth - 10, align: 'center' });
    
    // Valor
    doc.fontSize(8).fillColor('#374151');
    doc.text(String(item.value), barX, y + chartHeight - barH - 12, { width: barWidth - 10, align: 'center' });
  });
  
  return y + chartHeight + 20;
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

      const { kpis, complementares, alertas, periodoLabel, comparativoMesAnterior, resultados, ritmo, evolucao } = dashboardData;

      const pageWidth = doc.page.width - 80;
      let currentY = 40;

      // ========== CABEÇALHO ==========
      doc.fontSize(20).fillColor('#1f2937');
      doc.text('Relatório de Resultados', 40, currentY, { align: 'center', width: pageWidth });
      currentY += 26;
      
      doc.fontSize(14).fillColor(verde);
      doc.text(nomeLoja, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 20;
      
      doc.fontSize(9).fillColor(cinza);
      doc.text(`Período: ${periodoLabel} | Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 22;

      // ========== KPIs PRINCIPAIS ==========
      doc.fontSize(12).fillColor('#1f2937');
      doc.text('Indicadores Principais', 40, currentY);
      currentY += 16;

      const kpiWidth = (pageWidth - 30) / 4;
      const kpiHeight = 50;
      
      drawKPIBox(doc, 40, currentY, kpiWidth, kpiHeight, azul, 'Serviços', String(kpis.servicosRealizados));
      drawKPIBox(doc, 40 + kpiWidth + 10, currentY, kpiWidth, kpiHeight, roxo, 'Objetivo', String(kpis.objetivoMensal));
      const desvioColor = kpis.desvioObjetivoDiario >= 0 ? verde : vermelho;
      drawKPIBox(doc, 40 + (kpiWidth + 10) * 2, currentY, kpiWidth, kpiHeight, desvioColor, 'Desvio Obj. Diário', `${kpis.desvioObjetivoDiario >= 0 ? '+' : ''}${kpis.desvioObjetivoDiario.toFixed(1)}%`);
      const taxaColor = kpis.taxaReparacao >= 22 ? verde : laranja;
      drawKPIBox(doc, 40 + (kpiWidth + 10) * 3, currentY, kpiWidth, kpiHeight, taxaColor, 'Taxa Reparação', `${kpis.taxaReparacao.toFixed(1)}%`);
      
      currentY += kpiHeight + 18;

      // ========== RITMO NECESSÁRIO ==========
      if (ritmo) {
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Ritmo para Atingir Objetivo', 40, currentY);
        currentY += 14;

        const ritmoWidth = (pageWidth - 30) / 4;
        const ritmoHeight = 52;
        
        const servicosFaltamColor = ritmo.servicosFaltam === 0 ? verde : laranja;
        drawInfoBox(doc, 40, currentY, ritmoWidth, ritmoHeight, 'Serviços em Falta', String(ritmo.servicosFaltam), ritmo.servicosFaltam === 0 ? 'Objetivo atingido!' : '', servicosFaltamColor === verde ? '#d1fae5' : cinzaClaro);
        drawInfoBox(doc, 40 + ritmoWidth + 10, currentY, ritmoWidth, ritmoHeight, 'Dias Úteis Restantes', String(ritmo.diasUteisRestantes));
        drawInfoBox(doc, 40 + (ritmoWidth + 10) * 2, currentY, ritmoWidth, ritmoHeight, 'Serviços/Dia Necessários', String(ritmo.servicosPorDia), ritmo.servicosPorDia <= 3 ? 'Ritmo alcançável' : 'Ritmo exigente');
        
        const gapColor = ritmo.gapReparacoes === 0 ? verde : laranja;
        drawInfoBox(doc, 40 + (ritmoWidth + 10) * 3, currentY, ritmoWidth, ritmoHeight, 'Gap Reparações (22%)', String(ritmo.gapReparacoes), ritmo.gapReparacoes === 0 ? 'Meta atingida!' : `Faltam ${ritmo.gapReparacoes}`, gapColor === verde ? '#d1fae5' : cinzaClaro);
        
        currentY += ritmoHeight + 18;
      }

      // ========== ALERTAS ==========
      if (alertas && alertas.length > 0) {
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Alertas', 40, currentY);
        currentY += 14;
        
        alertas.forEach(alerta => {
          const alertaColor = alerta.tipo === 'success' ? verde : alerta.tipo === 'warning' ? laranja : vermelho;
          const icon = alerta.tipo === 'success' ? '✓' : alerta.tipo === 'warning' ? '!' : '✗';
          doc.fontSize(9).fillColor(alertaColor);
          doc.text(`${icon} ${alerta.mensagem}`, 50, currentY, { width: pageWidth - 20 });
          currentY += 12;
        });
        currentY += 10;
      }

      // ========== VENDAS COMPLEMENTARES ==========
      doc.fontSize(12).fillColor('#1f2937');
      doc.text('Vendas Complementares', 40, currentY);
      currentY += 14;

      const compWidth = (pageWidth - 40) / 5;
      const compHeight = 50;
      
      const escovasPercent = complementares.escovasPercent !== null ? `(${(complementares.escovasPercent * 100).toFixed(1)}%)` : '';
      
      drawInfoBox(doc, 40, currentY, compWidth, compHeight, 'Escovas', String(complementares.escovasQtd), escovasPercent);
      drawInfoBox(doc, 40 + compWidth + 10, currentY, compWidth, compHeight, 'Polimento', String(complementares.polimentoQtd));
      drawInfoBox(doc, 40 + (compWidth + 10) * 2, currentY, compWidth, compHeight, 'Tratamento', String(complementares.tratamentoQtd));
      drawInfoBox(doc, 40 + (compWidth + 10) * 3, currentY, compWidth, compHeight, 'Lavagens', String(complementares.lavagensTotal));
      drawInfoBox(doc, 40 + (compWidth + 10) * 4, currentY, compWidth, compHeight, 'Outros', String(complementares.outrosQtd));
      
      currentY += compHeight + 18;

      // ========== BARRA DE PROGRESSO ESCOVAS ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Progresso Escovas (Objetivo: 10%)', 40, currentY);
      currentY += 14;
      
      const barWidth = pageWidth;
      const barHeight = 20;
      const escovasPercValue = (complementares.escovasPercent || 0) * 100;
      const maxPercent = 15;
      const progressWidth = Math.min((escovasPercValue / maxPercent) * barWidth, barWidth);
      
      doc.rect(40, currentY, barWidth, barHeight).fill('#e5e7eb');
      
      const progressColor = escovasPercValue >= 10 ? verde : escovasPercValue >= 7.5 ? laranja : vermelho;
      if (progressWidth > 0) {
        doc.rect(40, currentY, progressWidth, barHeight).fill(progressColor);
      }
      
      const marker75X = 40 + (7.5 / maxPercent) * barWidth;
      const marker10X = 40 + (10 / maxPercent) * barWidth;
      
      doc.strokeColor('#374151').lineWidth(2);
      doc.moveTo(marker75X, currentY).lineTo(marker75X, currentY + barHeight).stroke();
      doc.moveTo(marker10X, currentY).lineTo(marker10X, currentY + barHeight).stroke();
      
      doc.fontSize(7).fillColor('#374151');
      doc.text('7.5%', marker75X - 10, currentY + barHeight + 2);
      doc.text('10%', marker10X - 8, currentY + barHeight + 2);
      
      doc.fontSize(9).fillColor(progressWidth > 40 ? 'white' : '#374151');
      doc.text(`${escovasPercValue.toFixed(1)}%`, progressWidth > 40 ? 40 + progressWidth - 30 : 40 + progressWidth + 5, currentY + 5);
      
      currentY += barHeight + 25;

      // ========== COMPARATIVO MÊS ANTERIOR ==========
      doc.fontSize(12).fillColor('#1f2937');
      doc.text('Comparativo com Mês Anterior', 40, currentY);
      currentY += 14;

      const compMesWidth = (pageWidth - 20) / 3;
      const compMesHeight = 55;
      
      // Serviços
      doc.rect(40, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor('#374151').fontSize(9);
      doc.text('Serviços', 48, currentY + 6);
      doc.fontSize(14);
      doc.text(`${kpis.servicosRealizados} (ant: ${comparativoMesAnterior.servicosAnterior})`, 48, currentY + 20);
      if (comparativoMesAnterior.variacaoServicos !== null) {
        const varColor = comparativoMesAnterior.variacaoServicos >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoServicos >= 0 ? '↑' : '↓';
        doc.fontSize(10).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoServicos).toFixed(1)}%`, 48, currentY + 38);
      }
      
      // Reparações
      doc.rect(40 + compMesWidth + 10, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor('#374151').fontSize(9);
      doc.text('Reparações', 48 + compMesWidth + 10, currentY + 6);
      doc.fontSize(14);
      doc.text(`${resultados.totalReparacoes} (ant: ${comparativoMesAnterior.reparacoesAnterior})`, 48 + compMesWidth + 10, currentY + 20);
      if (comparativoMesAnterior.variacaoReparacoes !== null) {
        const varColor = comparativoMesAnterior.variacaoReparacoes >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoReparacoes >= 0 ? '↑' : '↓';
        doc.fontSize(10).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoReparacoes).toFixed(1)}%`, 48 + compMesWidth + 10, currentY + 38);
      }
      
      // Escovas
      doc.rect(40 + (compMesWidth + 10) * 2, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor('#374151').fontSize(9);
      doc.text('Escovas', 48 + (compMesWidth + 10) * 2, currentY + 6);
      doc.fontSize(14);
      doc.text(`${complementares.escovasQtd} (ant: ${comparativoMesAnterior.escovasAnterior})`, 48 + (compMesWidth + 10) * 2, currentY + 20);
      if (comparativoMesAnterior.variacaoEscovas !== null) {
        const varColor = comparativoMesAnterior.variacaoEscovas >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoEscovas >= 0 ? '↑' : '↓';
        doc.fontSize(10).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoEscovas).toFixed(1)}%`, 48 + (compMesWidth + 10) * 2, currentY + 38);
      }
      
      currentY += compMesHeight + 20;

      // ========== EVOLUÇÃO MENSAL ==========
      if (evolucao && evolucao.length > 0) {
        // Nova página se necessário
        if (currentY > 580) {
          doc.addPage();
          currentY = 40;
        }
        
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Evolução Mensal (Últimos 6 Meses)', 40, currentY);
        currentY += 16;

        // Tabela de evolução
        const colWidth = pageWidth / 7;
        const rowHeight = 22;
        
        // Cabeçalho
        doc.rect(40, currentY, pageWidth, rowHeight).fill('#e5e7eb');
        doc.fillColor('#374151').fontSize(8);
        doc.text('Mês', 45, currentY + 6);
        
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        evolucao.slice(0, 6).forEach((item, i) => {
          doc.text(`${mesesNomes[item.mes - 1]}/${String(item.ano).slice(2)}`, 45 + colWidth * (i + 1), currentY + 6, { width: colWidth - 10, align: 'center' });
        });
        currentY += rowHeight;
        
        // Linha Serviços
        doc.rect(40, currentY, pageWidth, rowHeight).fill('white');
        doc.strokeColor('#e5e7eb').lineWidth(1);
        doc.rect(40, currentY, pageWidth, rowHeight).stroke();
        doc.fillColor('#374151').fontSize(8);
        doc.text('Serviços', 45, currentY + 6);
        evolucao.slice(0, 6).forEach((item, i) => {
          doc.text(String(item.totalServicos || 0), 45 + colWidth * (i + 1), currentY + 6, { width: colWidth - 10, align: 'center' });
        });
        currentY += rowHeight;
        
        // Linha Objetivo
        doc.rect(40, currentY, pageWidth, rowHeight).fill(cinzaClaro);
        doc.fillColor('#374151').fontSize(8);
        doc.text('Objetivo', 45, currentY + 6);
        evolucao.slice(0, 6).forEach((item, i) => {
          doc.text(String(item.objetivoMensal || 0), 45 + colWidth * (i + 1), currentY + 6, { width: colWidth - 10, align: 'center' });
        });
        currentY += rowHeight;
        
        // Linha Desvio %
        doc.rect(40, currentY, pageWidth, rowHeight).fill('white');
        doc.rect(40, currentY, pageWidth, rowHeight).stroke();
        doc.fillColor('#374151').fontSize(8);
        doc.text('Desvio %', 45, currentY + 6);
        evolucao.slice(0, 6).forEach((item, i) => {
          const servicos = item.totalServicos || 0;
          const objetivo = item.objetivoMensal || 0;
          const desvio = objetivo > 0 ? ((servicos - objetivo) / objetivo * 100) : 0;
          const desvioColor = desvio >= 0 ? verde : vermelho;
          doc.fillColor(desvioColor);
          doc.text(`${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%`, 45 + colWidth * (i + 1), currentY + 6, { width: colWidth - 10, align: 'center' });
        });
        currentY += rowHeight;
        
        // Linha Taxa Reparação
        doc.rect(40, currentY, pageWidth, rowHeight).fill(cinzaClaro);
        doc.fillColor('#374151').fontSize(8);
        doc.text('Taxa Rep.', 45, currentY + 6);
        evolucao.slice(0, 6).forEach((item, i) => {
          const servicos = item.totalServicos || 0;
          const reparacoes = item.qtdReparacoes || 0;
          const taxa = servicos > 0 ? (reparacoes / servicos * 100) : 0;
          const taxaColor = taxa >= 22 ? verde : laranja;
          doc.fillColor(taxaColor);
          doc.text(`${taxa.toFixed(1)}%`, 45 + colWidth * (i + 1), currentY + 6, { width: colWidth - 10, align: 'center' });
        });
        currentY += rowHeight + 20;
      }

      // ========== ANÁLISE IA ==========
      if (analiseIA) {
        // Nova página se necessário
        if (currentY > 600) {
          doc.addPage();
          currentY = 40;
        }
        
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Análise Inteligente', 40, currentY);
        currentY += 16;

        // Foco Urgente
        if (analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0) {
          doc.rect(40, currentY, pageWidth, 4).fill(vermelho);
          currentY += 8;
          doc.fontSize(10).fillColor(vermelho);
          doc.text('🎯 Foco Urgente:', 40, currentY);
          currentY += 14;
          analiseIA.focoUrgente.forEach(item => {
            doc.fontSize(9).fillColor('#374151');
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += 12;
          });
          currentY += 8;
        }

        // Pontos Positivos
        if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
          doc.rect(40, currentY, pageWidth, 4).fill(verde);
          currentY += 8;
          doc.fontSize(10).fillColor(verde);
          doc.text('✓ Pontos Positivos:', 40, currentY);
          currentY += 14;
          analiseIA.pontosPositivos.forEach(item => {
            doc.fontSize(9).fillColor('#374151');
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += 12;
          });
          currentY += 8;
        }

        // Resumo
        if (analiseIA.resumo) {
          doc.rect(40, currentY, pageWidth, 4).fill(azul);
          currentY += 8;
          doc.fontSize(10).fillColor(azul);
          doc.text('💡 Resumo Motivacional:', 40, currentY);
          currentY += 14;
          doc.fontSize(9).fillColor('#374151');
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
