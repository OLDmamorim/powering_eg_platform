import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para a lógica de formatação de férias no contexto do chatbot.
 * Testa a conversão de dia do ano para data legível e a extração de períodos.
 */

// Função auxiliar: converter dia do ano para data legível (replicada do chatbotService)
function diaParaData(diaAno: number, ano: number): string {
  const d = new Date(ano, 0, diaAno);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// Função auxiliar: extrair períodos de férias de um mapa de dias
function extrairPeriodos(dias: Record<string, string>, ano: number, estado: string): string[] {
  const periodos: string[] = [];
  let inicio: number | null = null;
  const totalDias = (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? 366 : 365;
  
  for (let d = 1; d <= totalDias; d++) {
    const estadoDia = dias[String(d)];
    if (estadoDia === estado) {
      if (inicio === null) inicio = d;
    } else {
      if (inicio !== null) {
        const fim = d - 1;
        periodos.push(inicio === fim ? diaParaData(inicio, ano) : `${diaParaData(inicio, ano)}-${diaParaData(fim, ano)}`);
        inicio = null;
      }
    }
  }
  if (inicio !== null) {
    periodos.push(inicio === totalDias ? diaParaData(inicio, ano) : `${diaParaData(inicio, ano)}-${diaParaData(totalDias, ano)}`);
  }
  
  return periodos;
}

describe('diaParaData', () => {
  it('deve converter dia 1 do ano para 1/1', () => {
    expect(diaParaData(1, 2026)).toBe('1/1');
  });
  
  it('deve converter dia 32 para 1/2 (1 de fevereiro)', () => {
    expect(diaParaData(32, 2026)).toBe('1/2');
  });
  
  it('deve converter dia 182 para data correta em 2026', () => {
    // Dia 182 de 2026 = 1 de julho
    const result = diaParaData(182, 2026);
    expect(result).toBe('1/7');
  });
  
  it('deve converter dia 365 para 31/12 em ano não bissexto', () => {
    expect(diaParaData(365, 2026)).toBe('31/12');
  });
  
  it('deve converter dia 366 para 31/12 em ano bissexto', () => {
    expect(diaParaData(366, 2024)).toBe('31/12');
  });
});

describe('extrairPeriodos', () => {
  it('deve extrair período contínuo de férias aprovadas', () => {
    const dias: Record<string, string> = {};
    // Dias 182-191 (1 jul - 10 jul) aprovados
    for (let d = 182; d <= 191; d++) {
      dias[String(d)] = 'aprovado';
    }
    
    const periodos = extrairPeriodos(dias, 2026, 'aprovado');
    expect(periodos).toHaveLength(1);
    expect(periodos[0]).toBe('1/7-10/7');
  });
  
  it('deve extrair múltiplos períodos separados', () => {
    const dias: Record<string, string> = {};
    // Período 1: dias 1-5 (1-5 jan)
    for (let d = 1; d <= 5; d++) {
      dias[String(d)] = 'aprovado';
    }
    // Período 2: dias 182-186 (1-5 jul)
    for (let d = 182; d <= 186; d++) {
      dias[String(d)] = 'aprovado';
    }
    
    const periodos = extrairPeriodos(dias, 2026, 'aprovado');
    expect(periodos).toHaveLength(2);
    expect(periodos[0]).toBe('1/1-5/1');
    expect(periodos[1]).toBe('1/7-5/7');
  });
  
  it('deve extrair dia único como data simples', () => {
    const dias: Record<string, string> = {};
    dias['100'] = 'aprovado';
    
    const periodos = extrairPeriodos(dias, 2026, 'aprovado');
    expect(periodos).toHaveLength(1);
    // Dia 100 de 2026 = 10 de abril
    expect(periodos[0]).toBe('10/4');
  });
  
  it('deve retornar array vazio se não houver dias com o estado', () => {
    const dias: Record<string, string> = {};
    dias['100'] = 'nao_aprovado';
    
    const periodos = extrairPeriodos(dias, 2026, 'aprovado');
    expect(periodos).toHaveLength(0);
  });
  
  it('deve extrair férias por aprovar separadamente', () => {
    const dias: Record<string, string> = {};
    // Aprovados: dias 1-5
    for (let d = 1; d <= 5; d++) {
      dias[String(d)] = 'aprovado';
    }
    // Por aprovar: dias 182-186
    for (let d = 182; d <= 186; d++) {
      dias[String(d)] = 'nao_aprovado';
    }
    
    const periodosAprovados = extrairPeriodos(dias, 2026, 'aprovado');
    const periodosPorAprovar = extrairPeriodos(dias, 2026, 'nao_aprovado');
    
    expect(periodosAprovados).toHaveLength(1);
    expect(periodosPorAprovar).toHaveLength(1);
    expect(periodosAprovados[0]).toBe('1/1-5/1');
    expect(periodosPorAprovar[0]).toBe('1/7-5/7');
  });
  
  it('deve lidar com período que vai até ao final do ano', () => {
    const dias: Record<string, string> = {};
    // Dias 360-365 aprovados (final do ano)
    for (let d = 360; d <= 365; d++) {
      dias[String(d)] = 'aprovado';
    }
    
    const periodos = extrairPeriodos(dias, 2026, 'aprovado');
    expect(periodos).toHaveLength(1);
    expect(periodos[0]).toBe('26/12-31/12');
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
