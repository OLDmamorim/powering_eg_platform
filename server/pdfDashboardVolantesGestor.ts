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

export interface DashboardVolantesGestorData {
  totalVolantes: number;
  kpis: KPIs;
  porVolante: VolanteStats[];
  pedidosApoio: PedidosApoio;
  topLojas: TopLoja[];
  influenciaPorLoja: InfluenciaLoja[];
  periodoLabel: string;
  filtroVolante?: string;
  filtroLoja?: string;
}

// Chart renderer - reusable instance
const chartWidth = 260;
const chartHeight = 160;
const chartCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight, backgroundColour: 'white' });

const smallChartCanvas = new ChartJSNodeCanvas({ width: 180, height: 160, backgroundColour: 'white' });

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

export async function gerarPDFDashboardVolantesGestor(data: DashboardVolantesGestorData): Promise<Buffer> {
  // Pre-render all charts as PNG buffers
  const chartImages = await renderAllCharts(data);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LM = 30; // left margin
      const PW = doc.page.width - 60; // page width
      const PH = doc.page.height;
      const rowH = 14;

      // ========== PAGE 1: HEADER + KPIs + TABLE + CHARTS ==========

      // Header bar
      doc.rect(0, 0, doc.page.width, 50).fill(emerald);
      doc.fontSize(18).font('Helvetica-Bold').fillColor('white')
         .text('Dashboard Volantes', LM, 12, { width: PW, align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('white')
         .text(`Período: ${data.periodoLabel}`, LM, 33, { width: PW, align: 'center' });

      // Filtros ativos
      let startY = 56;
      const filtros: string[] = [];
      if (data.filtroVolante) filtros.push(`Volante: ${data.filtroVolante}`);
      if (data.filtroLoja) filtros.push(`Loja: ${data.filtroLoja}`);
      if (filtros.length > 0) {
        doc.fontSize(7).font('Helvetica').fillColor(rose)
           .text(`Filtros ativos: ${filtros.join(' | ')}`, LM, startY, { width: PW, align: 'center' });
        startY += 12;
      }

      // ---- KPIs: 2 rows of 4 compact boxes ----
      const kpiW = (PW - 9) / 4; // 3px spacing between
      const kpiH = 36;
      const kpiGap = 3;

      function drawKPI(x: number, y: number, label: string, value: string, color: string, sub?: string) {
        doc.rect(x, y, kpiW, kpiH).lineWidth(1.2).strokeColor(color).stroke();
        doc.fontSize(6).font('Helvetica-Bold').fillColor(color).text(label, x + 4, y + 3, { width: kpiW - 8 });
        doc.fontSize(14).font('Helvetica-Bold').fillColor(color).text(value, x + 4, y + 12, { width: kpiW - 8, align: 'center' });
        if (sub) {
          doc.fontSize(5).font('Helvetica').fillColor(gray).text(sub, x + 4, y + 28, { width: kpiW - 8, align: 'center' });
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

      doc.y = kpiY2 + kpiH + 10;

      // ---- TABELA ATIVIDADE POR VOLANTE ----
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText).text('Atividade por Volante', LM, doc.y);
      doc.y += 12;

      const cols = [
        { label: 'Volante', w: 100 },
        { label: 'Lojas', w: 32 },
        { label: 'Total', w: 38 },
        { label: 'Subst.', w: 38 },
        { label: 'Repar.', w: 38 },
        { label: 'Calib.', w: 38 },
        { label: 'Outros', w: 38 },
        { label: 'Dias', w: 32 },
        { label: 'Méd/Dia', w: 42 },
      ];

      // Adjust last column to fill remaining width
      const totalColW = cols.reduce((s, c) => s + c.w, 0);
      if (totalColW < PW) cols[cols.length - 1].w += PW - totalColW;

      let tY = doc.y;

      // Header
      doc.rect(LM, tY, PW, rowH).fillAndStroke(lightGreen, lightGreen);
      let cX = LM;
      cols.forEach(c => {
        doc.fontSize(6).font('Helvetica-Bold').fillColor(darkText).text(c.label, cX + 2, tY + 3, { width: c.w - 4 });
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
          doc.fontSize(6).font(i === 0 || i === 2 ? 'Helvetica-Bold' : 'Helvetica')
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
          doc.fontSize(6).font('Helvetica-Bold').fillColor(darkText).text(String(val), cX + 2, tY + 3, { width: cols[i].w - 4 });
          cX += cols[i].w;
        });
        tY += rowH;
      }

      doc.y = tY + 8;

      // ---- CHARTS ROW: Serviços por Volante (bar) + Pedidos de Apoio (doughnut) ----
      const chartsY = doc.y;
      const chartLeftW = PW * 0.6;
      const chartRightW = PW * 0.4 - 6;

      // Section label
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText).text('Serviços por Volante', LM, chartsY);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText).text('Pedidos de Apoio', LM + chartLeftW + 6, chartsY);
      
      const chartImgY = chartsY + 12;

      if (chartImages.servicosPorVolante) {
        doc.image(chartImages.servicosPorVolante, LM, chartImgY, { width: chartLeftW, height: 140 });
      }

      if (chartImages.pedidosApoio) {
        doc.image(chartImages.pedidosApoio, LM + chartLeftW + 6, chartImgY, { width: chartRightW, height: 140 });
      } else {
        // Fallback: show numbers
        const apoioY = chartImgY + 10;
        const apoioW = chartRightW / 2 - 2;
        drawKPI(LM + chartLeftW + 6, apoioY, 'Aprovados', data.pedidosApoio.aprovados.toString(), '#22C55E');
        drawKPI(LM + chartLeftW + 6 + apoioW + 4, apoioY, 'Pendentes', data.pedidosApoio.pendentes.toString(), amber);
        drawKPI(LM + chartLeftW + 6, apoioY + kpiH + 4, 'Reprovados', data.pedidosApoio.reprovados.toString(), '#EF4444');
        drawKPI(LM + chartLeftW + 6 + apoioW + 4, apoioY + kpiH + 4, 'Total', data.pedidosApoio.total.toString(), gray);
      }

      doc.y = chartImgY + 140 + 8;

      // ---- CHARTS ROW 2: Top Lojas (bar horizontal) + Influência (bar horizontal) ----
      // Check if we need a new page
      if (doc.y + 170 > PH - 40) {
        doc.addPage();
        doc.y = 30;
      }

      const charts2Y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText).text('Top 10 Lojas', LM, charts2Y);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText).text('Influência por Loja', LM + chartLeftW + 6, charts2Y);

      const chart2ImgY = charts2Y + 12;

      if (chartImages.topLojas) {
        doc.image(chartImages.topLojas, LM, chart2ImgY, { width: chartLeftW, height: 150 });
      }

      if (chartImages.influencia) {
        doc.image(chartImages.influencia, LM + chartLeftW + 6, chart2ImgY, { width: chartRightW, height: 150 });
      }

      doc.y = chart2ImgY + 150 + 8;

      // ---- INFLUÊNCIA TABLE (compact, on page 2 if needed) ----
      if (data.influenciaPorLoja.length > 0) {
        if (doc.y + 30 + Math.min(data.influenciaPorLoja.length, 15) * rowH > PH - 40) {
          doc.addPage();
          doc.y = 30;
        }

        doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
           .text('Detalhe Influência por Loja', LM, doc.y);
        doc.fontSize(6).font('Helvetica').fillColor(gray)
           .text('Percentagem dos serviços totais da loja realizados pelos volantes', LM, doc.y + 12);
        doc.y += 22;

        const infCols = [
          { label: '#', w: 20 },
          { label: 'Loja', w: PW - 180 },
          { label: 'Serv. Vol.', w: 50 },
          { label: 'Total Loja', w: 50 },
          { label: 'Influência', w: 60 },
        ];

        let iY = doc.y;

        // Header
        doc.rect(LM, iY, PW, rowH).fillAndStroke(lightRose, lightRose);
        let iX = LM;
        infCols.forEach(c => {
          doc.fontSize(6).font('Helvetica-Bold').fillColor(darkText).text(c.label, iX + 2, iY + 3, { width: c.w - 4, align: c.label === '#' || c.label === 'Loja' ? 'left' : 'right' });
          iX += c.w;
        });
        iY += rowH;

        const toShow = data.influenciaPorLoja.slice(0, 15);
        toShow.forEach((l, idx) => {
          if (iY + rowH > PH - 40) {
            doc.addPage();
            iY = 30;
          }

          const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
          doc.rect(LM, iY, PW, rowH).fillAndStroke(bg, bg);

          iX = LM;
          doc.fontSize(6).font('Helvetica').fillColor(gray).text((idx + 1).toString(), iX + 2, iY + 3, { width: infCols[0].w - 4 });
          iX += infCols[0].w;

          doc.fontSize(6).font('Helvetica').fillColor(darkText).text(l.lojaNome, iX + 2, iY + 3, { width: infCols[1].w - 4 });
          iX += infCols[1].w;

          doc.fontSize(6).font('Helvetica-Bold').fillColor(emerald).text(l.servicosVolante.toString(), iX + 2, iY + 3, { width: infCols[2].w - 4, align: 'right' });
          iX += infCols[2].w;

          doc.fontSize(6).font('Helvetica').fillColor(gray).text(l.totalServicosLoja > 0 ? l.totalServicosLoja.toString() : 's/ dados', iX + 2, iY + 3, { width: infCols[3].w - 4, align: 'right' });
          iX += infCols[3].w;

          // Influence bar + percentage
          const infColor = l.percentagemInfluencia >= 50 ? '#EF4444' : l.percentagemInfluencia >= 25 ? '#F59E0B' : '#10B981';
          if (l.totalServicosLoja > 0) {
            const barX = iX + 2;
            const barW = infCols[4].w - 28;
            const barH = 4;
            const barY = iY + 2;
            doc.rect(barX, barY, barW, barH).fillAndStroke('#E5E7EB', '#E5E7EB');
            const fillW = Math.min(barW, (l.percentagemInfluencia / 100) * barW);
            if (fillW > 0) doc.rect(barX, barY, fillW, barH).fillAndStroke(infColor, infColor);
          }
          doc.fontSize(6).font('Helvetica-Bold').fillColor(infColor)
             .text(l.totalServicosLoja > 0 ? `${l.percentagemInfluencia.toFixed(1)}%` : '-', iX + 2, iY + 7, { width: infCols[4].w - 4, align: 'right' });

          iY += rowH;
        });

        // Legend
        iY += 4;
        doc.fontSize(5).font('Helvetica').fillColor(gray).text('Legenda: ', LM, iY, { continued: true });
        doc.fillColor('#10B981').text('< 25%  ', { continued: true });
        doc.fillColor('#F59E0B').text('25-50%  ', { continued: true });
        doc.fillColor('#EF4444').text('> 50%  ', { continued: true });
        doc.fillColor(gray).text(`| Média: ${data.kpis.mediaInfluencia.toFixed(1)}%`);
      }

      // ========== FOOTER ON ALL PAGES ==========
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(6).font('Helvetica').fillColor(gray)
           .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', LM, PH - 25, { align: 'center', width: PW });
        const now = new Date();
        const df = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        doc.fontSize(5).text(`Gerado em ${df} | Página ${i + 1} de ${pages.count}`, LM, PH - 18, { align: 'center', width: PW });
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

  // 1. Serviços por Volante - Stacked Bar
  if (data.porVolante.length > 0) {
    const sorted = [...data.porVolante].sort((a, b) => b.totalServicos - a.totalServicos);
    const labels = sorted.map(v => v.nome.length > 12 ? v.nome.substring(0, 12) + '...' : v.nome);
    
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
          legend: { display: true, position: 'top', labels: { font: { size: 9 }, boxWidth: 10 } },
          title: { display: false },
        },
        scales: {
          x: { stacked: true, ticks: { font: { size: 8 } } },
          y: { stacked: true, beginAtZero: true, ticks: { font: { size: 8 } } },
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
          legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } },
          title: { display: false },
        },
      },
    };
    results.pedidosApoio = await renderChart(config, smallChartCanvas);
  }

  // 3. Top Lojas - Horizontal Bar
  if (data.topLojas.length > 0) {
    const top = data.topLojas.slice(0, 10);
    const labels = top.map(l => l.lojaNome.length > 18 ? l.lojaNome.substring(0, 18) + '...' : l.lojaNome);
    
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
          x: { beginAtZero: true, ticks: { font: { size: 8 } } },
          y: { ticks: { font: { size: 7 } } },
        },
      },
    };
    results.topLojas = await renderChart(config);
  }

  // 4. Influência por Loja - Horizontal Bar
  if (data.influenciaPorLoja.length > 0) {
    const top = [...data.influenciaPorLoja].sort((a, b) => b.percentagemInfluencia - a.percentagemInfluencia).slice(0, 10);
    const labels = top.map(l => l.lojaNome.length > 16 ? l.lojaNome.substring(0, 16) + '...' : l.lojaNome);
    
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
          x: { beginAtZero: true, max: 100, ticks: { font: { size: 8 }, callback: (v) => `${v}%` } },
          y: { ticks: { font: { size: 7 } } },
        },
      },
    };
    results.influencia = await renderChart(config, smallChartCanvas);
  }

  return results;
}
