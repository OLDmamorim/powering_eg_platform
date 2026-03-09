import ExcelJSModule from 'exceljs';
const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
import * as db from './db';

const CLASSIFICACAO_LABELS: Record<string, string> = {
  devolucao_rejeitada: 'Devolução Rejeitada',
  usado: 'Usado',
  com_danos: 'Com Danos',
  para_devolver: 'Para Devolver',
};

/**
 * Gera um ficheiro Excel consolidado de controlo de stock com 2 separadores.
 * Retorna o buffer em base64 para anexar ao email.
 */
export async function gerarExcelControloStock(params: {
  nomeLoja: string;
  lojaId: number;
  comFichas: any[];
  semFichas: any[];
}): Promise<{ base64: string; filename: string }> {
  const { nomeLoja, lojaId, comFichas, semFichas } = params;

  // Obter classificações e recorrência da loja (com fallback se falhar)
  let classificacoesMap = new Map<string, string>();
  let recorrenciaMap = new Map<string, number>();

  try {
    const classificacoes = await db.getClassificacoesEurocode(lojaId);
    for (const c of classificacoes) {
      const key = `${c.eurocode.toUpperCase().trim()}|${(c as any).unitIndex || 1}`;
      classificacoesMap.set(key, c.classificacao);
    }
  } catch (e) {
    console.error('[StockExcel] Erro ao obter classificações, a continuar sem elas:', e);
  }

  try {
    const recorrencia = await db.getRecorrenciaEurocodes(lojaId);
    for (const r of recorrencia) {
      const key = `${r.eurocode.toUpperCase().trim()}|${(r as any).unitIndex || 1}`;
      recorrenciaMap.set(key, r.analisesConsecutivas);
    }
  } catch (e) {
    console.error('[StockExcel] Erro ao obter recorrência, a continuar sem ela:', e);
  }

  const wb = new ExcelJS.Workbook();

  // --- Sheet 1: Sem Fichas (desmultiplicado: 1 linha por unidade) ---
  const ws1 = wb.addWorksheet('Sem Fichas');
  ws1.columns = [
    { header: 'Referência', key: 'ref', width: 18 },
    { header: 'Unidade', key: 'unidade', width: 10 },
    { header: 'Família', key: 'familia', width: 10 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Classificação', key: 'classificacao', width: 20 },
    { header: 'Análises Consecutivas', key: 'recorrencia', width: 22 },
  ];
  ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  for (const item of semFichas) {
    const qty = item.quantidade || 1;
    for (let unitIdx = 1; unitIdx <= qty; unitIdx++) {
      const unitKey = `${(item.ref || '').toUpperCase().trim()}|${unitIdx}`;
      const classif = classificacoesMap.get(unitKey);
      const recorr = recorrenciaMap.get(unitKey);
      ws1.addRow({
        ref: item.ref,
        unidade: qty > 1 ? `${unitIdx}/${qty}` : '-',
        familia: item.familia || '-',
        descricao: item.descricao,
        classificacao: classif ? CLASSIFICACAO_LABELS[classif] || classif : '-',
        recorrencia: recorr && recorr > 1 ? `${recorr} análises` : '-',
      });
    }
  }

  // --- Sheet 2: Com Fichas ---
  const ws2 = wb.addWorksheet('Com Fichas');
  ws2.columns = [
    { header: 'Referência', key: 'ref', width: 18 },
    { header: 'Família', key: 'familia', width: 10 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Qtd', key: 'quantidade', width: 8 },
    { header: 'N.º Fichas', key: 'totalFichas', width: 12 },
    { header: 'Fichas Associadas', key: 'fichasDetalhe', width: 50 },
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  for (const item of comFichas) {
    ws2.addRow({
      ref: item.ref,
      familia: item.familia || '-',
      descricao: item.descricao,
      quantidade: item.quantidade,
      totalFichas: item.totalFichas,
      fichasDetalhe: item.fichas?.map((f: any) => `${f.obrano} (${f.matricula} - ${f.marca} ${f.modelo})`).join('; ') || '',
    });
  }

  // Gerar buffer e converter para base64
  const buffer = await wb.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer as any).toString('base64');
  const filename = `controlo_stock_${nomeLoja.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  console.log(`[StockExcel] Ficheiro gerado: ${filename}, base64 length: ${base64.length}`);
  return { base64, filename };
}
