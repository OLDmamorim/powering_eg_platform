import PDFDocument from 'pdfkit';
import { gerarGraficoServicosVsObjetivo, gerarGraficoDesvio, gerarGraficoTaxaReparacao } from './chartService';

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

export async function gerarPDFResultados(
  nomeLoja: string,
  dashboardData: DashboardData,
  analiseIA?: AnaliseIA | null
): Promise<Buffer> {
  const { kpis, complementares, alertas, periodoLabel, comparativoMesAnterior, resultados, ritmo, evolucao } = dashboardData;

  // Pré-gerar os gráficos antes de criar o PDF
  let chartServicos: Buffer | null = null;
  let chartDesvio: Buffer | null = null;
  let chartTaxa: Buffer | null = null;

  if (evolucao && evolucao.length > 0) {
    try {
      chartServicos = await gerarGraficoServicosVsObjetivo(evolucao.slice(0, 6));
      chartDesvio = await gerarGraficoDesvio(evolucao.slice(0, 6));
      chartTaxa = await gerarGraficoTaxaReparacao(evolucao.slice(0, 6));
    } catch (chartError) {
      console.error('Erro ao gerar gráficos:', chartError);
    }
  }

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

      // ========== GRÁFICOS DE EVOLUÇÃO MENSAL ==========
      if (chartServicos && chartDesvio && chartTaxa) {
        // Nova página para gráficos
        doc.addPage();
        currentY = 40;
        
        doc.fontSize(14).fillColor('#1f2937');
        doc.text('Evolução Mensal (Gráficos)', 40, currentY, { align: 'center', width: pageWidth });
        currentY += 25;

        // Gráfico 1: Serviços vs Objetivo
        doc.image(chartServicos, 55, currentY, { width: pageWidth - 30 });
        currentY += 200;

        // Gráfico 2: Desvio %
        doc.image(chartDesvio, 55, currentY, { width: pageWidth - 30 });
        currentY += 200;

        // Gráfico 3: Taxa de Reparação (nova página se necessário)
        if (currentY > 550) {
          doc.addPage();
          currentY = 40;
        }
        doc.image(chartTaxa, 55, currentY, { width: pageWidth - 30 });
        currentY += 200;
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
