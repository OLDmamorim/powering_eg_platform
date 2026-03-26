/**
 * Serviço para gerar PDF do Relatório de Férias por Loja
 * Foco: dias PEDIDOS, distribuição % por período, cores de gravidade
 */

import type { AnaliseColaborador, SobreposicaoDia, RelatorioLoja } from './feriasRelatorioLojaService';

const COLORS = {
  green: { bg: '#dcfce7', text: '#15803d', border: '#86efac', dot: '#22c55e' },
  yellow: { bg: '#fef9c3', text: '#a16207', border: '#fde047', dot: '#eab308' },
  red: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', dot: '#ef4444' },
  slate: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', dot: '#64748b' },
  teal: { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4', dot: '#14b8a6' },
  amber: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
};

export async function gerarPDFRelatorioFeriasLoja(
  relatorio: RelatorioLoja,
  ano: number
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 50, left: 40, right: 40 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = 595.28;
      const contentW = pageW - 80;
      const leftM = 40;

      // ─── HEADER ───
      doc.rect(0, 0, pageW, 70).fill('#0f766e');
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
         .text(`Relatório de Férias — ${relatorio.loja}`, leftM, 18, { width: contentW });
      doc.fontSize(10).font('Helvetica').fillColor('#ccfbf1')
         .text(`Ano ${ano} · ${relatorio.totalColaboradores} colaboradores · Procedimento Interno N.º 8`, leftM, 42, { width: contentW });

      doc.y = 82;

      // ─── KPI BOXES ───
      const kpiW = (contentW - 20) / 5;
      const kpis = [
        { label: 'Conformes', value: relatorio.resumo.conformes, color: 'green' as const },
        { label: 'Com Avisos', value: relatorio.resumo.comAvisos, color: 'yellow' as const },
        { label: 'Críticos', value: relatorio.resumo.criticos, color: 'red' as const },
        { label: 'Excesso 2.º Per.', value: relatorio.resumo.comExcessoP2, color: 'red' as const },
        { label: 'Média dias/colab', value: relatorio.resumo.mediaDiasPedidos, color: 'slate' as const },
      ];

      const kpiY = doc.y;
      kpis.forEach((kpi, i) => {
        const x = leftM + i * (kpiW + 5);
        const c = COLORS[kpi.color];
        doc.roundedRect(x, kpiY, kpiW, 48, 4).fill(c.bg);
        doc.roundedRect(x, kpiY, kpiW, 48, 4).lineWidth(1).strokeColor(c.border).stroke();
        doc.fontSize(18).font('Helvetica-Bold').fillColor(c.text)
           .text(String(kpi.value), x, kpiY + 8, { width: kpiW, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor(c.text)
           .text(kpi.label, x, kpiY + 32, { width: kpiW, align: 'center' });
      });

      doc.y = kpiY + 58;

      // ─── ALERTAS ───
      const alertas: string[] = [];
      if (relatorio.resumo.semFeriasPedidas > 0) alertas.push(`${relatorio.resumo.semFeriasPedidas} sem férias pedidas`);
      if (relatorio.resumo.comExcessoP2 > 0) alertas.push(`${relatorio.resumo.comExcessoP2} com excesso no 2.º período`);
      if (relatorio.resumo.comDeficitP1 > 0) alertas.push(`${relatorio.resumo.comDeficitP1} com déficit no 1.º período`);
      if (relatorio.resumo.totalSobreposicoes > 0) alertas.push(`${relatorio.resumo.totalSobreposicoes} dias com sobreposição`);

      if (alertas.length > 0) {
        doc.roundedRect(leftM, doc.y, contentW, 22, 3).fill('#fef2f2');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#b91c1c')
           .text('ALERTAS: ' + alertas.join('  |  '), leftM + 8, doc.y - 16, { width: contentW - 16 });
        doc.y += 10;
      }

      // ─── TABELA DE DISTRIBUIÇÃO % POR PERÍODO ───
      doc.y += 4;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f766e')
         .text(`Distribuição de Dias Pedidos por Período — ${relatorio.loja}`, leftM, doc.y);
      doc.y += 4;
      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
         .text('Base: todos os dias pedidos (aprovados + não aprovados). Cores indicam violação do regulamento.', leftM, doc.y);
      doc.y += 10;

      // Header da tabela
      const colWidths = [140, 45, 60, 60, 60, 60, 90]; // Total ≈ 515
      const headers = ['Colaborador', 'Total', '1.º Período\nJan-Mai', '2.º Período\nJun-Set', '3.º Período\nOut-Nov', '4.º Período\nDez', 'Problemas'];
      const tableX = leftM;
      const headerH = 24;

      doc.rect(tableX, doc.y, contentW, headerH).fill('#0f766e');
      let cx = tableX;
      headers.forEach((h, i) => {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
           .text(h, cx + 3, doc.y + 4, { width: colWidths[i] - 6, align: i === 0 ? 'left' : 'center' });
        cx += colWidths[i];
      });
      doc.y += headerH;

      // Regras de referência
      doc.rect(tableX, doc.y, contentW, 14).fill('#f0fdfa');
      cx = tableX;
      const regras = ['Regulamento:', '', 'Min. 5 dias', 'Máx. 10 dias', 'Livre', 'Min. possível', ''];
      regras.forEach((r, i) => {
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#0f766e')
           .text(r, cx + 3, doc.y + 3, { width: colWidths[i] - 6, align: i === 0 ? 'left' : 'center' });
        cx += colWidths[i];
      });
      doc.y += 14;

      // Linhas da tabela
      relatorio.analiseColaboradores.forEach((c, idx) => {
        const probCount = Math.max(1, c.problemas.length);
        const rowH = Math.max(22, probCount * 10 + 8);

        // Nova página se necessário
        if (doc.y + rowH > 750) {
          doc.addPage();
          doc.y = 40;
          // Repetir header
          doc.rect(tableX, doc.y, contentW, headerH).fill('#0f766e');
          let cx2 = tableX;
          headers.forEach((h, i) => {
            doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
               .text(h, cx2 + 3, doc.y + 4, { width: colWidths[i] - 6, align: i === 0 ? 'left' : 'center' });
            cx2 += colWidths[i];
          });
          doc.y += headerH;
        }

        // Fundo alternado
        if (idx % 2 === 1) {
          doc.rect(tableX, doc.y, contentW, rowH).fill('#f8fafc');
        }

        // Linha separadora
        doc.strokeColor('#e2e8f0').lineWidth(0.5)
           .moveTo(tableX, doc.y).lineTo(tableX + contentW, doc.y).stroke();

        const rowY = doc.y;
        let colX = tableX;

        // Col 0: Nome com dot de gravidade
        const dotColor = c.gravidade === 'conforme' ? COLORS.green.dot :
                         c.gravidade === 'aviso' ? COLORS.yellow.dot : COLORS.red.dot;
        doc.circle(colX + 8, rowY + rowH / 2, 3.5).fill(dotColor);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e293b')
           .text(c.nome, colX + 16, rowY + (rowH - 9) / 2, { width: colWidths[0] - 20 });
        colX += colWidths[0];

        // Col 1: Total dias pedidos
        drawBadge(doc, colX, rowY, colWidths[1], rowH, `${c.totalPedidos}`, c.totalPedidos < 22 ? 'yellow' : 'green');
        colX += colWidths[1];

        // Col 2: 1.º Período (Jan-Mai) — dias + %
        drawPeriodCell(doc, colX, rowY, colWidths[2], rowH, c.diasP1, c.pctP1, c.corP1);
        colX += colWidths[2];

        // Col 3: 2.º Período (Jun-Set) — dias + %
        drawPeriodCell(doc, colX, rowY, colWidths[3], rowH, c.diasP2, c.pctP2, c.corP2);
        colX += colWidths[3];

        // Col 4: 3.º Período (Out-Nov) — dias + %
        drawPeriodCell(doc, colX, rowY, colWidths[4], rowH, c.diasP3, c.pctP3, c.corP3);
        colX += colWidths[4];

        // Col 5: 4.º Período (Dez) — dias + %
        drawPeriodCell(doc, colX, rowY, colWidths[5], rowH, c.diasP4, c.pctP4, c.corP4);
        colX += colWidths[5];

        // Col 6: Problemas resumidos
        if (c.problemas.length === 0) {
          doc.fontSize(6.5).font('Helvetica').fillColor('#15803d')
             .text('Conforme', colX + 3, rowY + (rowH - 8) / 2, { width: colWidths[6] - 6 });
        } else {
          let py = rowY + 4;
          c.problemas.slice(0, 3).forEach(p => {
            // Resumir o problema
            const resumo = p.length > 50 ? p.substring(0, 47) + '...' : p;
            doc.fontSize(5.5).font('Helvetica').fillColor('#b91c1c')
               .text(`• ${resumo}`, colX + 3, py, { width: colWidths[6] - 6 });
            py += 9;
          });
        }

        doc.y = rowY + rowH;
      });

      // ─── LEGENDA ───
      doc.y += 8;
      if (doc.y + 30 > 750) doc.addPage();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#334155')
         .text('Legenda:', leftM, doc.y);
      doc.y += 2;
      const legendItems = [
        { color: COLORS.red.bg, textColor: COLORS.red.text, label: 'Excede regulamento' },
        { color: COLORS.yellow.bg, textColor: COLORS.yellow.text, label: 'Concentração elevada' },
        { color: COLORS.green.bg, textColor: COLORS.green.text, label: 'Conforme' },
      ];
      let legX = leftM;
      legendItems.forEach(item => {
        doc.roundedRect(legX, doc.y, 8, 8, 1).fill(item.color);
        doc.fontSize(6.5).font('Helvetica').fillColor(item.textColor)
           .text(item.label, legX + 11, doc.y + 1);
        legX += 80;
      });
      doc.y += 14;

      // ─── SOBREPOSIÇÕES ───
      if (relatorio.sobreposicoes.length > 0) {
        if (doc.y + 60 > 750) doc.addPage();
        doc.y += 8;

        doc.roundedRect(leftM, doc.y, contentW, 22, 4).fill('#92400e');
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
           .text(`Sobreposições na Loja (${relatorio.sobreposicoes.length} dias com >1 colaborador)`, leftM + 10, doc.y + 5, { width: contentW - 20 });
        doc.y += 28;

        doc.fontSize(7).font('Helvetica').fillColor('#78350f')
           .text('Regra: Máximo 1 colaborador de férias por loja em cada momento.', leftM, doc.y);
        doc.y += 10;

        // Header
        doc.rect(leftM, doc.y, contentW, 16).fill('#fffbeb');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#92400e')
           .text('Data', leftM + 5, doc.y + 4, { width: 60 })
           .text('Colaboradores em Férias', leftM + 65, doc.y + 4, { width: contentW - 70 });
        doc.y += 16;

        relatorio.sobreposicoes.forEach((s, i) => {
          if (doc.y + 14 > 750) doc.addPage();
          if (i % 2 === 1) doc.rect(leftM, doc.y, contentW, 14).fill('#fffbeb');
          doc.strokeColor('#fde68a').lineWidth(0.3)
             .moveTo(leftM, doc.y).lineTo(leftM + contentW, doc.y).stroke();
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#78350f')
             .text(s.data, leftM + 5, doc.y + 3, { width: 60 });
          doc.fontSize(7).font('Helvetica').fillColor('#92400e')
             .text(s.colaboradores.join(' + '), leftM + 65, doc.y + 3, { width: contentW - 70 });
          doc.y += 14;
        });
      }

      // ─── RECOMENDAÇÕES IA ───
      if (relatorio.recomendacoesIA) {
        if (doc.y + 80 > 750) doc.addPage();
        doc.y += 12;

        doc.roundedRect(leftM, doc.y, contentW, 24, 4).fill('#0f766e');
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
           .text('Recomendações IA — Plano de Redistribuição', leftM + 10, doc.y + 6, { width: contentW - 20 });
        doc.y += 32;

        const linhas = relatorio.recomendacoesIA.split('\n');
        for (const linha of linhas) {
          if (doc.y > 750) doc.addPage();

          if (linha.startsWith('## ')) {
            doc.y += 4;
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f766e')
               .text(limparTexto(linha.replace(/^## /, '')), leftM, doc.y, { width: contentW });
            doc.y += 4;
          } else if (linha.startsWith('### ')) {
            doc.y += 2;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#134e4a')
               .text(limparTexto(linha.replace(/^### /, '')), leftM, doc.y, { width: contentW });
            doc.y += 2;
          } else if (linha.trim().startsWith('- ') || linha.trim().startsWith('* ')) {
            const texto = linha.replace(/^\s*[-*]\s*/, '');
            doc.fontSize(8).font('Helvetica').fillColor('#1e293b')
               .text(`• ${limparTexto(texto)}`, leftM + 10, doc.y, { width: contentW - 20 });
          } else if (/^\d+\./.test(linha.trim())) {
            doc.fontSize(8).font('Helvetica').fillColor('#1e293b')
               .text(limparTexto(linha.trim()), leftM + 10, doc.y, { width: contentW - 20 });
          } else if (linha.trim() === '') {
            doc.y += 3;
          } else if (linha.trim()) {
            doc.fontSize(8).font('Helvetica').fillColor('#1e293b')
               .text(limparTexto(linha), leftM, doc.y, { width: contentW });
          }
        }
      }

      // ─── RODAPÉ EM TODAS AS PÁGINAS ───
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor('#cbd5e1').lineWidth(0.5)
           .moveTo(leftM, 790).lineTo(pageW - 40, 790).stroke();
        doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
           .text(
             `PoweringEG Platform 2.0 - a IA ao serviço da Expressglass`,
             leftM, 795,
             { width: contentW / 2, align: 'left' }
           );
        doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
           .text(
             `Página ${i + 1} de ${range.count} · Gerado em ${new Date().toLocaleString('pt-PT')}`,
             leftM + contentW / 2, 795,
             { width: contentW / 2, align: 'right' }
           );
        doc.fillColor('#000000');
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Desenha uma célula de período com dias e % com fundo colorido
 */
function drawPeriodCell(
  doc: any,
  colX: number,
  rowY: number,
  colW: number,
  rowH: number,
  dias: number,
  pct: number,
  cor: 'green' | 'yellow' | 'red'
) {
  const c = COLORS[cor];
  // Fundo colorido na célula inteira
  doc.rect(colX + 1, rowY + 1, colW - 2, rowH - 2).fill(c.bg);
  // Percentagem grande
  doc.fontSize(10).font('Helvetica-Bold').fillColor(c.text)
     .text(`${pct}%`, colX, rowY + 3, { width: colW, align: 'center' });
  // Dias pequeno
  doc.fontSize(6).font('Helvetica').fillColor(c.text)
     .text(`${dias} dias`, colX, rowY + rowH - 11, { width: colW, align: 'center' });
}

function drawBadge(
  doc: any,
  colX: number,
  rowY: number,
  colW: number,
  rowH: number,
  text: string,
  color: 'green' | 'yellow' | 'red' | 'slate'
) {
  const c = COLORS[color as keyof typeof COLORS] || COLORS.slate;
  const badgeW = 30;
  const badgeH = 13;
  const bx = colX + (colW - badgeW) / 2;
  const by = rowY + (rowH - badgeH) / 2;
  doc.roundedRect(bx, by, badgeW, badgeH, 2).fill(c.bg);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(c.text)
     .text(text, bx, by + 3, { width: badgeW, align: 'center' });
}

function limparTexto(texto: string): string {
  return texto
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[📊🎯📈💡⚠️🔍📋✅❌🏆📉🔔🚨🏷️💰🔄]/g, '')
    .trim();
}
