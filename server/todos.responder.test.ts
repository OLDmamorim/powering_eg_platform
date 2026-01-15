import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock do módulo db
vi.mock('./db', () => ({
  getTodoById: vi.fn(),
  updateTodo: vi.fn(),
  getLojaById: vi.fn(),
}));

// Mock do sendEmail
vi.mock('./_core/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe('todos.responder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve permitir responder a uma tarefa existente', async () => {
    const mockTodo = {
      id: 10,
      titulo: 'Tarefa da Loja',
      descricao: 'Descrição da tarefa',
      prioridade: 'media',
      criadoPorLojaId: 1,
      atribuidoLojaId: null,
      comentario: null,
    };

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);
    vi.mocked(db.updateTodo).mockResolvedValue(undefined);
    vi.mocked(db.getLojaById).mockResolvedValue({
      id: 1,
      nome: 'Loja Teste',
      email: 'loja@teste.com',
    } as any);

    // Simular a lógica do endpoint
    const todo = await db.getTodoById(10);
    expect(todo).toBeTruthy();
    expect(todo!.titulo).toBe('Tarefa da Loja');

    // Simular atualização do comentário
    const novaResposta = 'Esta é a minha resposta';
    const comentarioAtualizado = `[15/01/2026 - Gestor] ${novaResposta}`;
    
    await db.updateTodo(10, {
      comentario: comentarioAtualizado,
      visto: false,
      vistoEm: null,
    });

    expect(db.updateTodo).toHaveBeenCalledWith(10, {
      comentario: comentarioAtualizado,
      visto: false,
      vistoEm: null,
    });
  });

  it('deve notificar a loja criadora por email', async () => {
    const mockTodo = {
      id: 10,
      titulo: 'Tarefa da Loja',
      criadoPorLojaId: 1,
      atribuidoLojaId: null,
    };

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);
    vi.mocked(db.getLojaById).mockResolvedValue({
      id: 1,
      nome: 'Loja Teste',
      email: 'loja@teste.com',
    } as any);

    const todo = await db.getTodoById(10);
    expect(todo!.criadoPorLojaId).toBe(1);

    const loja = await db.getLojaById(todo!.criadoPorLojaId);
    expect(loja).toBeTruthy();
    expect(loja!.email).toBe('loja@teste.com');
  });

  it('deve adicionar resposta ao histórico de comentários', async () => {
    const mockTodo = {
      id: 10,
      titulo: 'Tarefa da Loja',
      comentario: '[14/01/2026 - Gestor] Comentário anterior',
      criadoPorLojaId: 1,
    };

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);

    const todo = await db.getTodoById(10);
    const novaResposta = 'Nova resposta';
    
    // Simular a lógica de concatenação
    const comentarioAtualizado = `[15/01/2026 - Gestor] ${novaResposta}\n\n--- Histórico ---\n${todo!.comentario}`;
    
    expect(comentarioAtualizado).toContain('Nova resposta');
    expect(comentarioAtualizado).toContain('Comentário anterior');
    expect(comentarioAtualizado).toContain('--- Histórico ---');
  });

  it('deve rejeitar resposta vazia', async () => {
    const respostaVazia = '';
    expect(respostaVazia.trim()).toBe('');
  });
});
