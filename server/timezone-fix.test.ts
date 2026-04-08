import { describe, it, expect } from 'vitest';

/**
 * Testes para verificar que a formatação de datas usa hora local (não UTC)
 * Bug: toISOString().split('T')[0] converte para UTC, causando desfasamento de -1 dia
 * em Portugal (UTC+1/UTC+2)
 */

// Função corrigida (mesma lógica usada no frontend e backend)
function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função antiga com bug
function formatDateUTC(d: Date): string {
  return d.toISOString().split('T')[0];
}

describe('Correcção de Timezone - formatDate', () => {
  it('deve formatar data correctamente com hora local', () => {
    const d = new Date(2026, 3, 7); // 7 de Abril 2026 (mês é 0-indexed)
    expect(formatDateLocal(d)).toBe('2026-04-07');
  });

  it('deve formatar correctamente o primeiro dia do mês', () => {
    const d = new Date(2026, 0, 1); // 1 de Janeiro 2026
    expect(formatDateLocal(d)).toBe('2026-01-01');
  });

  it('deve formatar correctamente o último dia do mês', () => {
    const d = new Date(2026, 1, 28); // 28 de Fevereiro 2026
    expect(formatDateLocal(d)).toBe('2026-02-28');
  });

  it('deve formatar correctamente datas com padding de zero', () => {
    const d = new Date(2026, 2, 5); // 5 de Março 2026
    expect(formatDateLocal(d)).toBe('2026-03-05');
  });

  it('deve manter a data correcta independentemente da hora', () => {
    // Simular uma data que em UTC seria o dia anterior
    // Ex: 7 de Abril 2026 às 00:30 em Portugal (UTC+1) = 6 de Abril 23:30 UTC
    const d = new Date(2026, 3, 7, 0, 30, 0); // 7 Abril 00:30 local
    expect(formatDateLocal(d)).toBe('2026-04-07');
    // A função antiga (UTC) poderia retornar '2026-04-06' dependendo do timezone
  });

  it('deve calcular correctamente o último dia do mês via new Date(ano, mes, 0)', () => {
    // Março 2026 tem 31 dias
    const udm = new Date(2026, 3, 0); // Último dia de Março
    expect(formatDateLocal(udm)).toBe('2026-03-31');
    
    // Fevereiro 2026 tem 28 dias
    const udm2 = new Date(2026, 2, 0); // Último dia de Fevereiro
    expect(formatDateLocal(udm2)).toBe('2026-02-28');
    
    // Abril 2026 tem 30 dias
    const udm3 = new Date(2026, 4, 0); // Último dia de Abril
    expect(formatDateLocal(udm3)).toBe('2026-04-30');
  });

  it('deve gerar datas da semana correctamente (getWeekDates)', () => {
    // Simular getWeekDates para segunda-feira 6 de Abril 2026
    function getWeekDates(baseDate: Date): Date[] {
      const monday = new Date(baseDate);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      });
    }
    
    const base = new Date(2026, 3, 8); // Quarta-feira 8 de Abril
    const weekDates = getWeekDates(base);
    
    // Deve começar na segunda-feira 6 de Abril
    expect(formatDateLocal(weekDates[0])).toBe('2026-04-06'); // Segunda
    expect(formatDateLocal(weekDates[1])).toBe('2026-04-07'); // Terça
    expect(formatDateLocal(weekDates[2])).toBe('2026-04-08'); // Quarta
    expect(formatDateLocal(weekDates[3])).toBe('2026-04-09'); // Quinta
    expect(formatDateLocal(weekDates[4])).toBe('2026-04-10'); // Sexta
    expect(formatDateLocal(weekDates[5])).toBe('2026-04-11'); // Sábado
  });

  it('deve formatar feriados correctamente (Carnaval, Sexta-Santa, Corpo de Deus)', () => {
    // Páscoa 2026 é 5 de Abril
    const pascoa = new Date(2026, 3, 5);
    
    const carnaval = new Date(pascoa);
    carnaval.setDate(pascoa.getDate() - 47);
    expect(formatDateLocal(carnaval)).toBe('2026-02-17'); // Carnaval 2026
    
    const sextaSanta = new Date(pascoa);
    sextaSanta.setDate(pascoa.getDate() - 2);
    expect(formatDateLocal(sextaSanta)).toBe('2026-04-03'); // Sexta-Santa 2026
    
    const corpoDeus = new Date(pascoa);
    corpoDeus.setDate(pascoa.getDate() + 60);
    expect(formatDateLocal(corpoDeus)).toBe('2026-06-04'); // Corpo de Deus 2026
  });
});
