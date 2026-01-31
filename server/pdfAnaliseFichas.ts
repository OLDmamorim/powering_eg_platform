/**
 * Serviço para gerar PDF do Relatório de Análise de Fichas de Serviço
 * Converte o relatório para PDF em base64
 */

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
}, dataAnalise: Date): Promise<string> {
  const PDFDocument = (await import('pdfkit')).default;
  const path = await import('path');
  const fs = await import('fs');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const base64 = pdfBuffer.toString('base64');
        resolve(base64);
      });
      doc.on('error', reject);
      
      const pageWidth = 515; // A4 width - margins
      
      // Cabeçalho com logo imagem
      const logoPath = path.join(process.cwd(), 'server', 'assets', 'eglass-logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 35, { width: 150 });
      } else {
        // Fallback para texto se imagem não existir
        doc.fontSize(22)
           .font('Helvetica-Bold')
           .fillColor('#e53935')
           .text('EXPRESS', 40, 40, { continued: true })
           .fillColor('#1a365d')
           .font('Helvetica')
           .text('GLASS');
      }
      
      doc.y = 70;
      
      // Título do relatório
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Análise de Fichas de Serviço', { align: 'center' });
      
      const dataFormatada = dataAnalise.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#666666')
         .text(dataFormatada, { align: 'center' });
      
      doc.moveDown(1);
      
      // Linha separadora
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      
      // Aviso para imprimir
      const avisoY = doc.y;
      doc.rect(40, avisoY, pageWidth, 30)
         .fillColor('#fef3c7')
         .fill();
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#92400e')
         .text('IMPRIMIR ESTE RELATORIO E ATUAR EM CONFORMIDADE NOS PROCESSOS IDENTIFICADOS', 50, avisoY + 10, { align: 'center' });
      
      doc.moveDown(1.5);
      
      // Nome da loja
      const numeroLojaTexto = relatorio.numeroLoja ? ` (#${relatorio.numeroLoja})` : '';
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text(`${relatorio.nomeLoja}${numeroLojaTexto}`);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Relatório de Monitorização de Fichas de Serviço');
      
      doc.moveDown(0.5);
      
      // Linha separadora
      doc.strokeColor('#333333')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // Métricas em tabela horizontal
      const metricasY = doc.y;
      const metricaWidth = pageWidth / 4;
      
      const metricas = [
        { label: 'Total Fichas', valor: relatorio.totalFichas, cor: '#333333' },
        { label: 'Abertas +5 dias', valor: relatorio.fichasAbertas5Dias, cor: relatorio.fichasAbertas5Dias > 0 ? '#dc2626' : '#059669' },
        { label: 'Status Alerta', valor: relatorio.fichasStatusAlerta, cor: relatorio.fichasStatusAlerta > 0 ? '#ea580c' : '#059669' },
        { label: 'Sem Notas', valor: relatorio.fichasSemNotas, cor: relatorio.fichasSemNotas > 0 ? '#d97706' : '#059669' },
      ];
      
      metricas.forEach((metrica, index) => {
        const x = 40 + (index * metricaWidth);
        
        // Valor grande
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor(metrica.cor)
           .text(String(metrica.valor), x, metricasY, { width: metricaWidth, align: 'center' });
        
        // Label pequeno
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666666')
           .text(metrica.label.toUpperCase(), x, metricasY + 28, { width: metricaWidth, align: 'center' });
      });
      
      doc.y = metricasY + 55;
      doc.moveDown(1);
      
      // Linha separadora
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // Resumo da Análise - LIMPAR HTML PRIMEIRO
      if (relatorio.resumo) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text('Resumo da Análise');
        
        doc.moveDown(0.5);
        
        // Limpar HTML do resumo
        const resumoLimpo = limparHTMLCompleto(relatorio.resumo);
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#333333')
           .text(resumoLimpo, { width: pageWidth, lineGap: 3 });
        
        doc.moveDown(1);
      }
      
      // Conteúdo do relatório (processar HTML para texto estruturado)
      const seccoesConteudo = processarConteudoParaSeccoes(relatorio.conteudoRelatorio);
      
      if (seccoesConteudo.length > 0) {
        // Verificar se precisa de nova página
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text('Detalhes das Fichas');
        
        doc.moveDown(0.5);
        
        // Processar cada secção
        for (const seccao of seccoesConteudo) {
          // Verificar se precisa de nova página
          if (doc.y > 720) {
            doc.addPage();
          }
          
          // Título da secção
          if (seccao.titulo) {
            doc.moveDown(0.5);
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#1a365d')
               .text(seccao.titulo);
            doc.moveDown(0.3);
          }
          
          // Itens da secção
          for (const item of seccao.itens) {
            // Verificar se precisa de nova página
            if (doc.y > 750) {
              doc.addPage();
            }
            
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#333333')
               .text(`• ${item}`, { indent: 10, width: pageWidth - 10, lineGap: 2 });
          }
          
          // Total da secção
          if (seccao.total) {
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor('#666666')
               .text(seccao.total, { indent: 10 });
          }
        }
      }
      
      // Rodapé em todas as páginas
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#999999')
           .text(
             'PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass',
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

/**
 * Limpa completamente o HTML e retorna texto puro formatado
 */
function limparHTMLCompleto(html: string): string {
  if (!html) return '';
  
  let texto = html;
  
  // Remover tags de estilo e script
  texto = texto.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  texto = texto.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Converter headers para texto com quebra de linha
  texto = texto.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n');
  
  // Converter parágrafos
  texto = texto.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Converter listas
  texto = texto.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  texto = texto.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n');
  
  // Converter divs
  texto = texto.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  
  // Converter spans (remover apenas a tag, manter conteúdo)
  texto = texto.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  
  // Converter strong/bold (remover tag, manter conteúdo)
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
  texto = texto.replace(/&#x27;/g, "'");
  texto = texto.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  
  // Limpar espaços extras e quebras de linha múltiplas
  texto = texto.replace(/\n\s*\n\s*\n/g, '\n\n');
  texto = texto.replace(/  +/g, ' ');
  texto = texto.replace(/^\s+/gm, ''); // Remover espaços no início de cada linha
  
  return texto.trim();
}

/**
 * Processa o conteúdo HTML em secções estruturadas para o PDF
 */
interface SeccaoPDF {
  titulo: string;
  itens: string[];
  total?: string;
}

function processarConteudoParaSeccoes(html: string): SeccaoPDF[] {
  if (!html) return [];
  
  const seccoes: SeccaoPDF[] = [];
  
  // Primeiro limpar o HTML
  const textoLimpo = limparHTMLCompleto(html);
  
  // Dividir por linhas
  const linhas = textoLimpo.split('\n').filter(l => l.trim());
  
  let seccaoAtual: SeccaoPDF | null = null;
  
  // Padrões para identificar títulos de secção
  const padroesTitulo = [
    /^FS ABERTAS/i,
    /^FS EM STATUS/i,
    /^FS SEM NOTAS/i,
    /^FS SEM EMAIL/i,
    /^FORAM PEDIDOS/i,
    /^QUANTIDADE DE PROCESSOS/i,
    /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]{10,}:?$/,
  ];
  
  for (const linha of linhas) {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) continue;
    
    // Verificar se é um título de secção
    const ehTitulo = padroesTitulo.some(p => p.test(linhaLimpa)) || 
                     (linhaLimpa === linhaLimpa.toUpperCase() && linhaLimpa.length > 15);
    
    // Verificar se é uma linha de total
    const ehTotal = /^Total:?\s*\d+/i.test(linhaLimpa);
    
    if (ehTitulo) {
      // Guardar secção anterior se existir
      if (seccaoAtual && seccaoAtual.itens.length > 0) {
        seccoes.push(seccaoAtual);
      }
      
      // Criar nova secção
      seccaoAtual = {
        titulo: linhaLimpa,
        itens: [],
      };
    } else if (ehTotal && seccaoAtual) {
      seccaoAtual.total = linhaLimpa;
    } else if (seccaoAtual) {
      // Adicionar como item da secção atual
      // Limpar prefixos de lista
      let itemLimpo = linhaLimpa.replace(/^[-•]\s*/, '').trim();
      if (itemLimpo) {
        seccaoAtual.itens.push(itemLimpo);
      }
    } else {
      // Criar secção genérica se não houver secção atual
      if (!seccaoAtual) {
        seccaoAtual = {
          titulo: '',
          itens: [],
        };
      }
      seccaoAtual.itens.push(linhaLimpa);
    }
  }
  
  // Adicionar última secção
  if (seccaoAtual && seccaoAtual.itens.length > 0) {
    seccoes.push(seccaoAtual);
  }
  
  return seccoes;
}
