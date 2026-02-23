import * as XLSX from 'xlsx';
import { getDb } from './db';
import { resultadosMensais, lojas, totaisMensais, vendasComplementares, npsDados } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export interface ResultadoExcel {
  zona: string;
  nomeLoja: string;
  totalServicos: number | null;
  servicosPorColaborador: number | null;
  numColaboradores: number | null;
  objetivoDiaAtual: number | null;
  objetivoMensal: number | null;
  desvioObjetivoAcumulado: number | null;
  desvioPercentualDia: number | null;
  desvioPercentualMes: number | null;
  taxaReparacao: number | null;
  qtdReparacoes: number | null;
  qtdParaBrisas: number | null;
  gapReparacoes22: number | null;
}

/**
 * Processa ficheiro Excel e extrai dados da folha "Faturados" (colunas A-N)
 * Guarda dados por loja E totais globais (incluindo PROMOTOR)
 */
export async function processarExcelResultados(
  fileBuffer: Buffer,
  mes: number,
  ano: number,
  uploadedBy: number,
  nomeArquivo: string
): Promise<{ sucesso: number; erros: string[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const erros: string[] = [];
  let sucesso = 0;

  try {
    // Ler ficheiro Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Verificar se folha "Faturados" existe (pode ter espaço no final)
    const faturadosSheet = workbook.SheetNames.find(name => 
      name.trim().toLowerCase() === 'faturados'
    );
    
    if (!faturadosSheet) {
      throw new Error('Folha "Faturados" não encontrada no ficheiro Excel');
    }

    const worksheet = workbook.Sheets[faturadosSheet];
    
    // Converter para JSON (linhas como arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Buscar todas as lojas da base de dados para matching
    const todasLojas = await db.select().from(lojas);
    const lojasMap = new Map<string, number>();
    todasLojas.forEach(loja => {
      lojasMap.set(normalizeName(loja.nome), loja.id);
    });

    // Extrair totais globais da linha "Total Serviços Faturados" (linha 10, índice 9)
    const linhaTotais = data[9];
    if (linhaTotais && String(linhaTotais[1] || '').toLowerCase().includes('total')) {
      const totaisGlobais = {
        totalServicos: parseNumber(linhaTotais[2]),
        objetivoMensal: parseNumber(linhaTotais[6]),
        numColaboradores: parseNumber(linhaTotais[4]),
        taxaReparacao: parseNumber(linhaTotais[10]),
        qtdReparacoes: parseNumber(linhaTotais[11]),
        qtdParaBrisas: parseNumber(linhaTotais[12]),
      };

      // Guardar ou atualizar totais globais
      const existenteTotais = await db
        .select()
        .from(totaisMensais)
        .where(
          and(
            eq(totaisMensais.mes, mes),
            eq(totaisMensais.ano, ano)
          )
        )
        .limit(1);

      if (existenteTotais.length > 0) {
        await db
          .update(totaisMensais)
          .set({
            totalServicos: totaisGlobais.totalServicos,
            objetivoMensal: totaisGlobais.objetivoMensal,
            numColaboradores: totaisGlobais.numColaboradores,
            taxaReparacao: totaisGlobais.taxaReparacao?.toString(),
            qtdReparacoes: totaisGlobais.qtdReparacoes,
            qtdParaBrisas: totaisGlobais.qtdParaBrisas,
            nomeArquivo,
            uploadedBy,
            updatedAt: new Date(),
          })
          .where(eq(totaisMensais.id, existenteTotais[0].id));
      } else {
        await db.insert(totaisMensais).values({
          mes,
          ano,
          totalServicos: totaisGlobais.totalServicos,
          objetivoMensal: totaisGlobais.objetivoMensal,
          numColaboradores: totaisGlobais.numColaboradores,
          taxaReparacao: totaisGlobais.taxaReparacao?.toString(),
          qtdReparacoes: totaisGlobais.qtdReparacoes,
          qtdParaBrisas: totaisGlobais.qtdParaBrisas,
          nomeArquivo,
          uploadedBy,
        });
      }
    }

    // Processar cada linha de dados (começar na linha 11, índice 10)
    for (let rowIdx = 10; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      
      // Verificar se linha tem dados (coluna B não vazia)
      if (!row || !row[1] || typeof row[1] !== 'string') {
        continue; // Linha vazia ou inválida
      }

      const nomeLoja = String(row[1]).trim();
      const nomeNormalizado = normalizeName(nomeLoja);
      
      // Ignorar linhas de total, subtotal, PROMOTOR ou subtotais por zona (não são lojas)
      if (nomeNormalizado.includes('total') || 
          nomeNormalizado.includes('promotor') ||
          nomeNormalizado === 'zona') {
        continue;
      }

      // Encontrar ID da loja na base de dados (matching case-insensitive)
      const lojaId = lojasMap.get(nomeNormalizado);
      
      if (!lojaId) {
        erros.push(`Loja "${nomeLoja}" não encontrada na base de dados (linha ${rowIdx + 1})`);
        continue;
      }

      // Extrair dados das colunas A-N (índices 0-13)
      const resultado: ResultadoExcel = {
        zona: row[0] ? String(row[0]).trim() : '',
        nomeLoja: nomeLoja,
        totalServicos: parseNumber(row[2]),
        servicosPorColaborador: parseNumber(row[3]),
        numColaboradores: parseNumber(row[4]),
        objetivoDiaAtual: parseNumber(row[5]),
        objetivoMensal: parseNumber(row[6]),
        desvioObjetivoAcumulado: parseNumber(row[7]),
        desvioPercentualDia: parseNumber(row[8]),
        desvioPercentualMes: parseNumber(row[9]),
        taxaReparacao: parseNumber(row[10]),
        qtdReparacoes: parseNumber(row[11]),
        qtdParaBrisas: parseNumber(row[12]),
        gapReparacoes22: parseNumber(row[13]),
      };

      try {
        // Verificar se já existe resultado para esta loja/mês/ano
        const existente = await db
          .select()
          .from(resultadosMensais)
          .where(
            and(
              eq(resultadosMensais.lojaId, lojaId),
              eq(resultadosMensais.mes, mes),
              eq(resultadosMensais.ano, ano)
            )
          )
          .limit(1);

        if (existente.length > 0) {
          // Atualizar registro existente
          await db
            .update(resultadosMensais)
            .set({
              zona: resultado.zona,
              totalServicos: resultado.totalServicos,
              servicosPorColaborador: resultado.servicosPorColaborador?.toString(),
              numColaboradores: resultado.numColaboradores,
              objetivoDiaAtual: resultado.objetivoDiaAtual?.toString(),
              objetivoMensal: resultado.objetivoMensal,
              desvioObjetivoAcumulado: resultado.desvioObjetivoAcumulado?.toString(),
              desvioPercentualDia: resultado.desvioPercentualDia?.toString(),
              desvioPercentualMes: resultado.desvioPercentualMes?.toString(),
              taxaReparacao: resultado.taxaReparacao?.toString(),
              qtdReparacoes: resultado.qtdReparacoes,
              qtdParaBrisas: resultado.qtdParaBrisas,
              gapReparacoes22: resultado.gapReparacoes22,
              nomeArquivo,
              uploadedBy,
              updatedAt: new Date(),
            })
            .where(eq(resultadosMensais.id, existente[0].id));
        } else {
          // Inserir novo registro
          await db.insert(resultadosMensais).values({
            lojaId,
            mes,
            ano,
            zona: resultado.zona,
            totalServicos: resultado.totalServicos,
            servicosPorColaborador: resultado.servicosPorColaborador?.toString(),
            numColaboradores: resultado.numColaboradores,
            objetivoDiaAtual: resultado.objetivoDiaAtual?.toString(),
            objetivoMensal: resultado.objetivoMensal,
            desvioObjetivoAcumulado: resultado.desvioObjetivoAcumulado?.toString(),
            desvioPercentualDia: resultado.desvioPercentualDia?.toString(),
            desvioPercentualMes: resultado.desvioPercentualMes?.toString(),
            taxaReparacao: resultado.taxaReparacao?.toString(),
            qtdReparacoes: resultado.qtdReparacoes,
            qtdParaBrisas: resultado.qtdParaBrisas,
            gapReparacoes22: resultado.gapReparacoes22,
            nomeArquivo,
            uploadedBy,
          });
        }

        sucesso++;
      } catch (error: any) {
        erros.push(`Erro ao processar loja "${nomeLoja}": ${error.message}`);
      }
    }

    return { sucesso, erros };
  } catch (error: any) {
    throw new Error(`Erro ao processar Excel: ${error.message}`);
  }
}

/**
 * Normaliza nome de loja para matching
 * - Converte para minúsculas
 * - Remove espaços extras
 * - Substitui caracteres especiais (non-breaking spaces, dashes)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Substituir non-breaking spaces por espaços normais
    .replace(/\u00A0/g, ' ')
    // Substituir en-dash e em-dash por hífen normal
    .replace(/[\u2013\u2014]/g, '-')
    // Remover espaços múltiplos
    .replace(/\s+/g, ' ')
    // Normalizar espaços ao redor de hífens
    .replace(/\s*-\s*/g, ' - ');
}

/**
 * Helper para converter valores do Excel em números
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const num = Number(value);
  return isNaN(num) ? null : num;
}


/**
 * Interface para dados de vendas complementares
 */
export interface VendaComplementarExcel {
  nomeLoja: string;
  totalVendas: number | null;
  escovasVendas: number | null;
  escovasQtd: number | null;
  escovasPercent: number | null;
  polimentoQtd: number | null;
  polimentoVendas: number | null;
  tratamentoQtd: number | null;
  tratamentoVendas: number | null;
  outrosQtd: number | null;
  outrosVendas: number | null;
  peliculaVendas: number | null;
  lavagensEcoExterior: number | null;
  lavagensEcoNormal: number | null;
  lavagensEcoFresh: number | null;
  lavagensEcoProtecao: number | null;
  lavagensEcoEstofos: number | null;
  lavagensEcoTop: number | null;
  lavagensTotal: number | null;
  lavagensVendas: number | null;
}

/**
 * Processa ficheiro Excel e extrai dados da folha "Complementares"
 * Guarda dados de vendas complementares por loja
 */
export async function processarExcelComplementares(
  fileBuffer: Buffer,
  mes: number,
  ano: number,
  uploadedBy: number,
  nomeArquivo: string
): Promise<{ sucesso: number; erros: string[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const erros: string[] = [];
  let sucesso = 0;

  try {
    // Ler ficheiro Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Verificar se folha "Complementares" existe (pode ter espaço no final)
    const complementaresSheet = workbook.SheetNames.find(name => 
      name.trim().toLowerCase() === 'complementares'
    );
    
    if (!complementaresSheet) {
      // Não é erro crítico - pode não ter folha Complementares
      return { sucesso: 0, erros: ['Folha "Complementares" não encontrada no ficheiro Excel'] };
    }

    const worksheet = workbook.Sheets[complementaresSheet];
    
    // Converter para JSON (linhas como arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Buscar todas as lojas da base de dados para matching
    const todasLojas = await db.select().from(lojas);
    const lojasMap = new Map<string, number>();
    todasLojas.forEach(loja => {
      lojasMap.set(normalizeName(loja.nome), loja.id);
    });

    // Processar cada linha de dados (começar na linha 11, índice 10)
    // Estrutura da folha Complementares:
    // Col 2 (C): Nome da Loja
    // Col 3 (D): Total Vendas Complementares (excl. Películas)
    // Col 5 (F): Escovas - Vendas €
    // Col 6 (G): Escovas - Qtd
    // Col 7 (H): Escovas - % Serviços
    // Col 8 (I): Polimento - Qtd
    // Col 9 (J): Polimento - Vendas €
    // Col 10 (K): Tratamento - Qtd
    // Col 11 (L): Tratamento - Vendas €
    // Col 12 (M): Outros - Qtd
    // Col 13 (N): Outros - Vendas €
    // Col 14 (O): Película - Vendas €
    // Col 15-20 (P-U): Lavagens ECO (6 tipos)
    // Col 21 (V): Lavagens Total
    // Col 22 (W): Lavagens - Vendas €

    for (let rowIdx = 10; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      
      // Verificar se linha tem dados (coluna C não vazia)
      if (!row || !row[2] || typeof row[2] !== 'string') {
        continue; // Linha vazia ou inválida
      }

      const nomeLoja = String(row[2]).trim();
      const nomeNormalizado = normalizeName(nomeLoja);
      
      // Ignorar linhas de total, subtotal, PROMOTOR ou subtotais por zona
      if (nomeNormalizado.includes('total') || 
          nomeNormalizado.includes('promotor') ||
          nomeNormalizado.includes('zona')) {
        continue;
      }

      // Encontrar ID da loja na base de dados
      const lojaId = lojasMap.get(nomeNormalizado);
      
      if (!lojaId) {
        // Não registar erro para lojas não encontradas - pode ser linha de zona
        continue;
      }

      // Extrair dados das colunas
      const venda: VendaComplementarExcel = {
        nomeLoja: nomeLoja,
        totalVendas: parseNumber(row[3]),
        escovasVendas: parseNumber(row[5]),
        escovasQtd: parseNumber(row[6]),
        escovasPercent: parseNumber(row[7]),
        polimentoQtd: parseNumber(row[8]),
        polimentoVendas: parseNumber(row[9]),
        tratamentoQtd: parseNumber(row[10]),
        tratamentoVendas: parseNumber(row[11]),
        outrosQtd: parseNumber(row[12]),
        outrosVendas: parseNumber(row[13]),
        peliculaVendas: parseNumber(row[14]),
        lavagensEcoExterior: parseNumber(row[15]),
        lavagensEcoNormal: parseNumber(row[16]),
        lavagensEcoFresh: parseNumber(row[17]),
        lavagensEcoProtecao: parseNumber(row[18]),
        lavagensEcoEstofos: parseNumber(row[19]),
        lavagensEcoTop: parseNumber(row[20]),
        lavagensTotal: parseNumber(row[21]),
        lavagensVendas: parseNumber(row[22]),
      };

      try {
        // Verificar se já existe registro para esta loja/mês/ano
        const existente = await db
          .select()
          .from(vendasComplementares)
          .where(
            and(
              eq(vendasComplementares.lojaId, lojaId),
              eq(vendasComplementares.mes, mes),
              eq(vendasComplementares.ano, ano)
            )
          )
          .limit(1);

        if (existente.length > 0) {
          // Atualizar registro existente
          await db
            .update(vendasComplementares)
            .set({
              totalVendas: venda.totalVendas?.toString(),
              escovasVendas: venda.escovasVendas?.toString(),
              escovasQtd: venda.escovasQtd,
              escovasPercent: venda.escovasPercent?.toString(),
              polimentoQtd: venda.polimentoQtd,
              polimentoVendas: venda.polimentoVendas?.toString(),
              tratamentoQtd: venda.tratamentoQtd,
              tratamentoVendas: venda.tratamentoVendas?.toString(),
              outrosQtd: venda.outrosQtd,
              outrosVendas: venda.outrosVendas?.toString(),
              peliculaVendas: venda.peliculaVendas?.toString(),
              lavagensEcoExterior: venda.lavagensEcoExterior,
              lavagensEcoNormal: venda.lavagensEcoNormal,
              lavagensEcoFresh: venda.lavagensEcoFresh,
              lavagensEcoProtecao: venda.lavagensEcoProtecao,
              lavagensEcoEstofos: venda.lavagensEcoEstofos,
              lavagensEcoTop: venda.lavagensEcoTop,
              lavagensTotal: venda.lavagensTotal,
              lavagensVendas: venda.lavagensVendas?.toString(),
              nomeArquivo,
              uploadedBy,
              updatedAt: new Date(),
            })
            .where(eq(vendasComplementares.id, existente[0].id));
        } else {
          // Inserir novo registro
          await db.insert(vendasComplementares).values({
            lojaId,
            mes,
            ano,
            totalVendas: venda.totalVendas?.toString(),
            escovasVendas: venda.escovasVendas?.toString(),
            escovasQtd: venda.escovasQtd,
            escovasPercent: venda.escovasPercent?.toString(),
            polimentoQtd: venda.polimentoQtd,
            polimentoVendas: venda.polimentoVendas?.toString(),
            tratamentoQtd: venda.tratamentoQtd,
            tratamentoVendas: venda.tratamentoVendas?.toString(),
            outrosQtd: venda.outrosQtd,
            outrosVendas: venda.outrosVendas?.toString(),
            peliculaVendas: venda.peliculaVendas?.toString(),
            lavagensEcoExterior: venda.lavagensEcoExterior,
            lavagensEcoNormal: venda.lavagensEcoNormal,
            lavagensEcoFresh: venda.lavagensEcoFresh,
            lavagensEcoProtecao: venda.lavagensEcoProtecao,
            lavagensEcoEstofos: venda.lavagensEcoEstofos,
            lavagensEcoTop: venda.lavagensEcoTop,
            lavagensTotal: venda.lavagensTotal,
            lavagensVendas: venda.lavagensVendas?.toString(),
            nomeArquivo,
            uploadedBy,
          });
        }

        sucesso++;
      } catch (error: any) {
        erros.push(`Erro ao processar vendas complementares de "${nomeLoja}": ${error.message}`);
      }
    }

    return { sucesso, erros };
  } catch (error: any) {
    throw new Error(`Erro ao processar folha Complementares: ${error.message}`);
  }
}


/**
 * Processa ficheiro Excel NPS e extrai dados da folha "Por Loja"
 * Guarda NPS mensal e taxa de resposta por loja
 */
export async function processarExcelNPS(
  fileBuffer: Buffer,
  ano: number,
  uploadedBy: number,
  nomeArquivo: string
): Promise<{ sucesso: number; erros: string[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const erros: string[] = [];
  let sucesso = 0;

  try {
    // Ler ficheiro Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Verificar se folha "Por Loja" existe
    const porLojaSheet = workbook.SheetNames.find(name => 
      name.trim().toLowerCase() === 'por loja'
    );
    
    if (!porLojaSheet) {
      throw new Error('Folha "Por Loja" não encontrada no ficheiro Excel NPS');
    }

    const worksheet = workbook.Sheets[porLojaSheet];
    
    // Converter para JSON (linhas como arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Buscar todas as lojas da base de dados para matching
    const todasLojas = await db.select().from(lojas);
    const lojasMap = new Map<string, number>();
    todasLojas.forEach(loja => {
      lojasMap.set(normalizeName(loja.nome), loja.id);
    });

    // Encontrar a linha de cabeçalhos (procurar por "Loja" na coluna A ou B)
    let linhaInicio = -1;
    let lojaColIndex = -1; // Índice da coluna onde está "Loja"
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      // Verificar coluna A (índice 0)
      const colA = String(data[i][0] || '').trim().toLowerCase();
      if (colA === 'loja') {
        linhaInicio = i + 1;
        lojaColIndex = 0;
        break;
      }
      // Verificar coluna B (índice 1)
      const colB = String(data[i][1] || '').trim().toLowerCase();
      if (colB === 'loja') {
        linhaInicio = i + 1;
        lojaColIndex = 1;
        break;
      }
    }

    if (linhaInicio === -1) {
      throw new Error('Não foi possível encontrar o cabeçalho "Loja" na folha "Por Loja"');
    }

    // Determinar offset das colunas de dados baseado na posição de "Loja"
    // Se Loja está na col A (0): dados NPS começam na col B (1), taxa resposta na col O (14)
    // Se Loja está na col B (1): dados NPS começam na col C (2), taxa resposta na col P (15)
    const dataOffset = lojaColIndex === 0 ? 1 : 2;
    const taxaOffset = lojaColIndex === 0 ? 14 : 15;

    // Processar cada linha de dados (a partir de linhaInicio)
    for (let i = linhaInicio; i < data.length; i++) {
      const linha = data[i];
      
      // Nome da loja (coluna A ou B dependendo do offset)
      const nomeLoja = String(linha[lojaColIndex] || '').trim();
      
      // Parar se encontrar linha vazia ou totais
      if (!nomeLoja || nomeLoja === '' || nomeLoja.toLowerCase().includes('total')) {
        continue;
      }

      // Procurar loja na base de dados
      const lojaId = lojasMap.get(normalizeName(nomeLoja));
      
      if (!lojaId) {
        erros.push(`Loja "${nomeLoja}" não encontrada na base de dados`);
        continue;
      }

      try {
        // Extrair dados NPS e Taxa de Resposta
        // Estrutura esperada (baseada na imagem):
        // Coluna C (índice 2): NPS Jan
        // Coluna D (índice 3): NPS Fev
        // ... até Coluna N (índice 13): NPS Dez
        // Coluna O (índice 14): NPS 2026 Total
        // Coluna P (índice 15): Taxa Resposta Jan
        // Coluna Q (índice 16): Taxa Resposta Fev
        // ... até Coluna AA (índice 26): Taxa Resposta Dez
        // Coluna AB (índice 27): Taxa Resposta 2026 Total

        const dadosNPS = {
          lojaId,
          ano,
          // NPS mensal (12 meses a partir do dataOffset)
          npsJan: parseDecimal(linha[dataOffset]),
          npsFev: parseDecimal(linha[dataOffset + 1]),
          npsMar: parseDecimal(linha[dataOffset + 2]),
          npsAbr: parseDecimal(linha[dataOffset + 3]),
          npsMai: parseDecimal(linha[dataOffset + 4]),
          npsJun: parseDecimal(linha[dataOffset + 5]),
          npsJul: parseDecimal(linha[dataOffset + 6]),
          npsAgo: parseDecimal(linha[dataOffset + 7]),
          npsSet: parseDecimal(linha[dataOffset + 8]),
          npsOut: parseDecimal(linha[dataOffset + 9]),
          npsNov: parseDecimal(linha[dataOffset + 10]),
          npsDez: parseDecimal(linha[dataOffset + 11]),
          // NPS Total (coluna após os 12 meses)
          npsAnoTotal: parseDecimal(linha[dataOffset + 12]),
          // Taxa de Resposta mensal (a partir do taxaOffset)
          taxaRespostaJan: parseDecimal(linha[taxaOffset]),
          taxaRespostaFev: parseDecimal(linha[taxaOffset + 1]),
          taxaRespostaMar: parseDecimal(linha[taxaOffset + 2]),
          taxaRespostaAbr: parseDecimal(linha[taxaOffset + 3]),
          taxaRespostaMai: parseDecimal(linha[taxaOffset + 4]),
          taxaRespostaJun: parseDecimal(linha[taxaOffset + 5]),
          taxaRespostaJul: parseDecimal(linha[taxaOffset + 6]),
          taxaRespostaAgo: parseDecimal(linha[taxaOffset + 7]),
          taxaRespostaSet: parseDecimal(linha[taxaOffset + 8]),
          taxaRespostaOut: parseDecimal(linha[taxaOffset + 9]),
          taxaRespostaNov: parseDecimal(linha[taxaOffset + 10]),
          taxaRespostaDez: parseDecimal(linha[taxaOffset + 11]),
          // Taxa de Resposta Total
          taxaRespostaAnoTotal: parseDecimal(linha[taxaOffset + 12]),
          // Metadados
          nomeArquivo,
          uploadedBy,
        };

        // Verificar se já existe registo para esta loja e ano
        const existente = await db
          .select()
          .from(npsDados)
          .where(and(eq(npsDados.lojaId, lojaId), eq(npsDados.ano, ano)))
          .limit(1);

        if (existente.length > 0) {
          // Atualizar registo existente
          await db
            .update(npsDados)
            .set({
              ...dadosNPS,
              updatedAt: new Date(),
            })
            .where(and(eq(npsDados.lojaId, lojaId), eq(npsDados.ano, ano)));
        } else {
          // Inserir novo registo
          await db.insert(npsDados).values(dadosNPS);
        }

        sucesso++;
      } catch (error: any) {
        erros.push(`Erro ao processar loja "${nomeLoja}": ${error.message}`);
      }
    }

    return { sucesso, erros };
  } catch (error: any) {
    throw new Error(`Erro ao processar ficheiro NPS: ${error.message}`);
  }
}

/**
 * Helper para converter valor para decimal (aceita percentagens e números)
 */
function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const str = String(value).trim();
  
  // Se for percentagem (ex: "100,0%"), remover % e converter
  if (str.includes('%')) {
    const num = parseFloat(str.replace('%', '').replace(',', '.'));
    if (isNaN(num)) return null;
    return num / 100; // Converter para decimal (0.0 a 1.0)
  }
  
  // Se for número decimal (ex: "0.85" ou "0,85")
  const num = parseFloat(str.replace(',', '.'));
  if (isNaN(num)) return null;
  
  // Se o número for maior que 1, assumir que é percentagem sem %
  if (num > 1) {
    return num / 100;
  }
  
  return num;
}
