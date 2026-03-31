import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para a lógica de formatação de férias no contexto do chatbot.
 * Formato real da BD: chaves são 'mes-dia' (ex: '5-7' = 7 de maio), valores são 'approved'/'rejected'/'holiday'/'weekend'
 */

// Função auxiliar: extrair datas por estado do mapa de dias (formato real da BD)
function extrairDatas(dias: Record<string, string>, ano: number, estado: string): Date[] {
  const datas: Date[] = [];
  for (const [chave, valor] of Object.entries(dias)) {
    const partes = chave.split('-');
    if (partes.length === 2) {
      const mes = parseInt(partes[0]);
      const dia = parseInt(partes[1]);
      if (!isNaN(mes) && !isNaN(dia) && valor === estado) {
        datas.push(new Date(ano, mes - 1, dia));
      }
    }
  }
  return datas;
}

// Função auxiliar: agrupar datas contínuas em períodos legíveis
function agruparPeriodos(datas: Date[]): string[] {
  if (datas.length === 0) return [];
  datas.sort((a, b) => a.getTime() - b.getTime());
  const periodos: string[] = [];
  let inicio = datas[0];
  let anterior = datas[0];
  
  for (let i = 1; i <= datas.length; i++) {
    if (i < datas.length) {
      const diff = (datas[i].getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 1.5) { anterior = datas[i]; continue; }
    }
    const fmtInicio = `${inicio.getDate()}/${inicio.getMonth() + 1}`;
    const fmtFim = `${anterior.getDate()}/${anterior.getMonth() + 1}`;
    periodos.push(inicio.getTime() === anterior.getTime() ? fmtInicio : `${fmtInicio} a ${fmtFim}`);
    if (i < datas.length) { inicio = datas[i]; anterior = datas[i]; }
  }
  return periodos;
}

describe('extrairDatas - formato real BD (mes-dia)', () => {
  it('deve extrair datas approved corretamente', () => {
    const dias: Record<string, string> = {
      '2-12': 'approved',
      '5-7': 'rejected',
      '1-1': 'holiday',
      '1-10': 'weekend',
    };
    
    const datas = extrairDatas(dias, 2026, 'approved');
    expect(datas).toHaveLength(1);
    expect(datas[0].getDate()).toBe(12);
    expect(datas[0].getMonth()).toBe(1); // Fevereiro (0-indexed)
  });
  
  it('deve extrair datas rejected corretamente', () => {
    const dias: Record<string, string> = {
      '5-7': 'rejected',
      '5-8': 'rejected',
      '5-11': 'rejected',
      '5-12': 'rejected',
      '5-13': 'rejected',
      '2-12': 'approved',
    };
    
    const datas = extrairDatas(dias, 2026, 'rejected');
    expect(datas).toHaveLength(5);
  });
  
  it('deve ignorar holidays e weekends', () => {
    const dias: Record<string, string> = {
      '1-1': 'holiday',
      '1-10': 'weekend',
      '1-11': 'weekend',
      '5-7': 'rejected',
    };
    
    const datasApproved = extrairDatas(dias, 2026, 'approved');
    expect(datasApproved).toHaveLength(0);
  });
});

describe('agruparPeriodos', () => {
  it('deve agrupar dias consecutivos num único período', () => {
    const datas = [
      new Date(2026, 4, 7),  // 7/5
      new Date(2026, 4, 8),  // 8/5
    ];
    
    const periodos = agruparPeriodos(datas);
    expect(periodos).toHaveLength(1);
    expect(periodos[0]).toBe('7/5 a 8/5');
  });
  
  it('deve separar períodos não consecutivos', () => {
    const datas = [
      new Date(2026, 4, 7),   // 7/5
      new Date(2026, 4, 8),   // 8/5
      new Date(2026, 4, 11),  // 11/5
      new Date(2026, 4, 12),  // 12/5
      new Date(2026, 4, 13),  // 13/5
    ];
    
    const periodos = agruparPeriodos(datas);
    expect(periodos).toHaveLength(2);
    expect(periodos[0]).toBe('7/5 a 8/5');
    expect(periodos[1]).toBe('11/5 a 13/5');
  });
  
  it('deve mostrar dia único sem intervalo', () => {
    const datas = [new Date(2026, 10, 2)]; // 2/11
    
    const periodos = agruparPeriodos(datas);
    expect(periodos).toHaveLength(1);
    expect(periodos[0]).toBe('2/11');
  });
  
  it('deve retornar array vazio se não houver datas', () => {
    const periodos = agruparPeriodos([]);
    expect(periodos).toHaveLength(0);
  });
});

describe('Caso real: Ana Filipa Campos Moreira', () => {
  it('deve extrair correctamente os períodos por aprovar da Ana Filipa', () => {
    // Dados reais da BD (parcial)
    const dias: Record<string, string> = {
      '1-1': 'holiday', '1-10': 'weekend', '1-11': 'weekend',
      '2-12': 'approved',
      '5-7': 'rejected', '5-8': 'rejected',
      '5-11': 'rejected', '5-12': 'rejected', '5-13': 'rejected',
      '6-22': 'rejected', '6-23': 'rejected', '6-24': 'rejected', '6-25': 'rejected', '6-26': 'rejected',
      '8-3': 'rejected', '8-4': 'rejected', '8-5': 'rejected', '8-6': 'rejected', '8-7': 'rejected',
      '8-10': 'rejected', '8-11': 'rejected', '8-12': 'rejected', '8-13': 'rejected', '8-14': 'rejected',
      '11-2': 'rejected',
    };
    
    const datasPorAprovar = extrairDatas(dias, 2026, 'rejected');
    expect(datasPorAprovar).toHaveLength(21);
    
    const periodos = agruparPeriodos(datasPorAprovar);
    expect(periodos).toHaveLength(6);
    expect(periodos[0]).toBe('7/5 a 8/5');
    expect(periodos[1]).toBe('11/5 a 13/5');
    expect(periodos[2]).toBe('22/6 a 26/6');
    expect(periodos[3]).toBe('3/8 a 7/8');
    expect(periodos[4]).toBe('10/8 a 14/8');
    expect(periodos[5]).toBe('2/11');
    
    const datasAprovadas = extrairDatas(dias, 2026, 'approved');
    expect(datasAprovadas).toHaveLength(1);
    
    const periodosAprovados = agruparPeriodos(datasAprovadas);
    expect(periodosAprovados).toHaveLength(1);
    expect(periodosAprovados[0]).toBe('12/2');
  });
});

describe('Agrupamento de férias por loja', () => {
  it('deve agrupar colaboradores por loja corretamente', () => {
    const dadosFerias = [
      { nome: 'João Silva', loja: 'Barcelos', totalAprovados: 15, totalNaoAprovados: 7 },
      { nome: 'Maria Santos', loja: 'Barcelos', totalAprovados: 22, totalNaoAprovados: 0 },
      { nome: 'Pedro Costa', loja: 'Braga', totalAprovados: 10, totalNaoAprovados: 12 },
    ];
    
    const feriasPorLoja: Record<string, any[]> = {};
    dadosFerias.forEach(f => {
      if (!feriasPorLoja[f.loja]) feriasPorLoja[f.loja] = [];
      feriasPorLoja[f.loja].push(f);
    });
    
    expect(Object.keys(feriasPorLoja)).toHaveLength(2);
    expect(feriasPorLoja['Barcelos']).toHaveLength(2);
    expect(feriasPorLoja['Braga']).toHaveLength(1);
  });
  
  it('deve calcular totais por loja corretamente', () => {
    const colaboradores = [
      { totalAprovados: 15, totalNaoAprovados: 7 },
      { totalAprovados: 22, totalNaoAprovados: 0 },
    ];
    
    const totalAprovados = colaboradores.reduce((sum, c) => sum + (c.totalAprovados || 0), 0);
    const totalPorAprovar = colaboradores.reduce((sum, c) => sum + (c.totalNaoAprovados || 0), 0);
    
    expect(totalAprovados).toBe(37);
    expect(totalPorAprovar).toBe(7);
  });
});
