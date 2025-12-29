import * as XLSX from 'xlsx';
import { getDb } from './db';
import { resultadosMensais, lojas } from '../drizzle/schema';
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

    // Verificar se folha "Faturados" existe
    if (!workbook.SheetNames.includes('Faturados')) {
      throw new Error('Folha "Faturados" não encontrada no ficheiro Excel');
    }

    const worksheet = workbook.Sheets['Faturados'];
    
    // Converter para JSON (linhas como arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Linha 8 (índice 7) contém os cabeçalhos
    // Linha 10+ (índice 9+) contém os dados das lojas
    // Ignorar linha 10 (Total Serviços Faturados)
    
    // Buscar todas as lojas da base de dados para matching
    const todasLojas = await db.select().from(lojas);
    const lojasMap = new Map<string, number>();
    todasLojas.forEach(loja => {
      lojasMap.set(normalizeName(loja.nome), loja.id);
    });

    // Processar cada linha de dados (começar na linha 11, índice 10)
    for (let rowIdx = 10; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      
      // Verificar se linha tem dados (coluna B não vazia)
      if (!row || !row[1] || typeof row[1] !== 'string') {
        continue; // Linha vazia ou inválida
      }

      const nomeLoja = String(row[1]).trim();
      const nomeNormalizado = normalizeName(nomeLoja);
      
      // Ignorar linhas de total ou subtotal
      if (nomeNormalizado.includes('total') || 
          nomeNormalizado.includes('zona ')) {
        continue;
      }

      // Encontrar ID da loja na base de dados
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
