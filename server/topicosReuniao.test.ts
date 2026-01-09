import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';
import type { TrpcContext } from './_core/context';

describe('Tópicos de Reunião de Gestores', () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let gestorCaller: ReturnType<typeof appRouter.createCaller>;
  let adminGestorId: number;
  let gestorId: number;
  let testTimestamp: string;

  beforeAll(async () => {
    testTimestamp = Date.now().toString();
    
    // Criar admin
    const admin = await db.createGestor(`Admin Topicos ${testTimestamp}`, `admin-topicos-${testTimestamp}@test.com`);
    await db.promoteGestorToAdmin(admin.id);
    adminGestorId = admin.id;

    const adminCtx: TrpcContext & { gestor: { id: number; userId: number } } = {
      user: { id: admin.userId, role: 'admin', name: `Admin Topicos ${testTimestamp}`, email: `admin-topicos-${testTimestamp}@test.com`, openId: `admin-${testTimestamp}`, lastSignedIn: new Date() },
      gestor: { id: admin.id, userId: admin.userId },
    };
    adminCaller = appRouter.createCaller(adminCtx);

    // Criar gestor
    const gestor = await db.createGestor(`Gestor Topicos ${testTimestamp}`, `gestor-topicos-${testTimestamp}@test.com`);
    gestorId = gestor.id;

    const gestorCtx: TrpcContext & { gestor: { id: number; userId: number } } = {
      user: { id: gestor.userId, role: 'gestor', name: `Gestor Topicos ${testTimestamp}`, email: `gestor-topicos-${testTimestamp}@test.com`, openId: `gestor-${testTimestamp}`, lastSignedIn: new Date() },
      gestor: { id: gestorId, userId: gestor.userId },
    };
    gestorCaller = appRouter.createCaller(gestorCtx);
  });

  it('gestor deve conseguir criar um tópico', async () => {
    const topico = await gestorCaller.reunioesGestores.criarTopico({
      titulo: `Tópico Teste ${testTimestamp}`,
      descricao: 'Descrição do tópico de teste',
    });

    expect(topico).toBeDefined();
    expect(topico.titulo).toBe(`Tópico Teste ${testTimestamp}`);
    expect(topico.estado).toBe('pendente');
  });

  it('gestor deve conseguir listar seus tópicos pendentes', async () => {
    const topicos = await gestorCaller.reunioesGestores.listarTopicosPendentes();

    expect(Array.isArray(topicos)).toBe(true);
    const topicoTeste = topicos.find((t: any) => t.titulo === `Tópico Teste ${testTimestamp}`);
    expect(topicoTeste).toBeDefined();
  });

  it('admin deve ver todos os tópicos pendentes', async () => {
    const topicos = await adminCaller.reunioesGestores.listarTopicosPendentes();

    expect(Array.isArray(topicos)).toBe(true);
    const topicoTeste = topicos.find((t: any) => t.titulo === `Tópico Teste ${testTimestamp}`);
    expect(topicoTeste).toBeDefined();
  });

  it('gestor deve conseguir atualizar seu tópico pendente', async () => {
    // Primeiro buscar o tópico
    const topicos = await gestorCaller.reunioesGestores.listarTopicosPendentes();
    const topicoTeste = topicos.find((t: any) => t.titulo === `Tópico Teste ${testTimestamp}`);
    
    if (!topicoTeste) {
      throw new Error('Tópico de teste não encontrado');
    }

    const topicoAtualizado = await gestorCaller.reunioesGestores.atualizarTopico({
      id: topicoTeste.id,
      titulo: `Tópico Atualizado ${testTimestamp}`,
      descricao: 'Descrição atualizada',
    });

    expect(topicoAtualizado.titulo).toBe(`Tópico Atualizado ${testTimestamp}`);
    expect(topicoAtualizado.descricao).toBe('Descrição atualizada');
  });

  it('gestor deve conseguir eliminar seu tópico pendente', async () => {
    // Criar um novo tópico para eliminar
    const novoTopico = await gestorCaller.reunioesGestores.criarTopico({
      titulo: `Tópico Para Eliminar ${testTimestamp}`,
    });

    // Eliminar
    await gestorCaller.reunioesGestores.eliminarTopico({
      id: novoTopico.id,
    });

    // Verificar que foi eliminado
    const topicos = await gestorCaller.reunioesGestores.listarTopicosPendentes();
    const topicoEliminado = topicos.find((t: any) => t.id === novoTopico.id);
    expect(topicoEliminado).toBeUndefined();
  });

  it('deve ter endpoints de tópicos disponíveis', () => {
    // Verificar que os endpoints existem
    expect(typeof adminCaller.reunioesGestores.criarTopico).toBe('function');
    expect(typeof adminCaller.reunioesGestores.listarTopicosPendentes).toBe('function');
    expect(typeof adminCaller.reunioesGestores.atualizarTopico).toBe('function');
    expect(typeof adminCaller.reunioesGestores.eliminarTopico).toBe('function');
    expect(typeof adminCaller.reunioesGestores.marcarAnalisado).toBe('function');
    expect(typeof adminCaller.reunioesGestores.finalizarTopicos).toBe('function');
    expect(typeof adminCaller.reunioesGestores.libertarTopicosNaoDiscutidos).toBe('function');
  });
});
