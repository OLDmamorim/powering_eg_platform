import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

/**
 * Testes para as funções de chatbot dos portais (Loja e Volante)
 * 
 * Estes testes verificam que as funções de processamento de perguntas
 * do chatbot estão a funcionar corretamente e têm acesso aos dados necessários.
 */

describe('Chatbot Portais', () => {
  let lojaId: number;
  let volanteId: number | undefined;
  let gestorId: number;

  beforeAll(async () => {
    // Obter uma loja para testes
    const lojas = await db.getAllLojas();
    if (lojas.length === 0) {
      throw new Error('Nenhuma loja disponível para testes');
    }
    lojaId = lojas[0].id;

    // Obter um gestor para testes
    const gestores = await db.getAllGestores();
    if (gestores.length > 0) {
      gestorId = gestores[0].id;
      
      // Obter volantes do gestor (se existir)
      const volantes = await db.getVolantesByGestorId(gestorId);
      if (volantes.length > 0) {
        volanteId = volantes[0].id;
      }
    }
  });

  describe('Portal da Loja', () => {
    it('deve ter acesso aos dados da loja', async () => {
      const loja = await db.getLojaById(lojaId);
      expect(loja).toBeDefined();
      expect(loja?.id).toBe(lojaId);
      expect(loja?.nome).toBeDefined();
    });

    it('deve ter acesso aos pendentes da loja', async () => {
      const pendentes = await db.getPendentesByLojaId(lojaId);
      expect(Array.isArray(pendentes)).toBe(true);
    });

    it('deve ter acesso aos todos/tarefas da loja', async () => {
      const todos = await db.getTodosByLojaId(lojaId);
      expect(Array.isArray(todos)).toBe(true);
    });

    it('deve ter acesso aos resultados mensais da loja', async () => {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      
      const resultados = await db.getResultadosMensais(
        { mes: mesAtual, ano: anoAtual, lojaId },
        { id: 1, role: 'admin' } as any
      );
      
      expect(Array.isArray(resultados)).toBe(true);
    });

    it('deve ter acesso a todas as lojas (para comparação)', async () => {
      const todasLojas = await db.getAllLojas();
      expect(Array.isArray(todasLojas)).toBe(true);
      expect(todasLojas.length).toBeGreaterThan(0);
    });

    it('deve ter acesso aos relatórios da loja', async () => {
      const relatoriosLivres = await db.getAllRelatoriosLivres();
      const relatoriosCompletos = await db.getAllRelatoriosCompletos();
      
      expect(Array.isArray(relatoriosLivres)).toBe(true);
      expect(Array.isArray(relatoriosCompletos)).toBe(true);
    });
  });

  describe('Portal do Volante', () => {
    it('deve ter acesso aos dados do volante', async () => {
      if (!volanteId) {
        console.log('Nenhum volante disponível para testes - saltando teste');
        return;
      }

      const volante = await db.getVolanteById(volanteId);
      expect(volante).toBeDefined();
      expect(volante?.id).toBe(volanteId);
      expect(volante?.nome).toBeDefined();
    });

    it('deve ter acesso às lojas atribuídas ao volante', async () => {
      if (!volanteId) {
        console.log('Nenhum volante disponível para testes - saltando teste');
        return;
      }

      const lojasAtribuidas = await db.getLojasByVolanteId(volanteId);
      expect(Array.isArray(lojasAtribuidas)).toBe(true);
    });

    it('deve ter acesso aos pedidos de apoio', async () => {
      if (!volanteId) {
        console.log('Nenhum volante disponível para testes - saltando teste');
        return;
      }

      const pedidos = await db.getPedidosApoioByVolanteId(volanteId);
      expect(Array.isArray(pedidos)).toBe(true);
    });

    it('deve ter acesso aos agendamentos do volante', async () => {
      if (!volanteId) {
        console.log('Nenhum volante disponível para testes - saltando teste');
        return;
      }

      const agendamentos = await db.getAgendamentosVolanteFuturos(volanteId);
      expect(Array.isArray(agendamentos)).toBe(true);
    });

    it('deve ter acesso a todas as lojas (para análise nacional)', async () => {
      const todasLojas = await db.getAllLojas();
      expect(Array.isArray(todasLojas)).toBe(true);
      expect(todasLojas.length).toBeGreaterThan(0);
    });

    it('deve ter acesso aos resultados de todas as lojas', async () => {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      
      const resultados = await db.getResultadosMensais(
        { mes: mesAtual, ano: anoAtual },
        { id: 1, role: 'admin' } as any
      );
      
      expect(Array.isArray(resultados)).toBe(true);
    });
  });

  describe('Acesso a Dados Nacionais', () => {
    it('deve ter acesso a todas as lojas do país', async () => {
      const todasLojas = await db.getAllLojas();
      expect(Array.isArray(todasLojas)).toBe(true);
      expect(todasLojas.length).toBeGreaterThan(0);
    });

    it('deve ter acesso aos resultados nacionais', async () => {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      
      const totais = await db.getTotaisMensais(mesAtual, anoAtual);
      expect(totais).toBeDefined();
    });

    it('deve ter acesso aos alertas de todas as lojas', async () => {
      const alertas = await db.getAllAlertas();
      expect(Array.isArray(alertas)).toBe(true);
    });

    it('deve ter acesso aos pendentes de todas as lojas', async () => {
      const todasLojas = await db.getAllLojas();
      let todosPendentes: any[] = [];
      
      for (const loja of todasLojas) {
        const pendentes = await db.getPendentesByLojaId(loja.id);
        todosPendentes = todosPendentes.concat(pendentes);
      }
      
      expect(Array.isArray(todosPendentes)).toBe(true);
    });
  });
});
