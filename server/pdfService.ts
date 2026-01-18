import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// Caminho para o logótipo ExpressGlass
// Usar caminho absoluto para garantir que funciona em produção
const LOGO_PATH = path.resolve(process.cwd(), 'server', 'assets', 'eglass-logo.png');

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
const azul = '#3B82F6';
const roxo = '#8B5CF6';
const verde = '#10B981';
const vermelho = '#EF4444';
const laranja = '#F97316';
const cinzaClaro = '#F3F4F6';
const cinzaEscuro = '#374151';
const amarelo = '#F59E0B';

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Função para desenhar gráfico de barras nativo no PDFKit
function desenharGraficoBarras(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  dados: { label: string; valor1: number; valor2?: number }[],
  titulo: string,
  legenda1: string,
  legenda2?: string,
  cor1: string = azul,
  cor2: string = roxo
) {
  const marginLeft = 50;
  const marginBottom = 30;
  const marginTop = 30;
  const chartWidth = width - marginLeft - 20;
  const chartHeight = height - marginBottom - marginTop;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  // Encontrar valor máximo
  let maxVal = 0;
  dados.forEach(d => {
    if (d.valor1 > maxVal) maxVal = d.valor1;
    if (d.valor2 && d.valor2 > maxVal) maxVal = d.valor2;
  });
  maxVal = Math.ceil(maxVal * 1.1); // 10% de margem
  if (maxVal === 0) maxVal = 100;
  
  const chartX = x + marginLeft;
  const chartY = y + marginTop;
  
  // Eixo Y (linhas de grade)
  doc.strokeColor('#E5E7EB').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos).stroke();
    doc.fontSize(7).fillColor('#9CA3AF');
    doc.text(Math.round((i / 4) * maxVal).toString(), x, yPos - 4, { width: marginLeft - 5, align: 'right' });
  }
  
  // Barras
  const barGroupWidth = chartWidth / dados.length;
  const barWidth = legenda2 ? barGroupWidth * 0.35 : barGroupWidth * 0.6;
  const gap = legenda2 ? barGroupWidth * 0.1 : barGroupWidth * 0.2;
  
  dados.forEach((d, i) => {
    const groupX = chartX + i * barGroupWidth + gap;
    
    // Barra 1
    const bar1Height = (d.valor1 / maxVal) * chartHeight;
    doc.rect(groupX, chartY + chartHeight - bar1Height, barWidth, bar1Height).fill(cor1);
    
    // Barra 2 (se existir)
    if (legenda2 && d.valor2 !== undefined) {
      const bar2Height = (d.valor2 / maxVal) * chartHeight;
      doc.rect(groupX + barWidth + 2, chartY + chartHeight - bar2Height, barWidth, bar2Height).fill(cor2);
    }
    
    // Label do eixo X
    doc.fontSize(7).fillColor(cinzaEscuro);
    doc.text(d.label, groupX - gap/2, chartY + chartHeight + 5, { width: barGroupWidth, align: 'center' });
  });
  
  // Legenda
  const legendaY = y + height - 15;
  doc.rect(x + width/2 - 80, legendaY, 8, 8).fill(cor1);
  doc.fontSize(7).fillColor(cinzaEscuro);
  doc.text(legenda1, x + width/2 - 68, legendaY, { continued: false });
  
  if (legenda2) {
    doc.rect(x + width/2 + 20, legendaY, 8, 8).fill(cor2);
    doc.text(legenda2, x + width/2 + 32, legendaY);
  }
}

// Função para desenhar gráfico de linha nativo no PDFKit
function desenharGraficoLinha(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  dados: { label: string; valor: number }[],
  titulo: string,
  cor: string = verde,
  objetivo?: number,
  unidade: string = ''
) {
  const marginLeft = 50;
  const marginBottom = 30;
  const marginTop = 30;
  const chartWidth = width - marginLeft - 20;
  const chartHeight = height - marginBottom - marginTop;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  // Encontrar valor máximo e mínimo
  let maxVal = objetivo || 0;
  let minVal = 0;
  dados.forEach(d => {
    if (d.valor > maxVal) maxVal = d.valor;
    if (d.valor < minVal) minVal = d.valor;
  });
  maxVal = Math.ceil(maxVal * 1.2);
  if (minVal < 0) minVal = Math.floor(minVal * 1.2);
  const range = maxVal - minVal;
  if (range === 0) return;
  
  const chartX = x + marginLeft;
  const chartY = y + marginTop;
  
  // Eixo Y (linhas de grade)
  doc.strokeColor('#E5E7EB').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos).stroke();
    doc.fontSize(7).fillColor('#9CA3AF');
    const val = minVal + (i / 4) * range;
    doc.text(`${val.toFixed(1)}${unidade}`, x, yPos - 4, { width: marginLeft - 5, align: 'right' });
  }
  
  // Linha de objetivo (se existir)
  if (objetivo !== undefined) {
    const objY = chartY + chartHeight - ((objetivo - minVal) / range) * chartHeight;
    doc.strokeColor(vermelho).lineWidth(1);
    doc.moveTo(chartX, objY).lineTo(chartX + chartWidth, objY).dash(5, { space: 3 }).stroke().undash();
    doc.fontSize(7).fillColor(vermelho);
    doc.text(`Obj: ${objetivo}${unidade}`, chartX + chartWidth - 40, objY - 10);
  }
  
  // Desenhar linha
  if (dados.length > 0) {
    const stepX = chartWidth / (dados.length - 1 || 1);
    
    doc.strokeColor(cor).lineWidth(2);
    dados.forEach((d, i) => {
      const px = chartX + i * stepX;
      const py = chartY + chartHeight - ((d.valor - minVal) / range) * chartHeight;
      
      if (i === 0) {
        doc.moveTo(px, py);
      } else {
        doc.lineTo(px, py);
      }
    });
    doc.stroke();
    
    // Pontos
    dados.forEach((d, i) => {
      const px = chartX + i * stepX;
      const py = chartY + chartHeight - ((d.valor - minVal) / range) * chartHeight;
      doc.circle(px, py, 3).fill(cor);
      
      // Label do eixo X
      doc.fontSize(7).fillColor(cinzaEscuro);
      doc.text(d.label, px - 15, chartY + chartHeight + 5, { width: 30, align: 'center' });
    });
  }
}

// Função para desenhar gráfico de barras coloridas (desvio)
function desenharGraficoDesvio(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  dados: { label: string; valor: number }[],
  titulo: string
) {
  const marginLeft = 50;
  const marginBottom = 30;
  const marginTop = 30;
  const chartWidth = width - marginLeft - 20;
  const chartHeight = height - marginBottom - marginTop;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  // Encontrar valor máximo e mínimo
  let maxVal = 10;
  let minVal = -10;
  dados.forEach(d => {
    if (d.valor > maxVal) maxVal = d.valor;
    if (d.valor < minVal) minVal = d.valor;
  });
  maxVal = Math.ceil(maxVal * 1.2);
  minVal = Math.floor(minVal * 1.2);
  const range = maxVal - minVal;
  if (range === 0) return;
  
  const chartX = x + marginLeft;
  const chartY = y + marginTop;
  const zeroY = chartY + chartHeight - ((0 - minVal) / range) * chartHeight;
  
  // Eixo Y (linhas de grade)
  doc.strokeColor('#E5E7EB').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos).stroke();
    doc.fontSize(7).fillColor('#9CA3AF');
    const val = minVal + (i / 4) * range;
    doc.text(`${val.toFixed(0)}%`, x, yPos - 4, { width: marginLeft - 5, align: 'right' });
  }
  
  // Linha zero
  doc.strokeColor(cinzaEscuro).lineWidth(1);
  doc.moveTo(chartX, zeroY).lineTo(chartX + chartWidth, zeroY).stroke();
  
  // Barras
  const barWidth = (chartWidth / dados.length) * 0.6;
  const gap = (chartWidth / dados.length) * 0.2;
  
  dados.forEach((d, i) => {
    const barX = chartX + i * (chartWidth / dados.length) + gap;
    const barHeight = Math.abs((d.valor / range) * chartHeight);
    const barY = d.valor >= 0 ? zeroY - barHeight : zeroY;
    const barColor = d.valor >= 0 ? verde : vermelho;
    
    doc.rect(barX, barY, barWidth, barHeight).fill(barColor);
    
    // Valor no topo da barra
    doc.fontSize(7).fillColor(barColor);
    const textY = d.valor >= 0 ? barY - 10 : barY + barHeight + 2;
    doc.text(`${d.valor.toFixed(1)}%`, barX - 5, textY, { width: barWidth + 10, align: 'center' });
    
    // Label do eixo X
    doc.fontSize(7).fillColor(cinzaEscuro);
    doc.text(d.label, barX - gap/2, chartY + chartHeight + 5, { width: chartWidth / dados.length, align: 'center' });
  });
}

// Função para desenhar gráfico de barras horizontais (complementares)
function desenharGraficoComplementares(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  complementares: DashboardData['complementares'],
  titulo: string
) {
  const marginLeft = 80;
  const marginRight = 40;
  const chartWidth = width - marginLeft - marginRight;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  const dados = [
    { label: 'Escovas', valor: complementares.escovasQtd, cor: azul },
    { label: 'Polimento', valor: complementares.polimentoQtd, cor: roxo },
    { label: 'Tratamento', valor: complementares.tratamentoQtd, cor: verde },
    { label: 'Lavagens', valor: complementares.lavagensTotal, cor: laranja },
    { label: 'Outros', valor: complementares.outrosQtd, cor: amarelo },
  ];
  
  const maxVal = Math.max(...dados.map(d => d.valor), 1);
  const barHeight = 20;
  const gap = 10;
  let currentY = y + 25;
  
  dados.forEach(d => {
    // Label
    doc.fontSize(9).fillColor(cinzaEscuro);
    doc.text(d.label, x, currentY + 3, { width: marginLeft - 10, align: 'right' });
    
    // Barra
    const barWidth = (d.valor / maxVal) * chartWidth;
    doc.rect(x + marginLeft, currentY, Math.max(barWidth, 2), barHeight).fill(d.cor);
    
    // Valor
    doc.fontSize(9).fillColor(cinzaEscuro);
    doc.text(d.valor.toString(), x + marginLeft + barWidth + 5, currentY + 3);
    
    currentY += barHeight + gap;
  });
}

export async function gerarPDFResultados(
  nomeLoja: string,
  dashboardData: DashboardData,
  analiseIA?: AnaliseIA | null
): Promise<Buffer> {
  const { kpis, complementares, alertas, periodoLabel, comparativoMesAnterior, resultados, ritmo, evolucao } = dashboardData;

  console.log('[PDF] Iniciando geração do PDF para', nomeLoja);
  console.log('[PDF] Evolução recebida:', evolucao?.length, 'itens');

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
      // Logótipo ExpressGlass (se existir)
      console.log('[PDF] Caminho do logótipo:', LOGO_PATH);
      console.log('[PDF] Logótipo existe?', fs.existsSync(LOGO_PATH));
      try {
        if (fs.existsSync(LOGO_PATH)) {
          // Centrar o logótipo: (largura da página - largura do logo) / 2
          const logoWidth = 150;
          const logoX = (doc.page.width - logoWidth) / 2;
          doc.image(LOGO_PATH, logoX, currentY, { width: logoWidth });
          currentY += 50;
          console.log('[PDF] Logótipo adicionado com sucesso em x:', logoX);
        } else {
          console.log('[PDF] Logótipo não encontrado no caminho:', LOGO_PATH);
        }
      } catch (logoError) {
        console.log('[PDF] Erro ao carregar logótipo:', logoError);
      }

      doc.fontSize(18).fillColor('#1f2937');
      doc.text('Relatório de Resultados', 40, currentY, { align: 'center', width: pageWidth });
      currentY += 25;

      doc.fontSize(14).fillColor(verde);
      doc.text(nomeLoja, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 20;

      doc.fontSize(10).fillColor('#6b7280');
      doc.text(`Período: ${periodoLabel}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 12;
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 25;

      // ========== KPIs PRINCIPAIS ==========
      doc.fontSize(12).fillColor('#1f2937');
      doc.text('Indicadores Principais', 40, currentY);
      currentY += 15;

      const kpiWidth = (pageWidth - 30) / 4;
      const kpiHeight = 50;
      const kpiColors = [azul, roxo, kpis.desvioObjetivoDiario >= 0 ? verde : vermelho, kpis.taxaReparacao >= 22 ? verde : laranja];
      const kpiLabels = ['Serviços', 'Objetivo', 'Desvio Obj. Diário', 'Taxa Reparação'];
      const kpiValues = [
        kpis.servicosRealizados.toString(),
        kpis.objetivoMensal.toString(),
        `${kpis.desvioObjetivoDiario >= 0 ? '+' : ''}${kpis.desvioObjetivoDiario.toFixed(1)}%`,
        `${kpis.taxaReparacao.toFixed(1)}%`
      ];

      for (let i = 0; i < 4; i++) {
        const kpiX = 40 + i * (kpiWidth + 10);
        doc.rect(kpiX, currentY, kpiWidth, kpiHeight).fill(kpiColors[i]);
        doc.fillColor('white').fontSize(8);
        doc.text(kpiLabels[i], kpiX + 5, currentY + 8, { width: kpiWidth - 10, align: 'center' });
        doc.fontSize(16);
        doc.text(kpiValues[i], kpiX + 5, currentY + 22, { width: kpiWidth - 10, align: 'center' });
      }
      currentY += kpiHeight + 15;

      // ========== ALERTAS ==========
      if (alertas && alertas.length > 0) {
        doc.fontSize(11).fillColor('#1f2937');
        doc.text('Alertas', 40, currentY);
        currentY += 12;

        alertas.forEach(alerta => {
          const alertColor = alerta.tipo === 'success' ? verde : alerta.tipo === 'warning' ? amarelo : vermelho;
          doc.fontSize(9).fillColor(alertColor);
          doc.text(`• ${alerta.mensagem}`, 48, currentY);
          currentY += 12;
        });
        currentY += 8;
      }

      // ========== RITMO PARA ATINGIR OBJETIVO ==========
      if (ritmo) {
        doc.fontSize(11).fillColor('#1f2937');
        doc.text('Ritmo para Atingir Objetivo', 40, currentY);
        currentY += 12;

        const ritmoBoxWidth = (pageWidth - 30) / 4;
        const ritmoBoxHeight = 45;
        
        const ritmoData = [
          { label: 'Serviços em Falta', valor: ritmo.servicosFaltam.toString(), cor: ritmo.servicosFaltam > 0 ? vermelho : verde },
          { label: 'Dias Úteis Rest.', valor: ritmo.diasUteisRestantes.toString(), cor: cinzaEscuro },
          { label: 'Serviços/Dia', valor: ritmo.servicosPorDia.toString(), cor: azul },
          { label: 'Gap Rep. 22%', valor: ritmo.gapReparacoes.toString(), cor: ritmo.gapReparacoes > 0 ? laranja : verde },
        ];

        ritmoData.forEach((item, i) => {
          const boxX = 40 + i * (ritmoBoxWidth + 10);
          doc.rect(boxX, currentY, ritmoBoxWidth, ritmoBoxHeight).fill(cinzaClaro);
          doc.fontSize(8).fillColor(cinzaEscuro);
          doc.text(item.label, boxX + 5, currentY + 6, { width: ritmoBoxWidth - 10, align: 'center' });
          doc.fontSize(14).fillColor(item.cor);
          doc.text(item.valor, boxX + 5, currentY + 22, { width: ritmoBoxWidth - 10, align: 'center' });
        });
        currentY += ritmoBoxHeight + 15;
      }

      // ========== VENDAS COMPLEMENTARES ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Vendas Complementares', 40, currentY);
      currentY += 12;

      const compWidth = (pageWidth - 40) / 5;
      const compHeight = 45;
      const compData = [
        { label: 'Escovas', valor: complementares.escovasQtd, percent: complementares.escovasPercent },
        { label: 'Polimento', valor: complementares.polimentoQtd },
        { label: 'Tratamento', valor: complementares.tratamentoQtd },
        { label: 'Lavagens', valor: complementares.lavagensTotal },
        { label: 'Outros', valor: complementares.outrosQtd },
      ];

      compData.forEach((item, i) => {
        const boxX = 40 + i * (compWidth + 10);
        doc.rect(boxX, currentY, compWidth, compHeight).fill(cinzaClaro);
        doc.fontSize(8).fillColor(cinzaEscuro);
        doc.text(item.label, boxX + 3, currentY + 6, { width: compWidth - 6, align: 'center' });
        doc.fontSize(14).fillColor('#1f2937');
        doc.text(item.valor.toString(), boxX + 3, currentY + 20, { width: compWidth - 6, align: 'center' });
        if (item.percent !== undefined && item.percent !== null) {
          doc.fontSize(7).fillColor(item.percent >= 0.10 ? verde : item.percent >= 0.075 ? amarelo : vermelho);
          doc.text(`(${(item.percent * 100).toFixed(1)}%)`, boxX + 3, currentY + 35, { width: compWidth - 6, align: 'center' });
        }
      });
      currentY += compHeight + 15;

      // ========== BARRA DE PROGRESSO ESCOVAS ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Progresso Escovas (Objetivo: 10%)', 40, currentY);
      currentY += 12;

      const barraWidth = pageWidth;
      const barraHeight = 20;
      const escovasPercent = complementares.escovasPercent !== null ? complementares.escovasPercent * 100 : 0;
      
      // Fundo da barra
      doc.rect(40, currentY, barraWidth, barraHeight).fill(cinzaClaro);
      
      // Barra de progresso
      const progressWidth = Math.min((escovasPercent / 15) * barraWidth, barraWidth);
      const progressColor = escovasPercent >= 10 ? verde : escovasPercent >= 7.5 ? amarelo : vermelho;
      doc.rect(40, currentY, progressWidth, barraHeight).fill(progressColor);
      
      // Marcadores
      const marker75 = (7.5 / 15) * barraWidth;
      const marker10 = (10 / 15) * barraWidth;
      doc.strokeColor(cinzaEscuro).lineWidth(2);
      doc.moveTo(40 + marker75, currentY).lineTo(40 + marker75, currentY + barraHeight).stroke();
      doc.moveTo(40 + marker10, currentY).lineTo(40 + marker10, currentY + barraHeight).stroke();
      
      // Labels dos marcadores
      doc.fontSize(7).fillColor(cinzaEscuro);
      doc.text('7.5%', 40 + marker75 - 10, currentY + barraHeight + 2);
      doc.text('10%', 40 + marker10 - 8, currentY + barraHeight + 2);
      
      // Valor atual
      doc.fontSize(9).fillColor('white');
      doc.text(`${escovasPercent.toFixed(1)}%`, 40 + progressWidth - 30, currentY + 4);
      
      currentY += barraHeight + 20;

      // ========== COMPARATIVO COM MÊS ANTERIOR ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Comparativo com Mês Anterior', 40, currentY);
      currentY += 12;

      const compMesWidth = (pageWidth - 20) / 3;
      const compMesHeight = 55;
      
      // Serviços
      doc.rect(40, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor(cinzaEscuro).fontSize(9);
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
      doc.fillColor(cinzaEscuro).fontSize(9);
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
      doc.fillColor(cinzaEscuro).fontSize(9);
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

      // ========== ANÁLISE IA (na página 1) ==========
      if (analiseIA) {
        console.log('[PDF] A adicionar análise IA na página 1...');
        
        // Verificar se precisa de nova página
        if (currentY > 600) {
          doc.addPage();
          currentY = 40;
        }
        
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Análise Inteligente', 40, currentY);
        currentY += 15;

        // Foco Urgente
        if (analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0) {
          doc.fontSize(10).fillColor(vermelho);
          doc.text('🎯 Foco Urgente:', 40, currentY);
          currentY += 12;
          analiseIA.focoUrgente.forEach(item => {
            doc.fontSize(9).fillColor(cinzaEscuro);
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += doc.heightOfString(`• ${item}`, { width: pageWidth - 20 }) + 4;
          });
          currentY += 8;
        }

        // Pontos Positivos
        if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
          doc.fontSize(10).fillColor(verde);
          doc.text('✅ Pontos Positivos:', 40, currentY);
          currentY += 12;
          analiseIA.pontosPositivos.forEach(item => {
            doc.fontSize(9).fillColor(cinzaEscuro);
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += doc.heightOfString(`• ${item}`, { width: pageWidth - 20 }) + 4;
          });
          currentY += 8;
        }

        // Resumo
        if (analiseIA.resumo) {
          doc.fontSize(10).fillColor(azul);
          doc.text('💬 Resumo:', 40, currentY);
          currentY += 12;
          doc.fontSize(9).fillColor(cinzaEscuro);
          doc.text(analiseIA.resumo, 50, currentY, { width: pageWidth - 20 });
          currentY += doc.heightOfString(analiseIA.resumo, { width: pageWidth - 20 }) + 10;
        }
        
        console.log('[PDF] Análise IA adicionada na página 1');
      }

      // ========== GRÁFICOS DE EVOLUÇÃO MENSAL (página 2 - só se houver dados) ==========
      if (evolucao && evolucao.length > 0) {
        console.log('[PDF] A desenhar gráficos de evolução...');
        
        // Nova página para gráficos
        doc.addPage();
        currentY = 40;
        
        doc.fontSize(14).fillColor('#1f2937');
        doc.text('Evolução Mensal (Gráficos)', 40, currentY, { align: 'center', width: pageWidth });
        currentY += 25;

        // Preparar dados para gráficos
        const dadosServicos = evolucao.slice(0, 6).map(e => ({
          label: `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`,
          valor1: Number(e.totalServicos) || 0,
          valor2: Number(e.objetivoMensal) || 0
        }));

        const dadosDesvio = evolucao.slice(0, 6).map(e => {
          const servicos = Number(e.totalServicos) || 0;
          const objetivo = Number(e.objetivoMensal) || 1;
          return {
            label: `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`,
            valor: ((servicos - objetivo) / objetivo) * 100
          };
        });

        const dadosTaxa = evolucao.slice(0, 6).map(e => {
          const servicos = Number(e.totalServicos) || 1;
          const reparacoes = Number(e.qtdReparacoes) || 0;
          return {
            label: `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`,
            valor: (reparacoes / servicos) * 100
          };
        });

        // Gráfico 1: Serviços vs Objetivo
        desenharGraficoBarras(doc, 40, currentY, pageWidth, 180, dadosServicos, 'Serviços vs Objetivo', 'Serviços', 'Objetivo', azul, roxo);
        currentY += 190;

        // Gráfico 2: Desvio %
        desenharGraficoDesvio(doc, 40, currentY, pageWidth, 180, dadosDesvio, 'Desvio % (Serviços vs Objetivo)');
        currentY += 190;

        // Gráfico 3: Taxa de Reparação (nova página se necessário)
        if (currentY > 550) {
          doc.addPage();
          currentY = 40;
        }
        desenharGraficoLinha(doc, 40, currentY, pageWidth, 180, dadosTaxa, 'Taxa de Reparação (%)', verde, 22, '%');
        currentY += 190;

        // Gráfico 4: Vendas Complementares
        if (currentY > 500) {
          doc.addPage();
          currentY = 40;
        }
        desenharGraficoComplementares(doc, 40, currentY, pageWidth, 180, complementares, 'Distribuição de Vendas Complementares');
        currentY += 190;
        
        console.log('[PDF] Gráficos desenhados com sucesso');
      } else {
        console.log('[PDF] Sem dados de evolução - gráficos não serão gerados');
      }

      // ========== RODAPÉ ==========
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(
          `PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass | Página ${i + 1} de ${totalPages}`,
          40,
          doc.page.height - 30,
          { align: 'center', width: pageWidth }
        );
      }

      doc.end();
      console.log('[PDF] PDF finalizado');
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}
