import { describe, it, expect } from 'vitest';

/**
 * Testes para verificar que a regra de elegibilidade NPS é OU (basta UM critério)
 * e não E (ambos obrigatórios).
 * 
 * Regra actual: NPS >= 80% OU Taxa de Resposta >= 7.5% → Elegível
 * Só NÃO elegível se NPS < 80% E Taxa < 7.5% (não cumpre nenhum)
 */

// Simular a lógica de elegibilidade usada em chatbotService.ts, chatbotServicePortais.ts, routers.ts e aiService.ts
function verificarElegibilidade(npsDecimal: number, taxaDecimal: number): { elegivel: boolean; motivo: string } {
  const npsOk = npsDecimal >= 0.80;
  const taxaOk = taxaDecimal >= 0.075;
  const elegivel = npsOk || taxaOk;
  
  let motivo = '';
  if (!elegivel) {
    motivo = 'NPS e Taxa abaixo dos mínimos - não cumpre nenhum critério';
  } else if (npsOk && taxaOk) {
    motivo = 'cumpre ambos';
  } else if (npsOk) {
    motivo = 'cumpre NPS';
  } else {
    motivo = 'cumpre Taxa Resposta';
  }
  
  return { elegivel, motivo };
}

// Simular a lógica usada no routers.ts (valores em percentagem)
function verificarElegibilidadePercent(npsPercent: number, taxaPercent: number): boolean {
  return npsPercent >= 80 || taxaPercent >= 7.5;
}

// Simular a lógica usada no aiService.ts (valores em percentagem)
function verificarElegibilidadeAI(npsMedia: number, taxaMedia: number): { elegivel: boolean; motivo: string } {
  const elegivel = npsMedia >= 80 || taxaMedia >= 7.5;
  let motivo = '';
  if (!elegivel) {
    motivo = 'NPS < 80% e Taxa < 7.5% (não cumpre nenhum critério)';
  }
  return { elegivel, motivo };
}

describe('NPS Elegibilidade - Regra OU (basta UM critério)', () => {
  
  it('deve ser elegível quando AMBOS os critérios são cumpridos', () => {
    const result = verificarElegibilidade(0.85, 0.10);
    expect(result.elegivel).toBe(true);
    expect(result.motivo).toBe('cumpre ambos');
  });

  it('deve ser elegível quando APENAS NPS >= 80% (taxa abaixo)', () => {
    const result = verificarElegibilidade(0.85, 0.05); // NPS 85%, Taxa 5% (< 7.5%)
    expect(result.elegivel).toBe(true);
    expect(result.motivo).toBe('cumpre NPS');
  });

  it('deve ser elegível quando APENAS Taxa >= 7.5% (NPS abaixo)', () => {
    const result = verificarElegibilidade(0.70, 0.10); // NPS 70% (< 80%), Taxa 10%
    expect(result.elegivel).toBe(true);
    expect(result.motivo).toBe('cumpre Taxa Resposta');
  });

  it('NÃO deve ser elegível quando NENHUM critério é cumprido', () => {
    const result = verificarElegibilidade(0.60, 0.05); // NPS 60% (< 80%), Taxa 5% (< 7.5%)
    expect(result.elegivel).toBe(false);
    expect(result.motivo).toContain('não cumpre nenhum');
  });

  it('deve ser elegível no limite exacto de NPS 80% (taxa abaixo)', () => {
    const result = verificarElegibilidade(0.80, 0.05);
    expect(result.elegivel).toBe(true);
  });

  it('deve ser elegível no limite exacto de Taxa 7.5% (NPS abaixo)', () => {
    const result = verificarElegibilidade(0.70, 0.075);
    expect(result.elegivel).toBe(true);
  });

  it('NÃO deve ser elegível quando NPS é 79% e Taxa é 7.4%', () => {
    const result = verificarElegibilidade(0.79, 0.074);
    expect(result.elegivel).toBe(false);
  });
});

describe('NPS Elegibilidade - Lógica routers.ts (percentagem)', () => {
  
  it('deve ser elegível com NPS 85% e Taxa 5%', () => {
    expect(verificarElegibilidadePercent(85, 5)).toBe(true);
  });

  it('deve ser elegível com NPS 70% e Taxa 10%', () => {
    expect(verificarElegibilidadePercent(70, 10)).toBe(true);
  });

  it('NÃO deve ser elegível com NPS 70% e Taxa 5%', () => {
    expect(verificarElegibilidadePercent(70, 5)).toBe(false);
  });
});

describe('NPS Elegibilidade - Lógica aiService.ts', () => {
  
  it('deve ser elegível com NPS 90% e Taxa 3%', () => {
    const result = verificarElegibilidadeAI(90, 3);
    expect(result.elegivel).toBe(true);
    expect(result.motivo).toBe('');
  });

  it('deve ser elegível com NPS 50% e Taxa 10%', () => {
    const result = verificarElegibilidadeAI(50, 10);
    expect(result.elegivel).toBe(true);
  });

  it('NÃO deve ser elegível com NPS 50% e Taxa 3%', () => {
    const result = verificarElegibilidadeAI(50, 3);
    expect(result.elegivel).toBe(false);
    expect(result.motivo).toContain('não cumpre nenhum');
  });
});
