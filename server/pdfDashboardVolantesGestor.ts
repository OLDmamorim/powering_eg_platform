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
const lightAmber = '#FEF3C7';

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
      const rowH = 13;
      const footerH = 30;

      function checkPageBreak(needed: number) {
        if (doc.y + needed > PH - footerH) {
          doc.addPage();
          doc.y = 30;
        }
      }

      // ========== HEADER ==========
      doc.rect(0, 0, doc.page.width, 48).fill(emerald);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('white')
         .text('Dashboard Volantes', LM, 10, { width: PW, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('white')
         .text(`Período: ${data.periodoLabel}`, LM, 30, { width: PW, align: 'center' });

      let startY = 54;
      const filtros: string[] = [];
      if (data.filtroVolante) filtros.push(`Volante: ${data.filtroVolante}`);
      if (data.filtroLoja) filtros.push(`Loja: ${data.filtroLoja}`);
      if (filtros.length > 0) {
        doc.fontSize(7).font('Helvetica').fillColor(rose)
           .text(`Filtros ativos: ${filtros.join(' | ')}`, LM, startY, { width: PW, align: 'center' });
        startY += 11;
      }

      // ========== KPIs: 2 rows of 4 ==========
      const kpiW = (PW - 9) / 4;
      const kpiH = 34;
      const kpiGap = 3;

      function drawKPI(x: number, y: number, label: string, value: string, color: string, sub?: string) {
        doc.rect(x, y, kpiW, kpiH).lineWidth(1).strokeColor(color).stroke();
        doc.fontSize(5.5).font('Helvetica-Bold').fillColor(color).text(label, x + 3, y + 2, { width: kpiW - 6 });
        doc.fontSize(13).font('Helvetica-Bold').fillColor(color).text(value, x + 3, y + 10, { width: kpiW - 6, align: 'center' });
        if (sub) {
          doc.fontSize(4.5).font('Helvetica').fillColor(gray).text(sub, x + 3, y + 26, { width: kpiW - 6, align: 'center' });
        }
      }

      drawKPI(LM, startY, 'Volantes Ativos', data.totalVolantes.toString(), emerald);
      drawKPI(LM + kpiW + kpiGap, startY, 'Total Serviços', data.kpis.totalServicos.toString(), blue);
      drawKPI(LM + (kpiW + kpiGap) * 2, startY, 'Substituições', data.kpis.totalSubstituicoes.toString(), cyan);
      drawKPI(LM + (kpiW + kpiGap) * 3, startY, 'Reparações', data.kpis.totalReparacoes.toString(), amber);

      const kpiY2 = startY + kpiH + 3;
      drawKPI(LM, kpiY2, 'Calibragens', data.kpis.totalCalibragens.toString(), purple);
      drawKPI(LM + kpiW + kpiGap, kpiY2, 'Dias Trabalhados', data.kpis.diasTrabalhados.toString(), teal);
      drawKPI(LM + (kpiW + kpiGap) * 2, kpiY2, 'Média/Dia', data.kpis.mediaPorDia.toFixed(1), indigo);
      drawKPI(LM + (kpiW + kpiGap) * 3, kpiY2, 'Influência Média', `${data.kpis.mediaInfluencia.toFixed(1)}%`, rose, 'nos resultados da loja');

      doc.y = kpiY2 + kpiH + 8;

      // ========== TABELA ATIVIDADE POR VOLANTE ==========
      doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text('Atividade por Volante', LM, doc.y);
      doc.y += 11;

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

      let tY = doc.y;

      // Header row
      doc.rect(LM, tY, PW, rowH).fillAndStroke(lightGreen, lightGreen);
      let cX = LM;
      cols.forEach(c => {
        doc.fontSize(5.5).font('Helvetica-Bold').fillColor(darkText).text(c.label, cX + 2, tY + 3, { width: c.w - 4 });
        cX += c.w;
      });
      tY += rowH;

      const sorted = [...data.porVolante].sort((a, b) => b.totalServicos - a.totalServicos);
      sorted.forEach((v, idx) => {
        const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(LM, tY, PW, rowH).fillAndStroke(bg, bg);
        cX = LM;
        const vals = [v.nome, v.totalLojas, v.totalServicos, v.substituicoes, v.reparacoes, v.calibragens, v.outros, v.diasTrabalhados, v.mediaPorDia.toFixed(1)];
        const clrs = [darkText, gray, emerald, blue, amber, purple, gray, teal, indigo];
        vals.forEach((val, i) => {
          doc.fontSize(5.5).font(i === 0 || i === 2 ? 'Helvetica-Bold' : 'Helvetica')
             .fillColor(clrs[i]).text(String(val), cX + 2, tY + 3, { width: cols[i].w - 4 });
          cX += cols[i].w;
        });
        tY += rowH;
      });

      // Totals row
      if (sorted.length > 1) {
        doc.rect(LM, tY, PW, rowH).fillAndStroke(lightGreen, emerald);
        cX = LM;
        const totals = ['TOTAL', '-', data.kpis.totalServicos, data.kpis.totalSubstituicoes, data.kpis.totalReparacoes, data.kpis.totalCalibragens, data.kpis.totalOutros, data.kpis.diasTrabalhados, data.kpis.mediaPorDia.toFixed(1)];
        totals.forEach((val, i) => {
          doc.fontSize(5.5).font('Helvetica-Bold').fillColor(darkText).text(String(val), cX + 2, tY + 3, { width: cols[i].w - 4 });
          cX += cols[i].w;
        });
        tY += rowH;
      }

      doc.y = tY + 6;

      // ========== CHARTS ROW 1: Serviços por Volante + Pedidos de Apoio ==========
      checkPageBreak(175);
      const chartLeftW = PW * 0.58;
      const chartRightW = PW * 0.42 - 6;

      doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text('Serviços por Volante', LM, doc.y);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text('Pedidos de Apoio', LM + chartLeftW + 6, doc.y);
      
      const chartImgY = doc.y + 10;

      if (chartImages.servicosPorVolante) {
        doc.image(chartImages.servicosPorVolante, LM, chartImgY, { width: chartLeftW, height: 145 });
      }

      if (chartImages.pedidosApoio) {
        doc.image(chartImages.pedidosApoio, LM + chartLeftW + 6, chartImgY, { width: chartRightW, height: 145 });
      } else {
        // Fallback: show numbers as text
        const apoioY = chartImgY + 10;
        doc.fontSize(8).font('Helvetica').fillColor(darkText);
        doc.text(`Aprovados: ${data.pedidosApoio.aprovados}`, LM + chartLeftW + 10, apoioY);
        doc.text(`Pendentes: ${data.pedidosApoio.pendentes}`, LM + chartLeftW + 10, apoioY + 14);
        doc.text(`Reprovados: ${data.pedidosApoio.reprovados}`, LM + chartLeftW + 10, apoioY + 28);
        doc.text(`Total: ${data.pedidosApoio.total}`, LM + chartLeftW + 10, apoioY + 42);
      }

      doc.y = chartImgY + 145 + 6;

      // ========== CHARTS ROW 2: Top Lojas + Influência ==========
      checkPageBreak(175);
      const charts2Y = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text('Top 10 Lojas', LM, charts2Y);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text('Influência por Loja', LM + chartLeftW + 6, charts2Y);

      const chart2ImgY = charts2Y + 10;

      if (chartImages.topLojas) {
        doc.image(chartImages.topLojas, LM, chart2ImgY, { width: chartLeftW, height: 150 });
      }

      if (chartImages.influencia) {
        doc.image(chartImages.influencia, LM + chartLeftW + 6, chart2ImgY, { width: chartRightW, height: 150 });
      }

      doc.y = chart2ImgY + 150 + 6;

      // ========== TABELA OCUPAÇÃO POR VOLANTE ==========
      if (data.ocupacaoPorVolante && data.ocupacaoPorVolante.length > 0) {
        checkPageBreak(60);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text('Ocupação dos Volantes por Loja', LM, doc.y);
        doc.fontSize(5.5).font('Helvetica').fillColor(gray)
           .text('Distribuição dos serviços e dias de cada volante pelas lojas', LM, doc.y + 11);
        doc.y += 20;

        const ocCols = [
          { label: 'Loja', w: PW - 200 },
          { label: 'Serviços', w: 50 },
          { label: '% Serv.', w: 50 },
          { label: 'Dias', w: 50 },
          { label: '% Dias', w: 50 },
        ];

        data.ocupacaoPorVolante.forEach((vol) => {
          checkPageBreak(rowH * (vol.lojas.length + 2) + 10);

          // Volante header
          doc.rect(LM, doc.y, PW, rowH + 1).fillAndStroke(lightBlue, lightBlue);
          doc.fontSize(6).font('Helvetica-Bold').fillColor(indigo)
             .text(`${vol.volanteNome}`, LM + 3, doc.y + 3, { width: PW * 0.4 });
          doc.fontSize(5).font('Helvetica').fillColor(gray)
             .text(`${vol.lojas.length} lojas | ${vol.totalServicos} serviços | ${vol.totalDias} dias`, LM + PW * 0.4, doc.y + 4, { width: PW * 0.6, align: 'right' });
          doc.y += rowH + 1;

          // Column headers
          doc.rect(LM, doc.y, PW, rowH).fillAndStroke('#F3F4F6', '#F3F4F6');
          let oX = LM;
          ocCols.forEach(c => {
            doc.fontSize(5).font('Helvetica-Bold').fillColor(gray).text(c.label, oX + 2, doc.y + 3, { width: c.w - 4, align: c.label === 'Loja' ? 'left' : 'right' });
            oX += c.w;
          });
          doc.y += rowH;

          // Loja rows
          const topLojas = vol.lojas.slice(0, 8);
          topLojas.forEach((l, idx) => {
            checkPageBreak(rowH);
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
            doc.rect(LM, doc.y, PW, rowH).fillAndStroke(bg, bg);
            oX = LM;

            doc.fontSize(5.5).font('Helvetica').fillColor(darkText).text(l.lojaNome, oX + 2, doc.y + 3, { width: ocCols[0].w - 4 });
            oX += ocCols[0].w;

            doc.fontSize(5.5).font('Helvetica-Bold').fillColor(blue).text(l.servicos.toString(), oX + 2, doc.y + 3, { width: ocCols[1].w - 4, align: 'right' });
            oX += ocCols[1].w;

            const sColor = l.percentagemServicos >= 40 ? indigo : l.percentagemServicos >= 20 ? blue : gray;
            doc.fontSize(5.5).font('Helvetica-Bold').fillColor(sColor).text(`${l.percentagemServicos.toFixed(1)}%`, oX + 2, doc.y + 3, { width: ocCols[2].w - 4, align: 'right' });
            oX += ocCols[2].w;

            doc.fontSize(5.5).font('Helvetica').fillColor(teal).text(l.dias.toString(), oX + 2, doc.y + 3, { width: ocCols[3].w - 4, align: 'right' });
            oX += ocCols[3].w;

            const dColor = l.percentagemDias >= 40 ? indigo : l.percentagemDias >= 20 ? teal : gray;
            doc.fontSize(5.5).font('Helvetica-Bold').fillColor(dColor).text(`${l.percentagemDias.toFixed(1)}%`, oX + 2, doc.y + 3, { width: ocCols[4].w - 4, align: 'right' });

            doc.y += rowH;
          });

          if (vol.lojas.length > 8) {
            doc.fontSize(5).font('Helvetica').fillColor(gray)
               .text(`... e mais ${vol.lojas.length - 8} lojas`, LM + 3, doc.y + 1);
            doc.y += 10;
          }

          doc.y += 4;
        });
      }

      // ========== TABELA INFLUÊNCIA POR LOJA ==========
      if (data.influenciaPorLoja.length > 0) {
        checkPageBreak(30 + Math.min(data.influenciaPorLoja.length, 15) * rowH);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
           .text('Detalhe Influência por Loja', LM, doc.y);
        doc.fontSize(5.5).font('Helvetica').fillColor(gray)
           .text('Percentagem dos serviços totais da loja realizados pelos volantes', LM, doc.y + 11);
        doc.y += 20;

        const infCols = [
          { label: '#', w: 18 },
          { label: 'Loja', w: PW - 158 },
          { label: 'Serv. Vol.', w: 45 },
          { label: 'Total Loja', w: 45 },
          { label: 'Influência', w: 50 },
        ];

        // Header
        doc.rect(LM, doc.y, PW, rowH).fillAndStroke(lightRose, lightRose);
        let iX = LM;
        infCols.forEach(c => {
          doc.fontSize(5.5).font('Helvetica-Bold').fillColor(darkText).text(c.label, iX + 2, doc.y + 3, { width: c.w - 4, align: c.label === '#' || c.label === 'Loja' ? 'left' : 'right' });
          iX += c.w;
        });
        doc.y += rowH;

        const toShow = data.influenciaPorLoja.slice(0, 15);
        toShow.forEach((l, idx) => {
          checkPageBreak(rowH);

          const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
          doc.rect(LM, doc.y, PW, rowH).fillAndStroke(bg, bg);

          iX = LM;
          doc.fontSize(5.5).font('Helvetica').fillColor(gray).text((idx + 1).toString(), iX + 2, doc.y + 3, { width: infCols[0].w - 4 });
          iX += infCols[0].w;

          doc.fontSize(5.5).font('Helvetica').fillColor(darkText).text(l.lojaNome, iX + 2, doc.y + 3, { width: infCols[1].w - 4 });
          iX += infCols[1].w;

          doc.fontSize(5.5).font('Helvetica-Bold').fillColor(emerald).text(l.servicosVolante.toString(), iX + 2, doc.y + 3, { width: infCols[2].w - 4, align: 'right' });
          iX += infCols[2].w;

          doc.fontSize(5.5).font('Helvetica').fillColor(gray).text(l.totalServicosLoja > 0 ? l.totalServicosLoja.toString() : 's/ dados', iX + 2, doc.y + 3, { width: infCols[3].w - 4, align: 'right' });
          iX += infCols[3].w;

          const infColor = l.percentagemInfluencia >= 50 ? '#EF4444' : l.percentagemInfluencia >= 25 ? '#F59E0B' : '#10B981';
          // Progress bar
          if (l.totalServicosLoja > 0) {
            const barX = iX + 2;
            const barW = infCols[4].w - 26;
            const barH = 3;
            const barY = doc.y + 2;
            doc.rect(barX, barY, barW, barH).fillAndStroke('#E5E7EB', '#E5E7EB');
            const fillW = Math.min(barW, (l.percentagemInfluencia / 100) * barW);
            if (fillW > 0) doc.rect(barX, barY, fillW, barH).fillAndStroke(infColor, infColor);
          }
          doc.fontSize(5.5).font('Helvetica-Bold').fillColor(infColor)
             .text(l.totalServicosLoja > 0 ? `${l.percentagemInfluencia.toFixed(1)}%` : '-', iX + 2, doc.y + 6, { width: infCols[4].w - 4, align: 'right' });

          doc.y += rowH;
        });

        // Legend
        doc.y += 3;
        doc.fontSize(5).font('Helvetica').fillColor(gray).text('Legenda: ', LM, doc.y, { continued: true });
        doc.fillColor('#10B981').text('< 25%  ', { continued: true });
        doc.fillColor('#F59E0B').text('25-50%  ', { continued: true });
        doc.fillColor('#EF4444').text('> 50%  ', { continued: true });
        doc.fillColor(gray).text(`| Média: ${data.kpis.mediaInfluencia.toFixed(1)}%`);
      }

      // ========== FOOTER ON ALL PAGES ==========
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(5.5).font('Helvetica').fillColor(gray)
           .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', LM, PH - 24, { align: 'center', width: PW });
        const now = new Date();
        const df = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        doc.fontSize(4.5).text(`Gerado em ${df} | Página ${i + 1} de ${pages.count}`, LM, PH - 17, { align: 'center', width: PW });
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
