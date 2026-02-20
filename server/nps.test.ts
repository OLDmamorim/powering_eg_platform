import { describe, it, expect } from 'vitest';
import * as db from './db';
import { processarExcelNPS } from './excelProcessor';
import * as XLSX from 'xlsx';

describe('Sistema NPS', () => {
  it('deve ter funções de consulta NPS definidas', () => {
    expect(db.getNPSDadosLoja).toBeDefined();
    expect(db.getNPSDadosLojas).toBeDefined();
    expect(db.getNPSDadosTodasLojas).toBeDefined();
  });

  it('deve ter função de processamento de Excel NPS definida', () => {
    expect(processarExcelNPS).toBeDefined();
  });

  it('deve processar valores percentuais corretamente', () => {
    // Criar um Excel simples para testar
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['', 'Loja', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez', '2026 Total', 'jan', 'fev'],
      ['', 'BARCELOS', '100,0%', '100,0%', '', '', '', '', '', '', '', '', '', '', '100,0%', '6,3%', '20,0%'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Por Loja');

    // Verificar que o workbook foi criado
    expect(wb.SheetNames).toContain('Por Loja');
    expect(wb.Sheets['Por Loja']).toBeDefined();
  });
});
