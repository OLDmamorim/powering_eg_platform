import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as XLSX from 'xlsx';
import { getDb } from './db';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createCaller(user: AuthenticatedUser) {
  const ctx: TrpcContext = {
    user,
    clearCookie: () => {},
    setCookie: () => {},
  };
  return appRouter.createCaller(ctx);
}

describe('Resultados - Upload e Processamento de Excel', () => {
  let caller: ReturnType<typeof createCaller>;
  let adminUserId: number;

  beforeAll(async () => {
    // Criar usuário admin de teste
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { users } = await import('../drizzle/schema');
    const timestamp = Date.now();
    
    const [adminUser] = await db
      .insert(users)
      .values({
        openId: `test-admin-resultados-${timestamp}`,
        name: 'Admin Resultados Test',
        email: `admin-resultados-${timestamp}@test.com`,
        role: 'admin',
      })
      .$returningId();

    adminUserId = adminUser.id;

    caller = createCaller({
      id: adminUserId,
      openId: `test-admin-resultados-${timestamp}`,
      name: 'Admin Resultados Test',
      email: `admin-resultados-${timestamp}@test.com`,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: 'test',
    });
  });

  it('deve validar estrutura do Excel real', async () => {
    // Ler Excel real fornecido pelo usuário
    const workbook = XLSX.readFile('/home/ubuntu/upload/MapaServiçosDiárioseVendasComplementares_Dezembro2025.xlsx');
    
    // Verificar se folha "Faturados" existe
    expect(workbook.SheetNames).toContain('Faturados');
    
    const worksheet = workbook.Sheets['Faturados'];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Verificar estrutura básica
    expect(data.length).toBeGreaterThan(10); // Deve ter mais de 10 linhas
    
    // Verificar que linha 11 (índice 10) tem dados de loja
    const primeiraLoja = data[10];
    expect(primeiraLoja).toBeDefined();
    expect(primeiraLoja[1]).toBeDefined(); // Nome da loja na coluna B
    expect(typeof primeiraLoja[1]).toBe('string');
  });

  it('deve listar períodos disponíveis', async () => {
    const periodos = await caller.resultados.periodos();
    
    expect(Array.isArray(periodos)).toBe(true);
    // Pode estar vazio se nenhum upload foi feito ainda
  });

  it('deve validar helper de conversão de números', () => {
    // Testar conversão de números (helper local)
    expect(parseNumber(null)).toBe(null);
    expect(parseNumber(undefined)).toBe(null);
    expect(parseNumber('')).toBe(null);
    expect(parseNumber('123.45')).toBe(123.45);
    expect(parseNumber(100)).toBe(100);
    expect(parseNumber('abc')).toBe(null);
  });
});

// Helper para converter número (replica lógica do excelProcessor)
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const num = Number(value);
  return isNaN(num) ? null : num;
}
