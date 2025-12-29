import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Ordenação Alfabética de Lojas', () => {
  it('deve retornar todas as lojas ordenadas alfabeticamente', async () => {
    const lojas = await db.getAllLojas();
    
    expect(lojas).toBeDefined();
    expect(Array.isArray(lojas)).toBe(true);
    
    if (lojas.length > 1) {
      // Verificar se está ordenado alfabeticamente
      for (let i = 0; i < lojas.length - 1; i++) {
        const nomeAtual = lojas[i].nome.toLowerCase();
        const nomeProximo = lojas[i + 1].nome.toLowerCase();
        
        // nomeAtual deve vir antes ou ser igual a nomeProximo
        expect(nomeAtual.localeCompare(nomeProximo)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('deve retornar lojas de um gestor ordenadas alfabeticamente', async () => {
    // Buscar um gestor que tenha lojas
    const gestores = await db.getAllGestores();
    
    if (gestores.length === 0) {
      // Se não há gestores, pular teste
      return;
    }
    
    // Testar com o primeiro gestor
    const gestorId = gestores[0].id;
    const lojasGestor = await db.getLojasByGestorId(gestorId);
    
    expect(lojasGestor).toBeDefined();
    expect(Array.isArray(lojasGestor)).toBe(true);
    
    if (lojasGestor.length > 1) {
      // Verificar se está ordenado alfabeticamente
      for (let i = 0; i < lojasGestor.length - 1; i++) {
        const nomeAtual = lojasGestor[i].nome.toLowerCase();
        const nomeProximo = lojasGestor[i + 1].nome.toLowerCase();
        
        // nomeAtual deve vir antes ou ser igual a nomeProximo
        expect(nomeAtual.localeCompare(nomeProximo)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('deve manter ordenação alfabética após criar nova loja', async () => {
    // Criar uma loja com nome que deve ficar no meio da lista
    const novaLoja = await db.createLoja({
      nome: `Loja Teste Ordenação ${Date.now()}`,
      localizacao: 'Lisboa',
      contacto: '912345678',
      email: 'teste@example.com',
      gestorId: null,
    });
    
    expect(novaLoja).toBeDefined();
    expect(novaLoja.nome).toContain('Loja Teste Ordenação');
    
    // Buscar todas as lojas novamente
    const todasLojas = await db.getAllLojas();
    
    // Verificar ordenação
    if (todasLojas.length > 1) {
      for (let i = 0; i < todasLojas.length - 1; i++) {
        const nomeAtual = todasLojas[i].nome.toLowerCase();
        const nomeProximo = todasLojas[i + 1].nome.toLowerCase();
        
        expect(nomeAtual.localeCompare(nomeProximo)).toBeLessThanOrEqual(0);
      }
    }
  });
});
