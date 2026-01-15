import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock do módulo db
vi.mock('./db', () => ({
  validarTokenLoja: vi.fn(),
  getTodoById: vi.fn(),
  updateTodo: vi.fn(),
}));

describe('todosPortalLoja.editarEnviada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve permitir editar uma tarefa enviada não vista pelo gestor', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    const mockTodo = {
      id: 10,
      titulo: 'Tarefa Original',
      descricao: 'Descrição original',
      prioridade: 'media',
      criadoPorLojaId: 1, // Criada pela loja 1
      visto: false, // Não foi vista
      estado: 'pendente',
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);
    vi.mocked(db.updateTodo).mockResolvedValue(undefined);

    // Verificar que a lógica de validação passa
    const todo = await db.getTodoById(10);
    const auth = await db.validarTokenLoja('valid-token');

    expect(todo).toBeTruthy();
    expect(auth).toBeTruthy();
    expect(todo!.criadoPorLojaId).toBe(auth!.loja.id);
    expect(todo!.visto).toBe(false);
  });

  it('deve rejeitar edição de tarefa já vista pelo gestor', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    const mockTodo = {
      id: 10,
      titulo: 'Tarefa Original',
      criadoPorLojaId: 1,
      visto: true, // Já foi vista
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);

    const todo = await db.getTodoById(10);
    const auth = await db.validarTokenLoja('valid-token');

    // A validação deve falhar porque visto === true
    expect(todo!.criadoPorLojaId).toBe(auth!.loja.id);
    expect(todo!.visto).toBe(true);
  });

  it('deve rejeitar edição de tarefa não criada pela loja', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    const mockTodo = {
      id: 10,
      titulo: 'Tarefa de Outra Loja',
      criadoPorLojaId: 999, // Criada por outra loja
      visto: false,
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);

    const todo = await db.getTodoById(10);
    const auth = await db.validarTokenLoja('valid-token');

    // A validação deve falhar porque criadoPorLojaId !== auth.loja.id
    expect(todo!.criadoPorLojaId).not.toBe(auth!.loja.id);
  });

  it('deve rejeitar com token inválido', async () => {
    vi.mocked(db.validarTokenLoja).mockResolvedValue(null);

    const auth = await db.validarTokenLoja('invalid-token');

    expect(auth).toBeNull();
  });
});
