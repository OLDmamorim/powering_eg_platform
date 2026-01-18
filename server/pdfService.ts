import PDFDocument from 'pdfkit';

// Logótipo ExpressGlass em base64 (incorporado para funcionar em qualquer ambiente)
const LOGO_BASE64 = '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';

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
  console.log('[PDF] Análise IA recebida:', analiseIA ? 'SIM' : 'NÃO', analiseIA);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        autoFirstPage: true
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      let currentY = 40;

      // ========== CABEÇALHO ==========
      // Logótipo ExpressGlass (incorporado em base64)
      try {
        const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
        const logoWidth = 150;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoBuffer, logoX, currentY, { width: logoWidth });
        currentY += 50;
        console.log('[PDF] Logótipo adicionado com sucesso');
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
        
        // Calcular altura necessária para análise IA
        const alturaAnaliseIA = 150; // Estimativa conservadora
        
        // Verificar se precisa de nova página (só se não couber)
        console.log(`[PDF] currentY antes da análise IA: ${currentY}, altura página: ${doc.page.height}`);
        if (currentY + alturaAnaliseIA > doc.page.height - 60) {
          console.log('[PDF] A criar nova página para análise IA');
          doc.addPage();
          currentY = 40;
        } else {
          console.log('[PDF] Análise IA cabe na página atual');
        }
        
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Análise Inteligente', 40, currentY);
        currentY += 15;

        // Foco Urgente
        if (analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0) {
          doc.fontSize(10).fillColor(vermelho);
          doc.text('[!] Foco Urgente:', 40, currentY);
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
          doc.text('[+] Pontos Positivos:', 40, currentY);
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
          doc.text('[>] Resumo:', 40, currentY);
          currentY += 12;
          doc.fontSize(9).fillColor(cinzaEscuro);
          doc.text(analiseIA.resumo, 50, currentY, { width: pageWidth - 20 });
          currentY += doc.heightOfString(analiseIA.resumo, { width: pageWidth - 20 }) + 10;
        }
        
        console.log('[PDF] Análise IA adicionada na página 1');
      }

      // ========== GRÁFICOS DE EVOLUÇÃO MENSAL (página 2 - só se houver dados) ==========
      // Contar páginas criadas para o rodapé
      // Verificar quantas páginas já foram criadas até agora
      let paginasReais = 1; // Página 1 já existe
      // Se a análise IA criou uma nova página, contar
      if (analiseIA && currentY < 100) {
        // Se currentY é baixo, significa que foi criada nova página para análise IA
        paginasReais = 2;
      }
      
      if (evolucao && evolucao.length > 0) {
        console.log('[PDF] A desenhar gráficos de evolução...');
        
        // Nova página para gráficos
        doc.addPage();
        paginasReais++;
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

        // Gráfico 3: Taxa de Reparação
        desenharGraficoLinha(doc, 40, currentY, pageWidth, 180, dadosTaxa, 'Taxa de Reparação (%)', verde, 22, '%');
        currentY += 190;

        // Gráfico 4: Vendas Complementares - nova página
        doc.addPage();
        paginasReais++;
        currentY = 40;
        desenharGraficoComplementares(doc, 40, currentY, pageWidth, 180, complementares, 'Distribuição de Vendas Complementares');
        
        // Rodapé na página de complementares (posicionar sem criar nova página)
        // A página A4 tem 841.89 pts de altura, usar 780 para garantir que cabe
        const rodapeY3 = 780;
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(
          `PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass | Página ${paginasReais} de ${paginasReais}`,
          40,
          rodapeY3,
          { align: 'center', width: pageWidth, lineBreak: false }
        );
        
        console.log('[PDF] Gráficos desenhados com sucesso');
      } else {
        console.log('[PDF] Sem dados de evolução - gráficos não serão gerados');
        // Rodapé na página 1 se não houver gráficos
        const rodapeY1 = 780;
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(
          `PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass | Página 1 de 1`,
          40,
          rodapeY1,
          { align: 'center', width: pageWidth, lineBreak: false }
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
