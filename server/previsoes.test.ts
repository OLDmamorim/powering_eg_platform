import { describe, it, expect } from 'vitest';
import { 
  getPrevisoesAtivas, 
  criarPrevisao, 
  atualizarEstadoPrevisao,
  getAtividadesRecentes,
  registarAtividade,
  getAllLojas,
  getDb
} from './db';
import { previsoes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Previsões Database Functions', () => {
  it('should create and retrieve a previsão', async () => {
    // Obter uma loja existente
    const lojas = await getAllLojas();
    if (lojas.length === 0) {
      console.log('No lojas found, skipping test');
      return;
    }

    const testLoja = lojas[0];
    
    // Criar uma previsão de teste
    const validaAte = new Date();
    validaAte.setDate(validaAte.getDate() + 7);
    
    const result = await criarPrevisao({
      lojaId: testLoja.id,
      tipo: 'sem_visita_prolongada',
      descricao: 'Teste: Loja sem visita há muito tempo',
      probabilidade: 80,
      sugestaoAcao: 'Agendar visita urgente',
      validaAte,
    });

    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);

    // Verificar que a previsão foi criada
    const previsoesAtivas = await getPrevisoesAtivas();
    const previsaoCriada = previsoesAtivas.find(p => p.id === result.id);
    
    expect(previsaoCriada).toBeDefined();
    expect(previsaoCriada?.tipo).toBe('sem_visita_prolongada');
    expect(previsaoCriada?.probabilidade).toBe(80);

    // Cleanup: remover a previsão de teste
    const db = await getDb();
    if (db) {
      await db.delete(previsoes).where(eq(previsoes.id, result.id));
    }
  });

  it('should update previsão estado', async () => {
    // Obter uma loja existente
    const lojas = await getAllLojas();
    if (lojas.length === 0) {
      console.log('No lojas found, skipping test');
      return;
    }

    const testLoja = lojas[0];
    
    // Criar uma previsão de teste
    const result = await criarPrevisao({
      lojaId: testLoja.id,
      tipo: 'risco_pendentes',
      descricao: 'Teste: Risco de acumular pendentes',
      probabilidade: 60,
    });

    // Atualizar estado para 'confirmada'
    await atualizarEstadoPrevisao(result.id, 'confirmada');

    // Verificar que o estado foi atualizado (não deve aparecer nas ativas)
    const previsoesAtivas = await getPrevisoesAtivas();
    const previsaoAtualizada = previsoesAtivas.find(p => p.id === result.id);
    
    // Não deve estar nas ativas porque foi confirmada
    expect(previsaoAtualizada).toBeUndefined();

    // Cleanup
    const db = await getDb();
    if (db) {
      await db.delete(previsoes).where(eq(previsoes.id, result.id));
    }
  });
});

describe('Atividades Database Functions', () => {
  it('should register and retrieve activities', async () => {
    // Registar uma atividade de teste
    await registarAtividade({
      tipo: 'loja_criada',
      descricao: 'Teste: Nova loja criada para teste',
      metadata: { teste: true },
    });

    // Obter atividades recentes
    const atividades = await getAtividadesRecentes(10);
    
    expect(atividades).toBeDefined();
    expect(Array.isArray(atividades)).toBe(true);
    
    // Verificar que a atividade foi registada
    const atividadeTeste = atividades.find(a => 
      a.descricao === 'Teste: Nova loja criada para teste'
    );
    
    expect(atividadeTeste).toBeDefined();
    expect(atividadeTeste?.tipo).toBe('loja_criada');
  });

  it('should return activities with correct structure', async () => {
    const atividades = await getAtividadesRecentes(5);
    
    if (atividades.length > 0) {
      const atividade = atividades[0];
      
      // Verificar estrutura
      expect(atividade).toHaveProperty('id');
      expect(atividade).toHaveProperty('tipo');
      expect(atividade).toHaveProperty('descricao');
      expect(atividade).toHaveProperty('createdAt');
    }
  });
});
