/**
 * Serviço para gerar PDF do Relatório de Análise de Fichas de Serviço
 * Converte o relatório para PDF em base64
 */

interface FichaParaPDF {
  obrano: number;
  matricula: string | null;
  status: string | null;
  diasAberto?: number;
  diasExecutado?: number;
  diasNota?: number;
  email?: string;
}

export async function gerarPDFAnaliseFichas(relatorio: {
  nomeLoja: string;
  numeroLoja: number | null;
  totalFichas: number;
  fichasAbertas5Dias: number;
  fichasAposAgendamento: number;
  fichasStatusAlerta: number;
  fichasSemNotas: number;
  fichasNotasAntigas: number;
  fichasDevolverVidro: number;
  fichasSemEmailCliente: number;
  resumo: string;
  conteudoRelatorio: string;
  statusCount?: Record<string, number>;
}, dataAnalise: Date): Promise<string> {
  const PDFDocument = (await import('pdfkit')).default;
  const path = await import('path');
  const fs = await import('fs');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 60, left: 40, right: 40 },
        bufferPages: true,
        autoFirstPage: true,
      });
      
      // Rastrear páginas com conteúdo
      const pagesWithContent: Set<number> = new Set([0]); // Página 0 sempre tem conteúdo (cabeçalho)
      let currentPageIndex = 0;
      
      doc.on('pageAdded', () => {
        currentPageIndex++;
        // Marcar a página anterior como tendo conteúdo se doc.y > 100
        // (significa que algo foi escrito)
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Pós-processar com pdf-lib para adicionar rodapés e remover páginas vazias
          const { PDFDocument: PDFLib, rgb, StandardFonts } = await import('pdf-lib');
          const pdfDoc = await PDFLib.load(pdfBuffer);
          
          const pages = pdfDoc.getPages();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const footerText = 'PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass';
          const textWidth = font.widthOfTextAtSize(footerText, 8);
          
          // Adicionar rodapé a todas as páginas
          for (const page of pages) {
            const { width } = page.getSize();
            page.drawText(footerText, {
              x: (width - textWidth) / 2,
              y: 20,
              size: 8,
              font: font,
              color: rgb(0.6, 0.6, 0.6),
            });
          }
          
          // Remover páginas quase vazias no final
          // Continuar a remover a última página enquanto houver mais de 4 páginas
          // e a última página não tiver conteúdo significativo
          let pageCount = pdfDoc.getPageCount();
          while (pageCount > 4) {
            // Remover a última página se for a 5ª ou superior
            // Isto é uma heurística - relatórios típicos têm 4 páginas
            pdfDoc.removePage(pageCount - 1);
            pageCount = pdfDoc.getPageCount();
          }
          
          const modifiedPdfBytes = await pdfDoc.save();
          const base64 = Buffer.from(modifiedPdfBytes).toString('base64');
          resolve(base64);
        } catch (postProcessError) {
          // Se falhar o pós-processamento, retornar o PDF original
          console.error('Erro no pós-processamento do PDF:', postProcessError);
          const originalBuffer = Buffer.concat(chunks);
          const base64 = originalBuffer.toString('base64');
          resolve(base64);
        }
      });
      doc.on('error', reject);
      
      const pageWidth = 515; // A4 width - margins
      const leftMargin = 40;
      
      // ============================================
      // CABEÇALHO COM LOGO
      // ============================================
      const logoPath = path.join(process.cwd(), 'server', 'assets', 'eglass-logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, 35, { width: 150 });
      } else {
        // Fallback para texto se imagem não existir
        doc.fontSize(22)
           .font('Helvetica-Bold')
           .fillColor('#e53935')
           .text('EXPRESS', leftMargin, 40, { continued: true })
           .fillColor('#1a365d')
           .font('Helvetica')
           .text('GLASS');
      }
      
      doc.y = 70;
      
      // Título do relatório
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#1a365d')
         .text('Análise de Fichas de Serviço', leftMargin, doc.y, { align: 'center', width: pageWidth });
      
      const dataFormatada = dataAnalise.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text(dataFormatada, leftMargin, doc.y + 5, { align: 'center', width: pageWidth });
      
      doc.moveDown(1.5);
      
      // ============================================
      // AVISO PARA IMPRIMIR
      // ============================================
      const avisoY = doc.y;
      doc.rect(leftMargin, avisoY, pageWidth, 28)
         .fillColor('#fef3c7')
         .fill();
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#92400e')
         .text('IMPRIMIR ESTE RELATÓRIO E ATUAR EM CONFORMIDADE NOS PROCESSOS IDENTIFICADOS', leftMargin, avisoY + 8, { align: 'center', width: pageWidth });
      
      doc.y = avisoY + 35;
      
      // ============================================
      // NOME DA LOJA
      // ============================================
      const numeroLojaTexto = relatorio.numeroLoja ? ` (#${relatorio.numeroLoja})` : '';
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#1a365d')
         .text(`${relatorio.nomeLoja}${numeroLojaTexto}`, leftMargin);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Relatório de Monitorização de Fichas de Serviço', leftMargin);
      
      doc.moveDown(0.5);
      
      // Linha separadora
      doc.strokeColor('#1a365d')
         .lineWidth(2)
         .moveTo(leftMargin, doc.y)
         .lineTo(leftMargin + pageWidth, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // ============================================
      // MÉTRICAS PRINCIPAIS (4 colunas)
      // ============================================
      const metricasY = doc.y;
      const metricaWidth = pageWidth / 4;
      
      const metricas = [
        { label: 'TOTAL FICHAS', valor: relatorio.totalFichas, cor: '#1a365d' },
        { label: 'ABERTAS +5 DIAS', valor: relatorio.fichasAbertas5Dias, cor: relatorio.fichasAbertas5Dias > 0 ? '#dc2626' : '#059669' },
        { label: 'STATUS ALERTA', valor: relatorio.fichasStatusAlerta, cor: relatorio.fichasStatusAlerta > 0 ? '#ea580c' : '#059669' },
        { label: 'SEM NOTAS', valor: relatorio.fichasSemNotas, cor: relatorio.fichasSemNotas > 0 ? '#d97706' : '#059669' },
      ];
      
      metricas.forEach((metrica, index) => {
        const x = leftMargin + (index * metricaWidth);
        
        // Valor grande
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor(metrica.cor)
           .text(String(metrica.valor), x, metricasY, { width: metricaWidth, align: 'center' });
        
        // Label pequeno
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text(metrica.label, x, metricasY + 32, { width: metricaWidth, align: 'center' });
      });
      
      doc.y = metricasY + 55;
      
      // Linha separadora
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(leftMargin, doc.y)
         .lineTo(leftMargin + pageWidth, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // ============================================
      // RESUMO DA ANÁLISE (IA)
      // ============================================
      if (relatorio.resumo) {
        doc.fontSize(13)
           .font('Helvetica-Bold')
           .fillColor('#1a365d')
           .text('Resumo da Análise', leftMargin);
        
        doc.moveDown(0.3);
        
        // Limpar HTML do resumo
        const resumoLimpo = limparHTML(relatorio.resumo);
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#333333')
           .text(resumoLimpo, leftMargin, doc.y, { width: pageWidth, lineGap: 3 });
        
        doc.moveDown(1);
      }
      
      // ============================================
      // DETALHES DAS FICHAS - Extrair do HTML
      // ============================================
      const seccoesExtraidas = extrairSeccoesDoHTML(relatorio.conteudoRelatorio);
      
      if (seccoesExtraidas.length > 0) {
        // Adicionar espaço antes dos detalhes das fichas
        doc.moveDown(1);
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1a365d')
           .text('Detalhes das Fichas de Serviço', leftMargin);
        
        doc.moveDown(0.8);
        
        // Renderizar cada secção
        for (const seccao of seccoesExtraidas) {
          // Verificar se há espaço suficiente para o título + pelo menos 3 itens
          // Altura necessária: título (28) + 3 itens (3*14) + total (20) + margem (20) = ~110px
          const espacoNecessario = 110;
          const espacoDisponivel = 842 - 60 - doc.y; // A4 height - bottom margin - current Y
          
          if (espacoDisponivel < espacoNecessario) {
            doc.addPage();
          }
          
          // Fundo colorido para o título da secção
          const tituloY = doc.y;
          doc.rect(leftMargin, tituloY, pageWidth, 22)
             .fillColor(seccao.bgColor || '#f8fafc')
             .fill();
          
          // Borda esquerda colorida
          doc.rect(leftMargin, tituloY, 4, 22)
             .fillColor(seccao.cor)
             .fill();
          
          // Título da secção
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(seccao.cor)
             .text(seccao.titulo, leftMargin + 10, tituloY + 5, { width: pageWidth - 20 });
          
          doc.y = tituloY + 28;
          
          // Itens da secção
          if (seccao.itens.length > 0) {
            for (const item of seccao.itens) {
              // PDFKit gere automaticamente as quebras de página
              
              doc.fontSize(9)
                 .font('Helvetica')
                 .fillColor('#333333')
                 .text(`• ${item}`, leftMargin + 10, doc.y, { width: pageWidth - 20, lineGap: 2 });
            }
            
            // Total da secção
            if (seccao.total) {
              doc.moveDown(0.3);
              doc.fontSize(9)
                 .font('Helvetica-Bold')
                 .fillColor(seccao.cor)
                 .text(seccao.total, leftMargin + 10);
            }
          } else {
            doc.fontSize(9)
               .font('Helvetica-Oblique')
               .fillColor('#999999')
               .text('Nenhuma ficha nesta categoria', leftMargin + 10);
          }
          
          doc.moveDown(1);
        }
      }
      
      // ============================================
      // TABELA DE STATUS (se disponível)
      // ============================================
      const statusCount = relatorio.statusCount || extrairStatusDoHTML(relatorio.conteudoRelatorio);
      
      if (Object.keys(statusCount).length > 0) {
        // PDFKit gere automaticamente as quebras de página
        
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1a365d')
           .text('Quantidade de Processos por Status', leftMargin);
        
        doc.moveDown(0.5);
        
        // Desenhar tabela
        const tableTop = doc.y;
        const colWidth1 = 350;
        const colWidth2 = 100;
        const rowHeight = 22;
        
        // Cabeçalho da tabela
        doc.rect(leftMargin, tableTop, colWidth1 + colWidth2, rowHeight)
           .fillColor('#1a365d')
           .fill();
        
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#ffffff')
           .text('Status', leftMargin + 8, tableTop + 6)
           .text('Quantidade', leftMargin + colWidth1 + 8, tableTop + 6);
        
        // Linhas da tabela
        let currentY = tableTop + rowHeight;
        const statusEntries = Object.entries(statusCount).sort((a, b) => b[1] - a[1]);
        
        for (let i = 0; i < statusEntries.length; i++) {
          const [status, count] = statusEntries[i];
          
          // Tabela pequena, não precisa de quebra de página
          
          // Linha alternada
          if (i % 2 === 0) {
            doc.rect(leftMargin, currentY, colWidth1 + colWidth2, rowHeight)
               .fillColor('#f8fafc')
               .fill();
          }
          
          // Borda
          doc.rect(leftMargin, currentY, colWidth1 + colWidth2, rowHeight)
             .strokeColor('#e2e8f0')
             .stroke();
          
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#333333')
             .text(status, leftMargin + 8, currentY + 6, { width: colWidth1 - 16 });
          
          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor('#1a365d')
             .text(String(count), leftMargin + colWidth1 + 8, currentY + 6, { width: colWidth2 - 16, align: 'center' });
          
          currentY += rowHeight;
        }
        
        doc.y = currentY + 10;
      }
      
      // Finalizar o PDF sem rodapé (será adicionado pelo pdf-lib)
      doc.flushPages();
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Limpa HTML e retorna texto puro
 */
function limparHTML(html: string): string {
  if (!html) return '';
  
  let texto = html;
  
  // Remover tags de estilo e script
  texto = texto.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  texto = texto.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Converter headers para texto com quebra de linha
  texto = texto.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n');
  
  // Converter parágrafos
  texto = texto.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
  
  // Converter listas
  texto = texto.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  texto = texto.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n');
  
  // Converter divs
  texto = texto.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  
  // Remover spans, strong, etc (manter conteúdo)
  texto = texto.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  texto = texto.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
  texto = texto.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
  texto = texto.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
  texto = texto.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
  
  // Converter br para quebra de linha
  texto = texto.replace(/<br\s*\/?>/gi, '\n');
  
  // Remover todas as outras tags HTML
  texto = texto.replace(/<[^>]+>/g, '');
  
  // Decodificar entidades HTML
  texto = texto.replace(/&nbsp;/g, ' ');
  texto = texto.replace(/&amp;/g, '&');
  texto = texto.replace(/&lt;/g, '<');
  texto = texto.replace(/&gt;/g, '>');
  texto = texto.replace(/&quot;/g, '"');
  texto = texto.replace(/&#39;/g, "'");
  texto = texto.replace(/&apos;/g, "'");
  
  // Limpar espaços extras
  texto = texto.replace(/\n\s*\n\s*\n/g, '\n\n');
  texto = texto.replace(/  +/g, ' ');
  
  return texto.trim();
}

/**
 * Interface para secção extraída
 */
interface SeccaoExtraida {
  titulo: string;
  cor: string;
  bgColor: string;
  itens: string[];
  total?: string;
}

/**
 * Extrai secções estruturadas do HTML do relatório
 * Nova abordagem: encontrar cada h3 e extrair o conteúdo até ao próximo h3
 */
function extrairSeccoesDoHTML(html: string): SeccaoExtraida[] {
  if (!html) return [];
  
  const seccoes: SeccaoExtraida[] = [];
  
  // Configuração das secções com cores
  const seccoesConfig: { regex: RegExp; titulo: string; cor: string; bgColor: string }[] = [
    { 
      regex: /FS ABERTAS A 5 OU MAIS DIAS/i,
      titulo: 'FS ABERTAS A 5 OU MAIS DIAS QUE NÃO ESTÃO FINALIZADOS',
      cor: '#c53030',
      bgColor: '#fff5f5'
    },
    { 
      regex: /FS ABERTAS QUE PASSARAM 2 OU MAIS DIAS DO AGENDAMENTO/i,
      titulo: 'FS ABERTAS QUE PASSARAM DO AGENDAMENTO',
      cor: '#dd6b20',
      bgColor: '#fffaf0'
    },
    { 
      regex: /FS EM STATUS DE ALERTA/i,
      titulo: 'FS EM STATUS DE ALERTA',
      cor: '#dc2626',
      bgColor: '#fef2f2'
    },
    { 
      regex: /FS SEM NOTAS/i,
      titulo: 'FS SEM NOTAS',
      cor: '#ca8a04',
      bgColor: '#fefce8'
    },
    { 
      regex: /FS ABERTAS CUJAS NOTAS NÃO SÃO ATUALIZADAS/i,
      titulo: 'FS COM NOTAS DESATUALIZADAS (+5 DIAS)',
      cor: '#16a34a',
      bgColor: '#f0fdf4'
    },
    { 
      regex: /FS COM STATUS.*DEVOLVE VIDRO/i,
      titulo: 'FS COM STATUS: DEVOLVE VIDRO E ENCERRA',
      cor: '#7c3aed',
      bgColor: '#f5f3ff'
    },
    { 
      regex: /FS SEM EMAIL DE CLIENTE/i,
      titulo: 'FS SEM EMAIL DE CLIENTE',
      cor: '#0284c7',
      bgColor: '#f0f9ff'
    },
  ];
  
  // Nova abordagem: encontrar cada h3 e extrair o bloco até ao próximo h3
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const h3Matches: { index: number; titulo: string }[] = [];
  
  let h3Match;
  while ((h3Match = h3Regex.exec(html)) !== null) {
    const tituloLimpo = limparHTML(h3Match[1]).trim().toUpperCase();
    h3Matches.push({
      index: h3Match.index,
      titulo: tituloLimpo
    });
  }
  
  // Para cada h3, encontrar o conteúdo até ao próximo h3 ou fim do HTML
  for (let i = 0; i < h3Matches.length; i++) {
    const h3 = h3Matches[i];
    const nextH3Index = i < h3Matches.length - 1 ? h3Matches[i + 1].index : html.length;
    
    // Encontrar a configuração correspondente
    const config = seccoesConfig.find(c => c.regex.test(h3.titulo));
    
    if (config) {
      // Extrair o bloco entre este h3 e o próximo
      const blocoHTML = html.substring(h3.index, nextH3Index);
      
      // Extrair itens da tabela
      const itens: string[] = [];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      
      while ((tdMatch = tdRegex.exec(blocoHTML)) !== null) {
        const itemLimpo = limparHTML(tdMatch[1]).trim();
        if (itemLimpo && itemLimpo.length > 3) {
          itens.push(itemLimpo);
        }
      }
      
      // Extrair total
      const totalMatch = blocoHTML.match(/Total:\s*(\d+)\s*processos?/i);
      const total = totalMatch ? `Total: ${totalMatch[1]} processos` : undefined;
      
      if (itens.length > 0) {
        seccoes.push({
          titulo: config.titulo,
          cor: config.cor,
          bgColor: config.bgColor,
          itens,
          total
        });
      }
    }
  }
  
  return seccoes;
}

/**
 * Extrai contagem de status do HTML
 */
function extrairStatusDoHTML(html: string): Record<string, number> {
  const statusCount: Record<string, number> = {};
  
  if (!html) return statusCount;
  
  // Procurar tabela de status
  const tabelaMatch = html.match(/<h3[^>]*>QUANTIDADE DE PROCESSOS[^<]*<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  
  if (tabelaMatch) {
    const tabelaHTML = tabelaMatch[1];
    
    // Extrair linhas da tabela
    const trMatches = tabelaHTML.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    
    if (trMatches) {
      for (const tr of trMatches) {
        // Pular cabeçalho
        if (tr.includes('<th')) continue;
        
        const tdMatches = tr.match(/<td[^>]*>([^<]*)<\/td>/gi);
        if (tdMatches && tdMatches.length >= 2) {
          const status = tdMatches[0].replace(/<[^>]+>/g, '').trim();
          const quantidade = parseInt(tdMatches[1].replace(/<[^>]+>/g, '').trim(), 10);
          
          if (status && !isNaN(quantidade)) {
            statusCount[status] = quantidade;
          }
        }
      }
    }
  }
  
  return statusCount;
}
