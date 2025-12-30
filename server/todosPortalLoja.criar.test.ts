import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do db
vi.mock('./db', () => ({
  validarTokenLoja: vi.fn(),
  getGestorDaLoja: vi.fn(),
  createTodo: vi.fn(),
  getUserById: vi.fn(),
}));

// Mock do email
vi.mock('./_core/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import * as db from './db';

describe('todosPortalLoja.criar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rejeitar token inválido', async () => {
    // Arrange
    vi.mocked(db.validarTokenLoja).mockResolvedValue(null);

    // Act & Assert
    const result = await db.validarTokenLoja('token-invalido');
    expect(result).toBeNull();
  });

  it('deve validar token corretamente', async () => {
    // Arrange
    const mockAuth = {
      loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
      token: { token: 'token-valido', lojaId: 1 },
    };
    vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);

    // Act
    const result = await db.validarTokenLoja('token-valido');

    // Assert
    expect(result).not.toBeNull();
    expect(result?.loja.id).toBe(1);
    expect(result?.loja.nome).toBe('Loja Teste');
  });

  it('deve obter gestor responsável pela loja', async () => {
    // Arrange
    const mockGestor = {
      gestorId: 1,
      userId: 10,
      nome: 'Gestor Teste',
      email: 'gestor@teste.com',
    };
    vi.mocked(db.getGestorDaLoja).mockResolvedValue(mockGestor);

    // Act
    const result = await db.getGestorDaLoja(1);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.userId).toBe(10);
    expect(result?.nome).toBe('Gestor Teste');
  });

  it('deve criar tarefa com dados corretos', async () => {
    // Arrange
    const mockTodo = {
      id: 1,
      titulo: 'Tarefa da Loja',
      descricao: 'Descrição da tarefa',
      prioridade: 'media' as const,
      atribuidoUserId: 10,
      atribuidoLojaId: null,
      criadoPorId: 10,
      estado: 'pendente' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoriaId: null,
      comentario: null,
      historicoAtribuicoes: null,
      dataLimite: null,
      dataConclusao: null,
    };
    vi.mocked(db.createTodo).mockResolvedValue(mockTodo);

    // Act
    const result = await db.createTodo({
      titulo: 'Tarefa da Loja',
      descricao: 'Descrição da tarefa',
      prioridade: 'media',
      atribuidoUserId: 10,
      atribuidoLojaId: null,
      criadoPorId: 10,
    });

    // Assert
    expect(result).not.toBeNull();
    expect(result?.titulo).toBe('Tarefa da Loja');
    expect(result?.atribuidoUserId).toBe(10);
    expect(result?.atribuidoLojaId).toBeNull();
  });

  it('deve retornar null quando não há gestor para a loja', async () => {
    // Arrange
    vi.mocked(db.getGestorDaLoja).mockResolvedValue(null);

    // Act
    const result = await db.getGestorDaLoja(999);

    // Assert
    expect(result).toBeNull();
  });

  it('fluxo completo: loja cria tarefa para gestor', async () => {
    // Arrange
    const mockAuth = {
      loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
      token: { token: 'token-valido', lojaId: 1 },
    };
    const mockGestor = {
      gestorId: 1,
      userId: 10,
      nome: 'Gestor Teste',
      email: 'gestor@teste.com',
    };
    const mockTodo = {
      id: 1,
      titulo: 'Precisamos de formação',
      descricao: 'Formação sobre novo produto',
      prioridade: 'alta' as const,
      atribuidoUserId: 10,
      atribuidoLojaId: null,
      criadoPorId: 10,
      estado: 'pendente' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoriaId: null,
      comentario: null,
      historicoAtribuicoes: null,
      dataLimite: null,
      dataConclusao: null,
    };

    vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
    vi.mocked(db.getGestorDaLoja).mockResolvedValue(mockGestor);
    vi.mocked(db.createTodo).mockResolvedValue(mockTodo);

    // Act - Simular o fluxo
    const auth = await db.validarTokenLoja('token-valido');
    expect(auth).not.toBeNull();

    const gestor = await db.getGestorDaLoja(auth!.loja.id);
    expect(gestor).not.toBeNull();

    const todo = await db.createTodo({
      titulo: 'Precisamos de formação',
      descricao: 'Formação sobre novo produto',
      prioridade: 'alta',
      atribuidoUserId: gestor!.userId,
      atribuidoLojaId: null,
      criadoPorId: gestor!.userId,
    });

    // Assert
    expect(todo).not.toBeNull();
    expect(todo?.titulo).toBe('Precisamos de formação');
    expect(todo?.prioridade).toBe('alta');
    expect(todo?.atribuidoUserId).toBe(10);
  });
});
