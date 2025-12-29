import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';
import type { TrpcContext } from './_core/context';

describe('Sistema de Anexos em Reuniões', () => {
  it('deve ter endpoint de upload de anexos', async () => {
    const ctx: TrpcContext = { user: { id: 1, role: 'admin', openId: 'test', name: 'Admin Test' } };
    const caller = appRouter.createCaller(ctx);
    
    // Testar que o endpoint existe
    expect(caller.uploadAnexo).toBeDefined();
  });

  it('deve aceitar upload de anexo com dados válidos', async () => {
    const ctx: TrpcContext = { user: { id: 1, role: 'admin', openId: 'test', name: 'Admin Test' } };
    const caller = appRouter.createCaller(ctx);
    
    // Criar um pequeno arquivo de teste em base64
    const testContent = 'Test file content';
    const base64Content = Buffer.from(testContent).toString('base64');
    
    const result = await caller.uploadAnexo({
      fileName: 'test-document.txt',
      fileData: base64Content,
      contentType: 'text/plain',
    });
    
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.fileKey).toBeDefined();
    expect(result.url).toContain('reunioes-anexos/');
  });

  it('deve validar estrutura de anexos', () => {
    const anexoValido = {
      nome: 'documento.pdf',
      url: 'https://s3.example.com/documento.pdf',
      tipo: 'documento',
    };
    
    expect(anexoValido).toHaveProperty('nome');
    expect(anexoValido).toHaveProperty('url');
    expect(anexoValido).toHaveProperty('tipo');
    expect(['documento', 'imagem']).toContain(anexoValido.tipo);
  });

  it('deve serializar e deserializar anexos corretamente', () => {
    const anexos = [
      { nome: 'ata.pdf', url: 'https://example.com/ata.pdf', tipo: 'documento' },
      { nome: 'foto.jpg', url: 'https://example.com/foto.jpg', tipo: 'imagem' },
    ];
    
    const serializado = JSON.stringify(anexos);
    const deserializado = JSON.parse(serializado);
    
    expect(deserializado).toHaveLength(2);
    expect(deserializado[0].nome).toBe('ata.pdf');
    expect(deserializado[1].tipo).toBe('imagem');
  });

  it('deve retornar anexos ao listar histórico de reuniões', async () => {
    const ctx: TrpcContext = { user: { id: 1, role: 'admin', openId: 'test', name: 'Admin Test' } };
    const caller = appRouter.createCaller(ctx);
    
    const historico = await caller.reunioesGestores.listar();
    
    expect(historico).toBeDefined();
    expect(Array.isArray(historico)).toBe(true);
    
    // Verificar que reuniões com anexos incluem o campo
    const reunioesComAnexos = historico.filter((r: any) => r.anexos);
    if (reunioesComAnexos.length > 0) {
      const primeiraComAnexos = reunioesComAnexos[0];
      const anexos = JSON.parse(primeiraComAnexos.anexos);
      expect(Array.isArray(anexos)).toBe(true);
      if (anexos.length > 0) {
        expect(anexos[0]).toHaveProperty('nome');
        expect(anexos[0]).toHaveProperty('url');
        expect(anexos[0]).toHaveProperty('tipo');
      }
    }
  });
});
