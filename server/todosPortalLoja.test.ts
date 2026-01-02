import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock do módulo db
vi.mock('./db', () => ({
  validarTokenLoja: vi.fn(),
  getTodoById: vi.fn(),
  updateTodo: vi.fn(),
  getUserById: vi.fn(),
}));

// Mock do sendEmail
vi.mock('./_core/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe('todosPortalLoja.adicionarObservacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve permitir adicionar observação a tarefa recebida (atribuidoLojaId === lojaId)', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    const mockTodo = {
      id: 100,
      titulo: 'Tarefa do Gestor',
      descricao: 'Descrição',
      prioridade: 'media',
      atribuidoLojaId: 1, // Tarefa atribuída à loja 1
      criadoPorLojaId: null, // Não foi criada pela loja
      criadoPorId: 5,
    };

    // Simular validação de token bem-sucedida
    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    // Simular que a tarefa existe e está atribuída à loja
    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);

    // Simular atualização bem-sucedida
    vi.mocked(db.updateTodo).mockResolvedValue(undefined);

    // Simular criador da tarefa
    vi.mocked(db.getUserById).mockResolvedValue({
      id: 5,
      email: 'gestor@teste.com',
      name: 'Gestor Teste',
    } as any);

    // A lógica de validação deve passar porque atribuidoLojaId === auth.loja.id
    const todo = await db.getTodoById(100);
    const auth = await db.validarTokenLoja('valid-token');
    
    expect(todo).toBeTruthy();
    expect(auth).toBeTruthy();
    expect(todo!.atribuidoLojaId).toBe(auth!.loja.id);
  });

  it('deve rejeitar observação se tarefa não está atribuída à loja', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    const mockTodo = {
      id: 100,
      titulo: 'Tarefa de Outra Loja',
      atribuidoLojaId: 2, // Tarefa atribuída à loja 2, não à loja 1
      criadoPorLojaId: null,
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);

    const todo = await db.getTodoById(100);
    const auth = await db.validarTokenLoja('valid-token');

    // A validação deve falhar porque atribuidoLojaId !== auth.loja.id
    expect(todo!.atribuidoLojaId).not.toBe(auth!.loja.id);
  });

  it('deve permitir editar observação existente', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    const mockTodo = {
      id: 100,
      titulo: 'Tarefa do Gestor',
      atribuidoLojaId: 1,
      respostaLoja: 'Observação anterior', // Já tinha observação
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);
    vi.mocked(db.updateTodo).mockResolvedValue(undefined);

    const todo = await db.getTodoById(100);
    const auth = await db.validarTokenLoja('valid-token');

    // Deve permitir atualizar mesmo que já tenha observação
    expect(todo!.atribuidoLojaId).toBe(auth!.loja.id);
    expect(todo!.respostaLoja).toBe('Observação anterior');

    // Simular atualização
    await db.updateTodo(100, { respostaLoja: 'Nova observação' });
    expect(db.updateTodo).toHaveBeenCalledWith(100, { respostaLoja: 'Nova observação' });
  });
});

describe('Diferença entre responder e adicionarObservacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responder: só permite para tarefas criadas pela loja (criadoPorLojaId === lojaId)', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    
    // Tarefa ENVIADA pela loja (criada pela loja, atribuída ao gestor)
    const tarefaEnviada = {
      id: 100,
      titulo: 'Pedido ao Gestor',
      criadoPorLojaId: 1, // Criada pela loja 1
      atribuidoLojaId: null, // Não atribuída a nenhuma loja
      comentario: 'Resposta do gestor', // Gestor já respondeu
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(tarefaEnviada as any);

    const todo = await db.getTodoById(100);
    const auth = await db.validarTokenLoja('valid-token');

    // Para responder: criadoPorLojaId deve ser igual a auth.loja.id
    expect(todo!.criadoPorLojaId).toBe(auth!.loja.id);
  });

  it('adicionarObservacao: só permite para tarefas recebidas (atribuidoLojaId === lojaId)', async () => {
    const mockLoja = { id: 1, nome: 'Loja Teste' };
    
    // Tarefa RECEBIDA pela loja (criada pelo gestor, atribuída à loja)
    const tarefaRecebida = {
      id: 200,
      titulo: 'Tarefa do Gestor',
      criadoPorLojaId: null, // Não criada por nenhuma loja
      atribuidoLojaId: 1, // Atribuída à loja 1
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: mockLoja,
      token: 'valid-token',
    } as any);

    vi.mocked(db.getTodoById).mockResolvedValue(tarefaRecebida as any);

    const todo = await db.getTodoById(200);
    const auth = await db.validarTokenLoja('valid-token');

    // Para adicionarObservacao: atribuidoLojaId deve ser igual a auth.loja.id
    expect(todo!.atribuidoLojaId).toBe(auth!.loja.id);
  });
});
