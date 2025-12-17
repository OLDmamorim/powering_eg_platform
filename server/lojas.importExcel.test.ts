import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as XLSX from 'xlsx';

describe('lojas.importExcel', () => {
  let caller: any;

  beforeAll(async () => {
    // Mock admin user context
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Admin Test',
        email: 'admin@test.com',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });
  });

  it('deve importar lojas válidas de ficheiro Excel', async () => {
    // Criar ficheiro Excel de teste
    const data = [
      { Nome: 'Loja Teste 1', Localização: 'Porto', Email: 'teste1@example.com' },
      { Nome: 'Loja Teste 2', Localização: 'Lisboa', Email: 'teste2@example.com' },
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lojas');
    
    // Converter para buffer e depois para base64
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = buffer.toString('base64');

    const result = await caller.lojas.importExcel({ base64Data });

    expect(result.importadas).toBe(2);
    expect(result.erros).toHaveLength(0);
  });

  it('deve rejeitar linhas sem nome', async () => {
    const data = [
      { Nome: 'Loja Válida', Email: 'valida@example.com' },
      { Nome: '', Email: 'invalida@example.com' }, // Nome vazio
      { Email: 'sem-nome@example.com' }, // Sem campo Nome
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lojas');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = buffer.toString('base64');

    const result = await caller.lojas.importExcel({ base64Data });

    expect(result.importadas).toBe(1); // Apenas 1 válida
    expect(result.erros).toHaveLength(2); // 2 inválidas
    expect(result.erros[0].motivo).toBe('Nome é obrigatório');
  });

  it('deve validar emails inválidos', async () => {
    const data = [
      { Nome: 'Loja 1', Email: 'email-invalido' }, // Email sem @
      { Nome: 'Loja 2', Email: 'valido@example.com' },
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lojas');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = buffer.toString('base64');

    const result = await caller.lojas.importExcel({ base64Data });

    expect(result.importadas).toBe(1);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].motivo).toBe('Email inválido');
  });

  it('deve aceitar lojas sem email (campo opcional)', async () => {
    const data = [
      { Nome: 'Loja Sem Email', Localização: 'Braga' },
      { Nome: 'Loja Com Email', Email: 'com-email@example.com' },
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lojas');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = buffer.toString('base64');

    const result = await caller.lojas.importExcel({ base64Data });

    expect(result.importadas).toBe(2);
    expect(result.erros).toHaveLength(0);
  });

  it('deve processar ficheiro grande (10+ lojas)', async () => {
    const data = Array.from({ length: 15 }, (_, i) => ({
      Nome: `Loja ${i + 1}`,
      Localização: `Cidade ${i + 1}`,
      Email: `loja${i + 1}@example.com`,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lojas');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64Data = buffer.toString('base64');

    const result = await caller.lojas.importExcel({ base64Data });

    expect(result.importadas).toBe(15);
    expect(result.erros).toHaveLength(0);
  });
});
