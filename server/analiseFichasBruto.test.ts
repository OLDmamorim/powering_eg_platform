import { describe, it, expect, vi } from 'vitest';
import XLSX from 'xlsx';

describe('processarFicheiroExcel - Ficheiro Bruto', () => {
  it('deve detectar ficheiro bruto e calcular colunas em falta', async () => {
    const { processarFicheiroExcel } = await import('./analiseFichasService');
    
    // Criar um ficheiro Excel bruto simulado (sem colunas lojas, gestor, coordenador)
    // Formato real do PHC: nmdos = "Ficha Servico XX" onde XX é o número da loja
    const wb = XLSX.utils.book_new();
    const data = [
      // Cabeçalhos do ficheiro bruto (PHC)
      ['bostamp', 'nmdos', 'obrano', 'matricula', 'dataobra', 'dataserviço', 'hora_inicio', 'hora_fim', 'status', 'obs', 'email', 'segurado', 'marca', 'modelo', 'ref', 'eurocode', 'nrfactura', 'seriefcatura', 'nrsinistro', 'armazem', 'fechado', 'detalhe_danos', 'u_contsega', 'nome', 'ultima_nota', 'u_dtent'],
      // Linha de dados simulada - nmdos no formato real "Ficha Servico 38"
      ['stamp1', 'Ficha Servico 38', 1001, 'AA-00-BB', '2025-03-01', '2025-03-10', '09:00', '10:00', 'Autorizado Sem Dados', '', 'test@test.com', 'Segurado1', 'BMW', 'Serie 3', 'REF001', 'EC001', 0, '', 'SIN001', 38, false, '', '912345678', 'Nome1', '--- 15.03.2025 10:00:00 ADMIN --- Nota de teste', ''],
      // Outra linha com status excluído
      ['stamp2', 'Ficha Servico 54', 1002, 'CC-11-DD', '2025-03-05', '', '09:00', '10:00', 'Serviço Pronto', '', '', '', 'Audi', 'A4', '', '', 0, '', '', 54, false, '', '', 'Nome2', '', ''],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xls' });
    
    // Criar matriz de lojas para o teste (número loja -> info)
    const matrizLojas = new Map<number, { nomeLoja: string; gestor: string; coordenador: string }>();
    matrizLojas.set(38, { nomeLoja: 'Braga', gestor: 'Marco Amorim', coordenador: 'Coord SM' });
    matrizLojas.set(54, { nomeLoja: 'Guimarães', gestor: 'Marco Amorim', coordenador: 'Coord SM' });
    
    const resultado = await processarFicheiroExcel(buffer, matrizLojas);
    
    // Deve ter 1 ficha na análise (Autorizado Sem Dados) e 1 excluída (Serviço Pronto)
    expect(resultado.fichas.length).toBe(1);
    expect(resultado.fichasExcluidas.length).toBe(1);
    
    // Verificar que a ficha foi enriquecida com dados da Matriz
    const ficha = resultado.fichas[0];
    expect(ficha.loja).toBe('Braga');
    expect(ficha.gestor).toBe('Marco Amorim');
    expect(ficha.coordenador).toBe('Coord SM');
    
    // Verificar que dias aberto foi calculado (deve ser > 0 pois dataObra é 2025-03-01)
    expect(ficha.diasAberto).toBeGreaterThan(0);
    
    // Verificar que a data da nota foi extraída correctamente
    expect(ficha.dataNota).toBeTruthy();
    expect(ficha.diasNota).toBeGreaterThan(0);
  });

  it('deve processar ficheiro com macros (formato antigo) sem alterações', async () => {
    const { processarFicheiroExcel } = await import('./analiseFichasService');
    
    // Criar um ficheiro Excel com macros simulado (com colunas lojas, gestor, etc.)
    const wb = XLSX.utils.book_new();
    const data = [
      ['bostamp', 'nmdos', 'lojas', 'gestor', 'coordenador', 'obrano', 'matricula', 'dataobra', 'nº dias aberto:', 'dataserviço', 'nº dias executado', 'hora_inicio', 'hora_fim', 'status', 'dta nota', 'dias nota:', 'obs', 'email', 'segurado', 'marca', 'modelo', 'ref', 'eurocode', 'nrfactura', 'seriefcatura', 'nrsinistro', 'armazem', 'fechado', 'detalhe_danos', 'u_contsega', 'nome'],
      ['stamp1', 'Ficha Servico 38', 'Braga', 'Marco Amorim', 'Coord1', 1001, 'AA-00-BB', '2025-03-01', 389, '2025-03-10', 380, '09:00', '10:00', 'Autorizado Sem Dados', '2025-03-15', 375, 'Nota de teste', 'test@test.com', 'Segurado1', 'BMW', 'Serie 3', 'REF001', 'EC001', 0, '', 'SIN001', 38, false, '', '912345678', 'Nome1'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Base');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    const resultado = await processarFicheiroExcel(buffer);
    
    expect(resultado.fichas.length).toBe(1);
    
    const ficha = resultado.fichas[0];
    expect(ficha.loja).toBe('Braga');
    expect(ficha.gestor).toBe('Marco Amorim');
    expect(ficha.diasAberto).toBe(389);
    expect(ficha.diasNota).toBe(375);
  });

  it('deve detectar correctamente ficheiro bruto vs macros', async () => {
    const { processarFicheiroExcel } = await import('./analiseFichasService');
    
    // Ficheiro bruto com 1 ficha para verificar detecção
    const wbBruto = XLSX.utils.book_new();
    const dataBruto = [
      ['bostamp', 'nmdos', 'obrano', 'matricula', 'dataobra', 'dataserviço', 'hora_inicio', 'hora_fim', 'status', 'obs', 'email', 'segurado', 'marca', 'modelo', 'ref', 'eurocode', 'nrfactura', 'seriefcatura', 'nrsinistro', 'armazem', 'fechado', 'detalhe_danos', 'u_contsega', 'nome', 'ultima_nota', 'u_dtent'],
      ['stamp1', 'Ficha Servico 38', 1001, 'AA-00-BB', '2025-03-01', '2025-03-10', '09:00', '10:00', 'AUTORIZADO', '', '', '', 'BMW', 'Serie 3', '', '', 0, '', '', 38, false, '', '', 'Nome1', '', ''],
    ];
    const wsBruto = XLSX.utils.aoa_to_sheet(dataBruto);
    XLSX.utils.book_append_sheet(wbBruto, wsBruto, 'Sheet1');
    const bufferBruto = XLSX.write(wbBruto, { type: 'buffer', bookType: 'xls' });
    
    const resultadoBruto = await processarFicheiroExcel(bufferBruto);
    // Deve ter fichas e não dar erro
    expect(resultadoBruto.fichas).toBeDefined();
    expect(resultadoBruto.fichasExcluidas).toBeDefined();
    expect(resultadoBruto.fichas.length + resultadoBruto.fichasExcluidas.length).toBeGreaterThanOrEqual(1);
  });
});
