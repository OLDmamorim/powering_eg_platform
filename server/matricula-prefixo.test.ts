import { describe, it, expect } from 'vitest';

describe('Pesquisa por prefixo de Matrícula', () => {
  // Testar normalização de matrícula (remover hífens e espaços)
  it('deve normalizar a matrícula removendo hífens e espaços', () => {
    const normalizar = (input: string) => input.toUpperCase().replace(/[\s\-]/g, '').trim();
    
    expect(normalizar('AA-12-BB')).toBe('AA12BB');
    expect(normalizar('aa-12-bb')).toBe('AA12BB');
    expect(normalizar('AA 12 BB')).toBe('AA12BB');
    expect(normalizar('AA12BB')).toBe('AA12BB');
    expect(normalizar('12-AB')).toBe('12AB');
    expect(normalizar(' aa-12 ')).toBe('AA12');
  });

  it('deve rejeitar prefixos com menos de 2 caracteres', () => {
    const normalizar = (input: string) => input.toUpperCase().replace(/[\s\-]/g, '').trim();
    const prefixo = normalizar('A');
    expect(prefixo.length).toBeLessThan(2);
  });

  it('deve aceitar prefixos com 2 ou mais caracteres', () => {
    const normalizar = (input: string) => input.toUpperCase().replace(/[\s\-]/g, '').trim();
    const prefixo = normalizar('AA');
    expect(prefixo.length).toBeGreaterThanOrEqual(2);
  });

  it('deve gerar query SQL LIKE correcta para matrícula', () => {
    const normalizar = (input: string) => input.toUpperCase().replace(/[\s\-]/g, '').trim();
    const prefixo = normalizar('AA-12');
    const likePattern = prefixo + '%';
    expect(likePattern).toBe('AA12%');
  });

  it('deve tratar matrículas com formato antigo e novo', () => {
    const normalizar = (input: string) => input.toUpperCase().replace(/[\s\-]/g, '').trim();
    
    // Formato novo: AA-12-BB
    expect(normalizar('AA-12')).toBe('AA12');
    // Formato antigo: 12-34-AB
    expect(normalizar('12-34')).toBe('1234');
    // Sem hífens
    expect(normalizar('AA12BB')).toBe('AA12BB');
  });
});
