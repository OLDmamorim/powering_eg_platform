import PDFDocument from 'pdfkit';

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

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export async function gerarPDFDashboardVolantesGestor(data: DashboardVolantesGestorData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const leftMargin = 40;
      const pageWidth = doc.page.width - 80;
      const pageHeight = doc.page.height;

      // Cores
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

      // Helper: check page break
      function checkPageBreak(neededHeight: number) {
        if (doc.y + neededHeight > pageHeight - 60) {
          doc.addPage();
          return true;
        }
        return false;
      }

      // Helper: draw a colored KPI box
      function drawKPIBox(x: number, y: number, w: number, h: number, label: string, value: string, color: string, sublabel?: string) {
        // Background
        doc.rect(x, y, w, h).lineWidth(1.5).strokeColor(color).stroke();
        // Label
        doc.fontSize(7).font('Helvetica-Bold').fillColor(color).text(label, x + 6, y + 6, { width: w - 12 });
        // Value
        doc.fontSize(16).font('Helvetica-Bold').fillColor(color).text(value, x + 6, y + 20, { width: w - 12, align: 'center' });
        // Sublabel
        if (sublabel) {
          doc.fontSize(6).font('Helvetica').fillColor(gray).text(sublabel, x + 6, y + 38, { width: w - 12, align: 'center' });
        }
      }

      // ========== CABEÇALHO ==========
      // Logo
      try {
        doc.image('/home/ubuntu/powering_eg_platform/server/assets/expressglass-logo.png', leftMargin, 30, { width: 100 });
      } catch (e) {
        // Fallback sem logo
      }

      doc.fontSize(18).font('Helvetica-Bold').fillColor(emerald)
         .text('Dashboard Volantes', leftMargin, 55, { align: 'center', width: pageWidth });
      
      doc.fontSize(10).font('Helvetica').fillColor(gray)
         .text(`Período: ${data.periodoLabel}`, leftMargin, 77, { align: 'center', width: pageWidth });

      // Filtros ativos
      const filtros: string[] = [];
      if (data.filtroVolante) filtros.push(`Volante: ${data.filtroVolante}`);
      if (data.filtroLoja) filtros.push(`Loja: ${data.filtroLoja}`);
      if (filtros.length > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(rose)
           .text(`Filtros: ${filtros.join(' | ')}`, leftMargin, 90, { align: 'center', width: pageWidth });
      }

      // Linha separadora
      const lineY = filtros.length > 0 ? 103 : 93;
      doc.strokeColor(emerald).lineWidth(2);
      doc.moveTo(leftMargin, lineY).lineTo(leftMargin + pageWidth, lineY).stroke();
      doc.y = lineY + 12;

      // ========== KPIs ==========
      doc.fontSize(12).font('Helvetica-Bold').fillColor(darkText).text('Indicadores Chave', leftMargin, doc.y);
      doc.y += 16;

      const kpiY = doc.y;
      const kpiW = (pageWidth - 21) / 4; // 4 per row, 7px spacing
      const kpiH = 48;
      const kpiSpacing = 7;

      // Row 1
      drawKPIBox(leftMargin, kpiY, kpiW, kpiH, 'Volantes Ativos', data.totalVolantes.toString(), emerald);
      drawKPIBox(leftMargin + kpiW + kpiSpacing, kpiY, kpiW, kpiH, 'Total Serviços', data.kpis.totalServicos.toString(), blue);
      drawKPIBox(leftMargin + (kpiW + kpiSpacing) * 2, kpiY, kpiW, kpiH, 'Substituições', data.kpis.totalSubstituicoes.toString(), cyan);
      drawKPIBox(leftMargin + (kpiW + kpiSpacing) * 3, kpiY, kpiW, kpiH, 'Reparações', data.kpis.totalReparacoes.toString(), amber);

      // Row 2
      const kpiY2 = kpiY + kpiH + 6;
      drawKPIBox(leftMargin, kpiY2, kpiW, kpiH, 'Calibragens', data.kpis.totalCalibragens.toString(), purple);
      drawKPIBox(leftMargin + kpiW + kpiSpacing, kpiY2, kpiW, kpiH, 'Dias Trabalhados', data.kpis.diasTrabalhados.toString(), teal);
      drawKPIBox(leftMargin + (kpiW + kpiSpacing) * 2, kpiY2, kpiW, kpiH, 'Média/Dia', data.kpis.mediaPorDia.toString(), indigo);
      drawKPIBox(leftMargin + (kpiW + kpiSpacing) * 3, kpiY2, kpiW, kpiH, 'Influência Média', `${data.kpis.mediaInfluencia}%`, rose, 'nos resultados da loja');

      doc.y = kpiY2 + kpiH + 18;

      // ========== TABELA ATIVIDADE POR VOLANTE ==========
      doc.fontSize(12).font('Helvetica-Bold').fillColor(darkText).text('Atividade por Volante', leftMargin, doc.y);
      doc.y += 14;

      // Table headers
      const cols = [
        { label: 'Volante', width: 110 },
        { label: 'Lojas', width: 35 },
        { label: 'Total', width: 40 },
        { label: 'Subst.', width: 40 },
        { label: 'Repar.', width: 40 },
        { label: 'Calib.', width: 40 },
        { label: 'Outros', width: 40 },
        { label: 'Dias', width: 35 },
        { label: 'Méd/Dia', width: 42 },
      ];

      const tableRowH = 16;
      let tableX = leftMargin;
      let tableY = doc.y;

      // Header row
      doc.rect(leftMargin, tableY, pageWidth, tableRowH).fillAndStroke('#D1FAE5', '#D1FAE5');
      let colX = leftMargin;
      cols.forEach(col => {
        doc.fontSize(7).font('Helvetica-Bold').fillColor(darkText)
           .text(col.label, colX + 3, tableY + 4, { width: col.width - 6 });
        colX += col.width;
      });
      tableY += tableRowH;

      // Data rows
      const sortedVolantes = [...data.porVolante].sort((a, b) => b.totalServicos - a.totalServicos);
      sortedVolantes.forEach((v, idx) => {
        checkPageBreak(tableRowH);
        const bgColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(leftMargin, tableY, pageWidth, tableRowH).fillAndStroke(bgColor, bgColor);

        colX = leftMargin;
        const values = [
          v.nome,
          v.totalLojas.toString(),
          v.totalServicos.toString(),
          v.substituicoes.toString(),
          v.reparacoes.toString(),
          v.calibragens.toString(),
          v.outros.toString(),
          v.diasTrabalhados.toString(),
          v.mediaPorDia.toString(),
        ];
        const colors = [darkText, gray, emerald, blue, amber, purple, gray, teal, indigo];

        values.forEach((val, i) => {
          doc.fontSize(7).font(i === 0 || i === 2 ? 'Helvetica-Bold' : 'Helvetica')
             .fillColor(colors[i])
             .text(val, colX + 3, tableY + 4, { width: cols[i].width - 6 });
          colX += cols[i].width;
        });
        tableY += tableRowH;
      });

      // Totals row
      if (sortedVolantes.length > 1) {
        doc.rect(leftMargin, tableY, pageWidth, tableRowH).fillAndStroke('#D1FAE5', emerald);
        colX = leftMargin;
        const totals = [
          'TOTAL',
          '-',
          data.kpis.totalServicos.toString(),
          data.kpis.totalSubstituicoes.toString(),
          data.kpis.totalReparacoes.toString(),
          data.kpis.totalCalibragens.toString(),
          data.kpis.totalOutros.toString(),
          data.kpis.diasTrabalhados.toString(),
          data.kpis.mediaPorDia.toString(),
        ];
        totals.forEach((val, i) => {
          doc.fontSize(7).font('Helvetica-Bold').fillColor(darkText)
             .text(val, colX + 3, tableY + 4, { width: cols[i].width - 6 });
          colX += cols[i].width;
        });
        tableY += tableRowH;
      }

      doc.y = tableY + 16;

      // ========== PEDIDOS DE APOIO ==========
      checkPageBreak(80);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(darkText).text('Pedidos de Apoio', leftMargin, doc.y);
      doc.y += 14;

      const apoioY = doc.y;
      const apoioW = (pageWidth - 21) / 4;
      
      drawKPIBox(leftMargin, apoioY, apoioW, 42, 'Total', data.pedidosApoio.total.toString(), gray);
      drawKPIBox(leftMargin + apoioW + kpiSpacing, apoioY, apoioW, 42, 'Aprovados', data.pedidosApoio.aprovados.toString(), '#22C55E');
      drawKPIBox(leftMargin + (apoioW + kpiSpacing) * 2, apoioY, apoioW, 42, 'Pendentes', data.pedidosApoio.pendentes.toString(), amber);
      drawKPIBox(leftMargin + (apoioW + kpiSpacing) * 3, apoioY, apoioW, 42, 'Reprovados', data.pedidosApoio.reprovados.toString(), '#EF4444');

      doc.y = apoioY + 42 + 16;

      // ========== TOP 10 LOJAS ==========
      if (data.topLojas.length > 0) {
        checkPageBreak(30 + data.topLojas.length * 16);
        doc.fontSize(12).font('Helvetica-Bold').fillColor(darkText).text('Top 10 Lojas com Mais Serviços', leftMargin, doc.y);
        doc.y += 14;

        const lojaTableY = doc.y;
        const lojaColWidths = [30, pageWidth - 95, 65];

        // Header
        doc.rect(leftMargin, lojaTableY, pageWidth, tableRowH).fillAndStroke('#DBEAFE', '#DBEAFE');
        doc.fontSize(7).font('Helvetica-Bold').fillColor(darkText)
           .text('#', leftMargin + 4, lojaTableY + 4, { width: lojaColWidths[0] - 8 })
           .text('Loja', leftMargin + lojaColWidths[0] + 4, lojaTableY + 4, { width: lojaColWidths[1] - 8 })
           .text('Serviços', leftMargin + lojaColWidths[0] + lojaColWidths[1] + 4, lojaTableY + 4, { width: lojaColWidths[2] - 8, align: 'right' });

        let lY = lojaTableY + tableRowH;
        data.topLojas.forEach((loja, idx) => {
          const bgColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
          doc.rect(leftMargin, lY, pageWidth, tableRowH).fillAndStroke(bgColor, bgColor);
          
          const medal = idx === 0 ? '1.' : idx === 1 ? '2.' : idx === 2 ? '3.' : `${idx + 1}.`;
          doc.fontSize(7).font('Helvetica-Bold').fillColor(idx < 3 ? emerald : gray)
             .text(medal, leftMargin + 4, lY + 4, { width: lojaColWidths[0] - 8 });
          doc.fontSize(7).font('Helvetica').fillColor(darkText)
             .text(loja.lojaNome, leftMargin + lojaColWidths[0] + 4, lY + 4, { width: lojaColWidths[1] - 8 });
          doc.fontSize(7).font('Helvetica-Bold').fillColor(blue)
             .text(loja.total.toString(), leftMargin + lojaColWidths[0] + lojaColWidths[1] + 4, lY + 4, { width: lojaColWidths[2] - 8, align: 'right' });
          lY += tableRowH;
        });

        doc.y = lY + 16;
      }

      // ========== INFLUÊNCIA POR LOJA ==========
      if (data.influenciaPorLoja.length > 0) {
        const neededHeight = 30 + Math.min(data.influenciaPorLoja.length, 20) * 16;
        checkPageBreak(neededHeight);

        doc.fontSize(12).font('Helvetica-Bold').fillColor(darkText)
           .text('Influência dos Volantes nos Resultados por Loja', leftMargin, doc.y);
        doc.fontSize(7).font('Helvetica').fillColor(gray)
           .text('Percentagem dos serviços totais da loja realizados pelos volantes', leftMargin, doc.y + 14);
        doc.y += 26;

        const infColWidths = [25, pageWidth - 195, 55, 55, 60];
        const infTableY = doc.y;

        // Header
        doc.rect(leftMargin, infTableY, pageWidth, tableRowH).fillAndStroke('#FFE4E6', '#FFE4E6');
        let infX = leftMargin;
        ['#', 'Loja', 'Serv. Vol.', 'Total Loja', 'Influência'].forEach((label, i) => {
          doc.fontSize(7).font('Helvetica-Bold').fillColor(darkText)
             .text(label, infX + 3, infTableY + 4, { width: infColWidths[i] - 6, align: i >= 2 ? 'right' : 'left' });
          infX += infColWidths[i];
        });

        let infY = infTableY + tableRowH;
        // Show max 20 rows
        const influenciaToShow = data.influenciaPorLoja.slice(0, 20);
        influenciaToShow.forEach((l, idx) => {
          if (infY + tableRowH > pageHeight - 60) {
            doc.addPage();
            infY = 40;
          }

          const bgColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
          doc.rect(leftMargin, infY, pageWidth, tableRowH).fillAndStroke(bgColor, bgColor);

          infX = leftMargin;
          doc.fontSize(7).font('Helvetica').fillColor(gray)
             .text((idx + 1).toString(), infX + 3, infY + 4, { width: infColWidths[0] - 6 });
          infX += infColWidths[0];

          doc.fontSize(7).font('Helvetica').fillColor(darkText)
             .text(l.lojaNome, infX + 3, infY + 4, { width: infColWidths[1] - 6 });
          infX += infColWidths[1];

          doc.fontSize(7).font('Helvetica-Bold').fillColor(emerald)
             .text(l.servicosVolante.toString(), infX + 3, infY + 4, { width: infColWidths[2] - 6, align: 'right' });
          infX += infColWidths[2];

          doc.fontSize(7).font('Helvetica').fillColor(gray)
             .text(l.totalServicosLoja > 0 ? l.totalServicosLoja.toString() : 's/ dados', infX + 3, infY + 4, { width: infColWidths[3] - 6, align: 'right' });
          infX += infColWidths[3];

          // Influence with color coding
          const infColor = l.percentagemInfluencia >= 50 ? '#EF4444' : l.percentagemInfluencia >= 25 ? '#F59E0B' : '#10B981';
          const infText = l.totalServicosLoja > 0 ? `${l.percentagemInfluencia}%` : '-';

          // Draw mini bar
          if (l.totalServicosLoja > 0) {
            const barX = infX + 3;
            const barW = infColWidths[4] - 30;
            const barH = 5;
            const barY = infY + 2;
            doc.rect(barX, barY, barW, barH).fillAndStroke('#E5E7EB', '#E5E7EB');
            const fillW = Math.min(barW, (l.percentagemInfluencia / 100) * barW);
            if (fillW > 0) {
              doc.rect(barX, barY, fillW, barH).fillAndStroke(infColor, infColor);
            }
          }

          doc.fontSize(7).font('Helvetica-Bold').fillColor(infColor)
             .text(infText, infX + 3, infY + 8, { width: infColWidths[4] - 6, align: 'right' });

          infY += tableRowH;
        });

        // Legend
        infY += 6;
        if (infY + 14 > pageHeight - 60) {
          doc.addPage();
          infY = 40;
        }
        doc.fontSize(6).font('Helvetica').fillColor(gray)
           .text('Legenda: ', leftMargin, infY, { continued: true });
        doc.fillColor('#10B981').text('< 25%  ', { continued: true });
        doc.fillColor('#F59E0B').text('25-50%  ', { continued: true });
        doc.fillColor('#EF4444').text('> 50%  ', { continued: true });
        doc.fillColor(gray).text(`| Média: ${data.kpis.mediaInfluencia}%`);

        doc.y = infY + 16;
      }

      // ========== RODAPÉ EM TODAS AS PÁGINAS ==========
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        
        // Linha separadora
        doc.strokeColor('#E5E7EB').lineWidth(0.5);
        doc.moveTo(leftMargin, pageHeight - 35).lineTo(leftMargin + pageWidth, pageHeight - 35).stroke();
        
        doc.fontSize(7).font('Helvetica').fillColor(gray)
           .text('PoweringEG Platform 2.0 - a IA ao serviço da Expressglass', leftMargin, pageHeight - 30, { align: 'center', width: pageWidth });

        const now = new Date();
        const dataFormatada = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        doc.fontSize(6).text(`Gerado em ${dataFormatada} | Página ${i + 1} de ${pages.count}`, leftMargin, pageHeight - 22, { align: 'center', width: pageWidth });
      }

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF Dashboard Volantes Gestor:', error);
      reject(error);
    }
  });
}
