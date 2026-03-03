/**
 * Processador de PDF NPS - Extrai dados NPS do relatório PDF mensal
 * Formato: NPS - Net Promoter Score | Análise por Loja
 * 
 * Estrutura do PDF:
 * - Página 1: Análise Geral (NPS nacional, qtd serviços, % respostas)
 * - Páginas 2+: Análise por Loja (tabela com NPS e % Respostas por mês)
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { npsDados, lojas } from "../drizzle/schema";

// Normalizar nome de loja para matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ');
}

// Parse de valor percentual do PDF (ex: "100,0%", "-100,0%", "86,7%")
function parsePercentValue(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const str = val.trim().replace('%', '').replace(',', '.');
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return num / 100; // Converter para decimal (0.0 a 1.0)
}

// Mapeamento de nomes de meses para índices
const mesesMap: Record<string, number> = {
  'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
  'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
  'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
};

const npsFields = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'] as const;
const taxaFields = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'] as const;

interface ParsedRow {
  lojaNome: string;
  npsValues: (number | null)[]; // 12 meses
  npsTotal: number | null;
  taxaValues: (number | null)[]; // 12 meses
  taxaTotal: number | null;
}

/**
 * Detectar quais meses estão presentes no cabeçalho do PDF
 * Retorna array de índices de meses (0=jan, 1=fev, etc.)
 */
function detectMeses(headerLine: string): number[] {
  const meses: number[] = [];
  const lower = headerLine.toLowerCase();
  
  for (const [nome, idx] of Object.entries(mesesMap)) {
    // Procurar o nome do mês como palavra isolada
    const regex = new RegExp(`\\b${nome}\\b`, 'i');
    if (regex.test(lower)) {
      meses.push(idx);
    }
  }
  
  return meses.sort((a, b) => a - b);
}

/**
 * Extrair valores numéricos (percentagens) de uma string
 */
function extractPercentValues(text: string): string[] {
  // Match percentages like "100,0%", "-100,0%", "86,7%"
  const matches = text.match(/-?\d+[.,]\d+%/g) || [];
  return matches;
}

/**
 * Parse uma linha de dados do PDF NPS
 * Formato: "LOJA_NAME |val1 |val2 val3 |val4 |val5 val6"
 * Onde os primeiros N+1 valores são NPS (N meses + total) e os seguintes N+1 são taxa de resposta
 */
function parseDataLine(line: string, numMeses: number): { lojaNome: string; values: string[] } | null {
  // Extrair nome da loja (tudo antes do primeiro valor percentual)
  const firstPercMatch = line.match(/-?\d+[.,]\d+%/);
  if (!firstPercMatch || firstPercMatch.index === undefined) return null;
  
  const lojaNome = line.substring(0, firstPercMatch.index).replace(/\|/g, '').trim();
  if (!lojaNome) return null;
  
  // Extrair todos os valores percentuais
  const values = extractPercentValues(line);
  
  return { lojaNome, values };
}

/**
 * Processar PDF NPS e guardar na base de dados
 */
export async function processarPdfNPS(
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
    // Importar pdf-parse dinamicamente
    const pdfParseModule = await import('pdf-parse');
    const { PDFParse } = pdfParseModule;
    
    // Extrair texto do PDF com separador de células
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText({ cellSeparator: '|' });
    const allLines = result.text.split('\n').filter((l: string) => l.trim());

    // Encontrar a secção "Análise por Loja"
    let startIdx = -1;
    let mesesDetectados: number[] = [];
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      if (line.includes('Análise por Loja')) {
        // Procurar a linha de cabeçalho com os meses (ex: "Loja |jan |fev")
        for (let j = i + 1; j < Math.min(i + 10, allLines.length); j++) {
          const headerLine = allLines[j];
          if (headerLine.toLowerCase().includes('loja')) {
            mesesDetectados = detectMeses(headerLine);
            startIdx = j + 1;
            break;
          }
        }
        if (startIdx > -1) break;
      }
    }

    if (startIdx === -1 || mesesDetectados.length === 0) {
      throw new Error('Não foi possível encontrar a secção "Análise por Loja" ou detectar os meses no PDF');
    }

    console.log(`[PDF NPS] Meses detectados: ${mesesDetectados.map(m => Object.keys(mesesMap).find(k => mesesMap[k] === m)).join(', ')}`);

    // Buscar todas as lojas da base de dados para matching
    const todasLojas = await db.select().from(lojas);
    const lojasMap = new Map<string, number>();
    todasLojas.forEach(loja => {
      lojasMap.set(normalizeName(loja.nome), loja.id);
    });

    // Número esperado de valores por linha:
    // NPS: numMeses + 1 (total) = numMeses + 1
    // Taxa: numMeses + 1 (total) = numMeses + 1
    // Total esperado: (numMeses + 1) * 2
    // Mas algumas linhas podem ter valores em falta
    const numMeses = mesesDetectados.length;
    const valoresEsperadosCompleto = (numMeses + 1) * 2; // NPS meses + total + Taxa meses + total

    // Processar linhas de dados
    for (let i = startIdx; i < allLines.length; i++) {
      const line = allLines[i];
      
      // Ignorar linhas de separação de página e cabeçalhos repetidos
      if (line.startsWith('--') || 
          line.includes('Rótulos de Coluna') || 
          line.includes('NPS |% Respostas') ||
          line.includes('2026 |2026 Total') ||
          line.toLowerCase().includes('loja |jan') ||
          line.toLowerCase().includes('loja |fev') ||
          line.toLowerCase().includes('loja |mar') ||
          line.includes('Análise por Gestor') ||
          line.includes('Análise por Loja') ||
          line.includes('Ano 2026') ||
          line.includes('Total Geral')) {
        // Se encontramos "Análise por Gestor", paramos (é outra secção)
        if (line.includes('Análise por Gestor')) break;
        continue;
      }

      // Tentar parsear a linha
      const parsed = parseDataLine(line, numMeses);
      if (!parsed) continue;
      
      const { lojaNome, values } = parsed;
      
      // Ignorar linhas de totais
      if (lojaNome.toLowerCase().includes('total') || lojaNome.toLowerCase() === 'nps') continue;

      // Procurar loja na base de dados
      const lojaId = lojasMap.get(normalizeName(lojaNome));
      
      if (!lojaId) {
        erros.push(`Loja "${lojaNome}" não encontrada na base de dados`);
        continue;
      }

      try {
        // Distribuir valores: primeiro bloco é NPS, segundo bloco é Taxa
        // O número de valores pode variar (algumas lojas não têm dados para todos os meses)
        const npsMonthValues: (number | null)[] = new Array(12).fill(null);
        let npsTotal: number | null = null;
        const taxaMonthValues: (number | null)[] = new Array(12).fill(null);
        let taxaTotal: number | null = null;

        if (values.length >= valoresEsperadosCompleto) {
          // Linha completa: numMeses NPS + 1 total + numMeses taxa + 1 total
          for (let m = 0; m < numMeses; m++) {
            npsMonthValues[mesesDetectados[m]] = parsePercentValue(values[m]);
          }
          npsTotal = parsePercentValue(values[numMeses]);
          
          for (let m = 0; m < numMeses; m++) {
            taxaMonthValues[mesesDetectados[m]] = parsePercentValue(values[numMeses + 1 + m]);
          }
          taxaTotal = parsePercentValue(values[numMeses + 1 + numMeses]);
        } else if (values.length >= numMeses * 2) {
          // Linha com alguns valores em falta - tentar distribuir inteligentemente
          // Heurística: dividir ao meio
          const metade = Math.ceil(values.length / 2);
          const npsVals = values.slice(0, metade);
          const taxaVals = values.slice(metade);
          
          // Se temos numMeses+1 no NPS (com total)
          if (npsVals.length === numMeses + 1) {
            for (let m = 0; m < numMeses; m++) {
              npsMonthValues[mesesDetectados[m]] = parsePercentValue(npsVals[m]);
            }
            npsTotal = parsePercentValue(npsVals[numMeses]);
          } else if (npsVals.length === numMeses) {
            for (let m = 0; m < numMeses; m++) {
              npsMonthValues[mesesDetectados[m]] = parsePercentValue(npsVals[m]);
            }
          } else {
            // Menos valores que meses - atribuir aos últimos meses
            for (let m = 0; m < Math.min(npsVals.length, numMeses); m++) {
              const mesIdx = mesesDetectados[numMeses - npsVals.length + m];
              if (mesIdx !== undefined) {
                npsMonthValues[mesIdx] = parsePercentValue(npsVals[m]);
              }
            }
          }
          
          // Taxa de resposta
          if (taxaVals.length === numMeses + 1) {
            for (let m = 0; m < numMeses; m++) {
              taxaMonthValues[mesesDetectados[m]] = parsePercentValue(taxaVals[m]);
            }
            taxaTotal = parsePercentValue(taxaVals[numMeses]);
          } else if (taxaVals.length === numMeses) {
            for (let m = 0; m < numMeses; m++) {
              taxaMonthValues[mesesDetectados[m]] = parsePercentValue(taxaVals[m]);
            }
          } else {
            for (let m = 0; m < Math.min(taxaVals.length, numMeses); m++) {
              const mesIdx = mesesDetectados[numMeses - taxaVals.length + m];
              if (mesIdx !== undefined) {
                taxaMonthValues[mesIdx] = parsePercentValue(taxaVals[m]);
              }
            }
          }
        } else {
          // Poucos valores - pode ser linha incompleta
          // Tentar atribuir o que temos
          for (let v = 0; v < Math.min(values.length, numMeses); v++) {
            npsMonthValues[mesesDetectados[v]] = parsePercentValue(values[v]);
          }
        }

        const dadosNPS: Record<string, any> = {
          lojaId,
          ano,
          npsJan: npsMonthValues[0],
          npsFev: npsMonthValues[1],
          npsMar: npsMonthValues[2],
          npsAbr: npsMonthValues[3],
          npsMai: npsMonthValues[4],
          npsJun: npsMonthValues[5],
          npsJul: npsMonthValues[6],
          npsAgo: npsMonthValues[7],
          npsSet: npsMonthValues[8],
          npsOut: npsMonthValues[9],
          npsNov: npsMonthValues[10],
          npsDez: npsMonthValues[11],
          npsAnoTotal: npsTotal,
          taxaRespostaJan: taxaMonthValues[0],
          taxaRespostaFev: taxaMonthValues[1],
          taxaRespostaMar: taxaMonthValues[2],
          taxaRespostaAbr: taxaMonthValues[3],
          taxaRespostaMai: taxaMonthValues[4],
          taxaRespostaJun: taxaMonthValues[5],
          taxaRespostaJul: taxaMonthValues[6],
          taxaRespostaAgo: taxaMonthValues[7],
          taxaRespostaSet: taxaMonthValues[8],
          taxaRespostaOut: taxaMonthValues[9],
          taxaRespostaNov: taxaMonthValues[10],
          taxaRespostaDez: taxaMonthValues[11],
          taxaRespostaAnoTotal: taxaTotal,
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
          // Atualizar apenas os campos que têm dados (não sobrescrever com null)
          const updateData: Record<string, any> = { updatedAt: new Date(), nomeArquivo, uploadedBy };
          for (const [key, value] of Object.entries(dadosNPS)) {
            if (value !== null && key !== 'lojaId' && key !== 'ano') {
              updateData[key] = value;
            }
          }
          await db
            .update(npsDados)
            .set(updateData)
            .where(and(eq(npsDados.lojaId, lojaId), eq(npsDados.ano, ano)));
        } else {
          await db.insert(npsDados).values(dadosNPS as any);
        }

        sucesso++;
      } catch (error: any) {
        erros.push(`Erro ao processar loja "${lojaNome}": ${error.message}`);
      }
    }

    return { sucesso, erros };
  } catch (error: any) {
    throw new Error(`Erro ao processar PDF NPS: ${error.message}`);
  }
}
