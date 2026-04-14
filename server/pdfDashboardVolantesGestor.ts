import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ChartConfiguration } from 'chart.js';

interface KPIs {
  totalServicos: number;
  totalSubstituicoes: number;
  totalReparacoes: number;
  totalCalibragens: number;
  totalOutros: number;
  diasTrabalhados: number;
  mediaPorDia: number;
  mediaInfluencia: number;
}

interface VolanteStats {
  volanteId: number;
  nome: string;
  subZona: string | null;
  totalLojas: number;
  totalServicos: number;
  substituicoes: number;
  reparacoes: number;
  calibragens: number;
  outros: number;
  diasTrabalhados: number;
  mediaPorDia: number;
}

interface InfluenciaLoja {
  lojaId: number;
  lojaNome: string;
  servicosVolante: number;
  totalServicosLoja: number;
  percentagemInfluencia: number;
}

interface PedidosApoio {
  total: number;
  aprovados: number;
  pendentes: number;
  reprovados: number;
}

interface TopLoja {
  lojaId: number;
  lojaNome: string;
  total: number;
}

interface OcupacaoVolante {
  volanteId: number;
  volanteNome: string;
  totalServicos: number;
  totalDias: number;
  lojas: {
    lojaId: number;
    lojaNome: string;
    servicos: number;
    dias: number;
    percentagemServicos: number;
    percentagemDias: number;
  }[];
}

export interface DashboardVolantesGestorData {
  totalVolantes: number;
  kpis: KPIs;
  porVolante: VolanteStats[];
  pedidosApoio: PedidosApoio;
  topLojas: TopLoja[];
  influenciaPorLoja: InfluenciaLoja[];
  ocupacaoPorVolante?: OcupacaoVolante[];
  periodoLabel: string;
  filtroVolante?: string;
  filtroLoja?: string;
}

// Font family used in all charts
const FONT_FAMILY = 'DejaVu Sans';
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

// Chart renderer with font registration
function createChartCanvas(width: number, height: number): ChartJSNodeCanvas {
  const canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
  canvas.registerFont(FONT_PATH, { family: FONT_FAMILY });
  canvas.registerFont(FONT_BOLD_PATH, { family: FONT_FAMILY, weight: 'bold' });
  return canvas;
}

const chartCanvas = createChartCanvas(280, 170);
const smallChartCanvas = createChartCanvas(200, 170);

async function renderChart(config: ChartConfiguration, canvas?: ChartJSNodeCanvas): Promise<Buffer> {
  const c = canvas || chartCanvas;
  return await c.renderToBuffer(config as any);
}

// Colors
const emerald = '#10B981';
const blue = '#3B82F6';
const amber = '#F59E0B';
const purple = '#8B5CF6';
const teal = '#14B8A6';
const indigo = '#6366F1';
const rose = '#F43F5E';
const cyan = '#06B6D4';
const gray = '#6B7280';
const darkText = '#1F2937';
const lightGreen = '#D1FAE5';
const lightBlue = '#DBEAFE';
const lightRose = '#FFE4E6';

/**
 * Helper to write text at an exact position WITHOUT moving doc.y.
 * PDFKit's doc.text() always updates the internal cursor, which causes
 * blank pages when many cells are written. By saving/restoring doc.y
 * we keep full control of vertical positioning.
 */
function textAt(doc: PDFKit.PDFDocument, str: string, x: number, y: number, opts: PDFKit.Mixins.TextOptions & { fontSize?: number; font?: string; color?: string } = {}) {
  if (opts.fontSize) doc.fontSize(opts.fontSize);
  if (opts.font) doc.font(opts.font);
  if (opts.color) doc.fillColor(opts.color);
  const savedY = doc.y;
  doc.text(str, x, y, { ...opts, lineBreak: false });
  doc.y = savedY; // restore cursor
}

export async function gerarPDFDashboardVolantesGestor(data: DashboardVolantesGestorData): Promise<Buffer> {
  const chartImages = await renderAllCharts(data);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LM = 30;
      const PW = doc.page.width - 60;
      const PH = doc.page.height;
      const rowH = 12;
      const footerH = 30;

      let curY = 0;

      function needsNewPage(needed: number) {
        if (curY + needed > PH - footerH) {
          doc.addPage();
          curY = 30;
        }
      }

      // ========== HEADER ==========
      doc.rect(0, 0, doc.page.width, 44).fill(emerald);
      textAt(doc, 'Dashboard Volantes', LM, 8, { fontSize: 15, font: 'Helvetica-Bold', color: 'white', width: PW, align: 'center' });
      textAt(doc, `Período: ${data.periodoLabel}`, LM, 27, { fontSize: 7.5, font: 'Helvetica', color: 'white', width: PW, align: 'center' });

      curY = 48;
      const filtros: string[] = [];
      if (data.filtroVolante) filtros.push(`Volante: ${data.filtroVolante}`);
      if (data.filtroLoja) filtros.push(`Loja: ${data.filtroLoja}`);
      if (filtros.length > 0) {
        textAt(doc, `Filtros ativos: ${filtros.join(' | ')}`, LM, curY, { fontSize: 6.5, font: 'Helvetica', color: rose, width: PW, align: 'center' });
        curY += 10;
      }

      // ========== KPIs: 2 rows of 4 ==========
      const kpiW = (PW - 9) / 4;
      const kpiH = 30;
      const kpiGap = 3;

      function drawKPI(x: number, y: number, label: string, value: string, color: string, sub?: string) {
        doc.rect(x, y, kpiW, kpiH).lineWidth(0.8).strokeColor(color).stroke();
        textAt(doc, label, x + 3, y + 2, { fontSize: 5, font: 'Helvetica-Bold', color, width: kpiW - 6 });
        textAt(doc, value, x + 3, y + 10, { fontSize: 12, font: 'Helvetica-Bold', color, width: kpiW - 6, align: 'center' });
        if (sub) {
          textAt(doc, sub, x + 3, y + 23, { fontSize: 4, font: 'Helvetica', color: gray, width: kpiW - 6, align: 'center' });
        }
      }

      drawKPI(LM, curY, 'Volantes Ativos', data.totalVolantes.toString(), emerald);
      drawKPI(LM + kpiW + kpiGap, curY, 'Total Serviços', data.kpis.totalServicos.toString(), blue);
      drawKPI(LM + (kpiW + kpiGap) * 2, curY, 'Substituições', data.kpis.totalSubstituicoes.toString(), cyan);
      drawKPI(LM + (kpiW + kpiGap) * 3, curY, 'Reparações', data.kpis.totalReparacoes.toString(), amber);

      const kpiY2 = curY + kpiH + 2;
      drawKPI(LM, kpiY2, 'Calibragens', data.kpis.totalCalibragens.toString(), purple);
      drawKPI(LM + kpiW + kpiGap, kpiY2, 'Dias Trabalhados', data.kpis.diasTrabalhados.toString(), teal);
      drawKPI(LM + (kpiW + kpiGap) * 2, kpiY2, 'Média/Dia', data.kpis.mediaPorDia.toFixed(1), indigo);
      drawKPI(LM + (kpiW + kpiGap) * 3, kpiY2, 'Influência Média', `${data.kpis.mediaInfluencia.toFixed(1)}%`, rose, 'nos resultados da loja');

      curY = kpiY2 + kpiH + 6;

      // ========== TABELA ATIVIDADE POR VOLANTE ==========
      textAt(doc, 'Atividade por Volante', LM, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });
      curY += 10;

      const cols = [
        { label: 'Volante', w: 100 },
        { label: 'Lojas', w: 30 },
        { label: 'Total', w: 36 },
        { label: 'Subst.', w: 36 },
        { label: 'Repar.', w: 36 },
        { label: 'Calib.', w: 36 },
        { label: 'Outros', w: 36 },
        { label: 'Dias', w: 30 },
        { label: 'Méd/Dia', w: 40 },
      ];
      const totalColW = cols.reduce((s, c) => s + c.w, 0);
      if (totalColW < PW) cols[cols.length - 1].w += PW - totalColW;

      // Header row
      doc.rect(LM, curY, PW, rowH).fillAndStroke(lightGreen, lightGreen);
      let cX = LM;
      cols.forEach(c => {
        textAt(doc, c.label, cX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: darkText, width: c.w - 4 });
        cX += c.w;
      });
      curY += rowH;

      const sorted = [...data.porVolante].sort((a, b) => b.totalServicos - a.totalServicos);
      sorted.forEach((v, idx) => {
        const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(LM, curY, PW, rowH).fillAndStroke(bg, bg);
        cX = LM;
        const vals = [v.nome, v.totalLojas, v.totalServicos, v.substituicoes, v.reparacoes, v.calibragens, v.outros, v.diasTrabalhados, v.mediaPorDia.toFixed(1)];
        const clrs = [darkText, gray, emerald, blue, amber, purple, gray, teal, indigo];
        vals.forEach((val, i) => {
          textAt(doc, String(val), cX + 2, curY + 3, { fontSize: 5, font: i === 0 || i === 2 ? 'Helvetica-Bold' : 'Helvetica', color: clrs[i], width: cols[i].w - 4 });
          cX += cols[i].w;
        });
        curY += rowH;
      });

      // Totals row
      if (sorted.length > 1) {
        doc.rect(LM, curY, PW, rowH).fillAndStroke(lightGreen, emerald);
        cX = LM;
        const totals = ['TOTAL', '-', data.kpis.totalServicos, data.kpis.totalSubstituicoes, data.kpis.totalReparacoes, data.kpis.totalCalibragens, data.kpis.totalOutros, data.kpis.diasTrabalhados, data.kpis.mediaPorDia.toFixed(1)];
        totals.forEach((val, i) => {
          textAt(doc, String(val), cX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: darkText, width: cols[i].w - 4 });
          cX += cols[i].w;
        });
        curY += rowH;
      }

      curY += 5;

      // ========== CHARTS ROW 1: Serviços por Volante + Pedidos de Apoio ==========
      needsNewPage(165);
      const chartLeftW = PW * 0.58;
      const chartRightW = PW * 0.42 - 6;

      textAt(doc, 'Serviços por Volante', LM, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });
      textAt(doc, 'Pedidos de Apoio', LM + chartLeftW + 6, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });

      const chartImgY = curY + 9;

      if (chartImages.servicosPorVolante) {
        doc.image(chartImages.servicosPorVolante, LM, chartImgY, { width: chartLeftW, height: 140 });
      }

      if (chartImages.pedidosApoio) {
        doc.image(chartImages.pedidosApoio, LM + chartLeftW + 6, chartImgY, { width: chartRightW, height: 140 });
      } else {
        const apoioY = chartImgY + 10;
        textAt(doc, `Aprovados: ${data.pedidosApoio.aprovados}`, LM + chartLeftW + 10, apoioY, { fontSize: 7, font: 'Helvetica', color: darkText });
        textAt(doc, `Pendentes: ${data.pedidosApoio.pendentes}`, LM + chartLeftW + 10, apoioY + 12, { fontSize: 7, font: 'Helvetica', color: darkText });
        textAt(doc, `Reprovados: ${data.pedidosApoio.reprovados}`, LM + chartLeftW + 10, apoioY + 24, { fontSize: 7, font: 'Helvetica', color: darkText });
        textAt(doc, `Total: ${data.pedidosApoio.total}`, LM + chartLeftW + 10, apoioY + 36, { fontSize: 7, font: 'Helvetica', color: darkText });
      }

      curY = chartImgY + 140 + 5;

      // ========== CHARTS ROW 2: Top Lojas + Influência ==========
      needsNewPage(165);
      textAt(doc, 'Top 10 Lojas', LM, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });
      textAt(doc, 'Influência por Loja', LM + chartLeftW + 6, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });

      const chart2ImgY = curY + 9;

      if (chartImages.topLojas) {
        doc.image(chartImages.topLojas, LM, chart2ImgY, { width: chartLeftW, height: 145 });
      }

      if (chartImages.influencia) {
        doc.image(chartImages.influencia, LM + chartLeftW + 6, chart2ImgY, { width: chartRightW, height: 145 });
      }

      curY = chart2ImgY + 145 + 5;

      // ========== TABELA OCUPAÇÃO POR VOLANTE (compact) ==========
      if (data.ocupacaoPorVolante && data.ocupacaoPorVolante.length > 0) {
        needsNewPage(50);
        textAt(doc, 'Ocupação dos Volantes por Loja', LM, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });
        curY += 10;

        const ocCols = [
          { label: 'Loja', w: PW - 200 },
          { label: 'Serviços', w: 50 },
          { label: '% Serv.', w: 50 },
          { label: 'Dias', w: 50 },
          { label: '% Dias', w: 50 },
        ];

        data.ocupacaoPorVolante.forEach((vol) => {
          // Limit to top 5 lojas per volante to keep compact
          const topLojas = vol.lojas.slice(0, 5);
          const neededH = rowH * (topLojas.length + 2) + 6;
          needsNewPage(neededH);

          // Volante header
          doc.rect(LM, curY, PW, rowH).fillAndStroke(lightBlue, lightBlue);
          textAt(doc, vol.volanteNome, LM + 3, curY + 3, { fontSize: 5.5, font: 'Helvetica-Bold', color: indigo, width: PW * 0.4 });
          textAt(doc, `${vol.lojas.length} lojas | ${vol.totalServicos} serv. | ${vol.totalDias} dias`, LM + PW * 0.4, curY + 3, { fontSize: 4.5, font: 'Helvetica', color: gray, width: PW * 0.6 - 3, align: 'right' });
          curY += rowH;

          // Column headers
          doc.rect(LM, curY, PW, rowH).fillAndStroke('#F3F4F6', '#F3F4F6');
          let oX = LM;
          ocCols.forEach(c => {
            textAt(doc, c.label, oX + 2, curY + 3, { fontSize: 4.5, font: 'Helvetica-Bold', color: gray, width: c.w - 4, align: c.label === 'Loja' ? 'left' : 'right' });
            oX += c.w;
          });
          curY += rowH;

          // Loja rows
          topLojas.forEach((l, idx) => {
            needsNewPage(rowH);
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
            doc.rect(LM, curY, PW, rowH).fillAndStroke(bg, bg);
            oX = LM;

            textAt(doc, l.lojaNome, oX + 2, curY + 3, { fontSize: 5, font: 'Helvetica', color: darkText, width: ocCols[0].w - 4 });
            oX += ocCols[0].w;

            textAt(doc, l.servicos.toString(), oX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: blue, width: ocCols[1].w - 4, align: 'right' });
            oX += ocCols[1].w;

            const sColor = l.percentagemServicos >= 40 ? indigo : l.percentagemServicos >= 20 ? blue : gray;
            textAt(doc, `${l.percentagemServicos.toFixed(1)}%`, oX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: sColor, width: ocCols[2].w - 4, align: 'right' });
            oX += ocCols[2].w;

            textAt(doc, l.dias.toString(), oX + 2, curY + 3, { fontSize: 5, font: 'Helvetica', color: teal, width: ocCols[3].w - 4, align: 'right' });
            oX += ocCols[3].w;

            const dColor = l.percentagemDias >= 40 ? indigo : l.percentagemDias >= 20 ? teal : gray;
            textAt(doc, `${l.percentagemDias.toFixed(1)}%`, oX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: dColor, width: ocCols[4].w - 4, align: 'right' });

            curY += rowH;
          });

          if (vol.lojas.length > 5) {
            textAt(doc, `... e mais ${vol.lojas.length - 5} lojas`, LM + 3, curY + 1, { fontSize: 4.5, font: 'Helvetica', color: gray });
            curY += 8;
          }

          curY += 3;
        });
      }

      // ========== TABELA INFLUÊNCIA POR LOJA ==========
      if (data.influenciaPorLoja.length > 0) {
        const maxInfluencia = Math.min(data.influenciaPorLoja.length, 12);
        needsNewPage(20 + maxInfluencia * rowH);

        textAt(doc, 'Detalhe Influência por Loja', LM, curY, { fontSize: 8, font: 'Helvetica-Bold', color: darkText });
        curY += 10;

        const infCols = [
          { label: '#', w: 16 },
          { label: 'Loja', w: PW - 156 },
          { label: 'Serv. Vol.', w: 45 },
          { label: 'Total Loja', w: 45 },
          { label: 'Influência', w: 50 },
        ];

        // Header
        doc.rect(LM, curY, PW, rowH).fillAndStroke(lightRose, lightRose);
        let iX = LM;
        infCols.forEach(c => {
          textAt(doc, c.label, iX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: darkText, width: c.w - 4, align: c.label === '#' || c.label === 'Loja' ? 'left' : 'right' });
          iX += c.w;
        });
        curY += rowH;

        const toShow = data.influenciaPorLoja.slice(0, maxInfluencia);
        toShow.forEach((l, idx) => {
          needsNewPage(rowH);

          const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
          doc.rect(LM, curY, PW, rowH).fillAndStroke(bg, bg);

          iX = LM;
          textAt(doc, (idx + 1).toString(), iX + 2, curY + 3, { fontSize: 5, font: 'Helvetica', color: gray, width: infCols[0].w - 4 });
          iX += infCols[0].w;

          textAt(doc, l.lojaNome, iX + 2, curY + 3, { fontSize: 5, font: 'Helvetica', color: darkText, width: infCols[1].w - 4 });
          iX += infCols[1].w;

          textAt(doc, l.servicosVolante.toString(), iX + 2, curY + 3, { fontSize: 5, font: 'Helvetica-Bold', color: emerald, width: infCols[2].w - 4, align: 'right' });
          iX += infCols[2].w;

          textAt(doc, l.totalServicosLoja > 0 ? l.totalServicosLoja.toString() : 's/ dados', iX + 2, curY + 3, { fontSize: 5, font: 'Helvetica', color: gray, width: infCols[3].w - 4, align: 'right' });
          iX += infCols[3].w;

          const infColor = l.percentagemInfluencia >= 50 ? '#EF4444' : l.percentagemInfluencia >= 25 ? '#F59E0B' : '#10B981';
          // Progress bar
          if (l.totalServicosLoja > 0) {
            const barX = iX + 2;
            const barW = infCols[4].w - 26;
            const barH = 3;
            const barY = curY + 2;
            doc.rect(barX, barY, barW, barH).fillAndStroke('#E5E7EB', '#E5E7EB');
            const fillW = Math.min(barW, (l.percentagemInfluencia / 100) * barW);
            if (fillW > 0) doc.rect(barX, barY, fillW, barH).fillAndStroke(infColor, infColor);
          }
          textAt(doc, l.totalServicosLoja > 0 ? `${l.percentagemInfluencia.toFixed(1)}%` : '-', iX + 2, curY + 6, { fontSize: 5, font: 'Helvetica-Bold', color: infColor, width: infCols[4].w - 4, align: 'right' });

          curY += rowH;
        });

        // Legend
        curY += 2;
        doc.fontSize(4.5).font('Helvetica').fillColor(gray);
        const savedY = doc.y;
        doc.text('Legenda: ', LM, curY, { continued: true });
        doc.fillColor('#10B981').text('< 25%  ', { continued: true });
        doc.fillColor('#F59E0B').text('25-50%  ', { continued: true });
        doc.fillColor('#EF4444').text('> 50%  ', { continued: true });
        doc.fillColor(gray).text(`| Média: ${data.kpis.mediaInfluencia.toFixed(1)}%`);
        doc.y = savedY;
      }

      // ========== FOOTER ON ALL PAGES ==========
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        const savedY2 = doc.y;
        doc.fontSize(5).font('Helvetica').fillColor(gray)
           .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', LM, PH - 22, { align: 'center', width: PW });
        const now = new Date();
        const df = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        doc.fontSize(4).text(`Gerado em ${df} | Página ${i + 1} de ${pages.count}`, LM, PH - 15, { align: 'center', width: PW });
        doc.y = savedY2;
      }

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF Dashboard Volantes Gestor:', error);
      reject(error);
    }
  });
}

// ========== CHART RENDERERS ==========

async function renderAllCharts(data: DashboardVolantesGestorData) {
  const results: {
    servicosPorVolante?: Buffer;
    pedidosApoio?: Buffer;
    topLojas?: Buffer;
    influencia?: Buffer;
  } = {};

  const fontOpts = { family: FONT_FAMILY };

  // 1. Serviços por Volante - Stacked Bar
  if (data.porVolante.length > 0) {
    const sorted = [...data.porVolante].sort((a, b) => b.totalServicos - a.totalServicos);
    const labels = sorted.map(v => v.nome.length > 14 ? v.nome.substring(0, 14) + '…' : v.nome);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Subst.', data: sorted.map(v => v.substituicoes), backgroundColor: 'rgba(59, 130, 246, 0.8)' },
          { label: 'Repar.', data: sorted.map(v => v.reparacoes), backgroundColor: 'rgba(245, 158, 11, 0.8)' },
          { label: 'Calib.', data: sorted.map(v => v.calibragens), backgroundColor: 'rgba(139, 92, 247, 0.8)' },
          { label: 'Outros', data: sorted.map(v => v.outros), backgroundColor: 'rgba(107, 114, 128, 0.6)' },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { ...fontOpts, size: 9 }, boxWidth: 10, padding: 6 } },
          title: { display: false },
        },
        scales: {
          x: { stacked: true, ticks: { font: { ...fontOpts, size: 8 } } },
          y: { stacked: true, beginAtZero: true, ticks: { font: { ...fontOpts, size: 8 } } },
        },
      },
    };
    results.servicosPorVolante = await renderChart(config);
  }

  // 2. Pedidos de Apoio - Doughnut
  if (data.pedidosApoio.total > 0) {
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Aprovados', 'Pendentes', 'Reprovados'],
        datasets: [{
          data: [data.pedidosApoio.aprovados, data.pedidosApoio.pendentes, data.pedidosApoio.reprovados],
          backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
          borderColor: ['rgb(34, 197, 94)', 'rgb(245, 158, 11)', 'rgb(239, 68, 68)'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { font: { ...fontOpts, size: 9 }, boxWidth: 10, padding: 6 } },
          title: { display: false },
        },
      },
    };
    results.pedidosApoio = await renderChart(config, smallChartCanvas);
  }

  // 3. Top Lojas - Horizontal Bar
  if (data.topLojas.length > 0) {
    const top = data.topLojas.slice(0, 10);
    const labels = top.map(l => l.lojaNome.length > 20 ? l.lojaNome.substring(0, 20) + '…' : l.lojaNome);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Serviços',
          data: top.map(l => l.total),
          backgroundColor: top.map((_, i) => {
            const colors = [
              'rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)',
              'rgba(139, 92, 247, 0.8)', 'rgba(6, 182, 212, 0.8)', 'rgba(99, 102, 241, 0.8)',
              'rgba(244, 63, 94, 0.8)', 'rgba(20, 184, 166, 0.8)', 'rgba(168, 85, 247, 0.8)',
              'rgba(34, 197, 94, 0.8)',
            ];
            return colors[i % colors.length];
          }),
        }],
      },
      options: {
        responsive: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: { beginAtZero: true, ticks: { font: { ...fontOpts, size: 8 } } },
          y: { ticks: { font: { ...fontOpts, size: 7 } } },
        },
      },
    };
    results.topLojas = await renderChart(config);
  }

  // 4. Influência por Loja - Horizontal Bar
  if (data.influenciaPorLoja.length > 0) {
    const top = [...data.influenciaPorLoja].sort((a, b) => b.percentagemInfluencia - a.percentagemInfluencia).slice(0, 10);
    const labels = top.map(l => l.lojaNome.length > 18 ? l.lojaNome.substring(0, 18) + '…' : l.lojaNome);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Influência %',
          data: top.map(l => l.percentagemInfluencia),
          backgroundColor: top.map(l => {
            if (l.percentagemInfluencia >= 50) return 'rgba(239, 68, 68, 0.8)';
            if (l.percentagemInfluencia >= 25) return 'rgba(245, 158, 11, 0.8)';
            return 'rgba(16, 185, 129, 0.8)';
          }),
        }],
      },
      options: {
        responsive: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: { beginAtZero: true, max: 100, ticks: { font: { ...fontOpts, size: 8 }, callback: (v) => `${v}%` } },
          y: { ticks: { font: { ...fontOpts, size: 7 } } },
        },
      },
    };
    results.influencia = await renderChart(config, smallChartCanvas);
  }

  return results;
}
