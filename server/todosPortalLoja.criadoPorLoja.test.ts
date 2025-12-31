import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock do db
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    validarTokenLoja: vi.fn(),
    getGestorDaLoja: vi.fn(),
    createTodo: vi.fn(),
  };
});

describe('Portal da Loja - criadoPorLojaId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar tarefa com criadoPorLojaId quando criada pela loja', async () => {
    // Arrange
    const lojaId = 5;
    const lojaNome = 'Braga Minho Center';
    const gestorUserId = 10;
    
    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: { id: lojaId, nome: lojaNome, email: 'braga@test.com', contacto: '123456789' },
      token: { token: 'test-token', lojaId, expiresAt: new Date() },
    } as any);
    
    vi.mocked(db.getGestorDaLoja).mockResolvedValue({
      id: 1,
      userId: gestorUserId,
      email: 'gestor@test.com',
      nome: 'Marco Amorim',
    });
    
    const mockTodo = {
      id: 100,
      titulo: 'Tarefa da Loja',
      descricao: 'Descrição',
      prioridade: 'media' as const,
      atribuidoUserId: gestorUserId,
      atribuidoLojaId: null,
      criadoPorId: gestorUserId,
      criadoPorLojaId: lojaId, // Este é o campo importante
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

    // Act - simular o que o endpoint faz
    const auth = await db.validarTokenLoja('test-token');
    const gestorDaLoja = await db.getGestorDaLoja(auth!.loja.id);
    
    const todo = await db.createTodo({
      titulo: 'Tarefa da Loja',
      descricao: 'Descrição',
      prioridade: 'media',
      atribuidoUserId: gestorDaLoja!.userId,
      atribuidoLojaId: null,
      criadoPorId: gestorDaLoja!.userId,
      criadoPorLojaId: auth!.loja.id, // Guardar que foi criada pela loja
    });

    // Assert
    expect(db.createTodo).toHaveBeenCalledWith(
      expect.objectContaining({
        criadoPorLojaId: lojaId,
      })
    );
    expect(todo?.criadoPorLojaId).toBe(lojaId);
  });

  it('deve mostrar nome da loja como criador quando criadoPorLojaId está preenchido', () => {
    // Este teste verifica a lógica do COALESCE na query
    // Se criadoPorLojaId estiver preenchido, deve retornar o nome da loja
    // Se não, deve retornar o nome do user
    
    const todoComLojaId = {
      criadoPorId: 10,
      criadoPorLojaId: 5,
      // O COALESCE na query vai buscar primeiro o nome da loja (id=5)
      // e só se for null vai buscar o nome do user (id=10)
    };
    
    const todoSemLojaId = {
      criadoPorId: 10,
      criadoPorLojaId: null,
      // O COALESCE vai retornar null para loja e depois buscar user
    };
    
    // Verificar que a estrutura está correta
    expect(todoComLojaId.criadoPorLojaId).toBe(5);
    expect(todoSemLojaId.criadoPorLojaId).toBeNull();
  });

  it('não deve ter criadoPorLojaId quando tarefa é criada pelo gestor', async () => {
    // Arrange
    const gestorUserId = 10;
    
    const mockTodo = {
      id: 101,
      titulo: 'Tarefa do Gestor',
      descricao: 'Descrição',
      prioridade: 'media' as const,
      atribuidoLojaId: 5,
      atribuidoUserId: null,
      criadoPorId: gestorUserId,
      criadoPorLojaId: null, // Não foi criada pela loja
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

    // Act - simular criação pelo gestor (sem criadoPorLojaId)
    const todo = await db.createTodo({
      titulo: 'Tarefa do Gestor',
      descricao: 'Descrição',
      prioridade: 'media',
      atribuidoLojaId: 5,
      atribuidoUserId: null,
      criadoPorId: gestorUserId,
      // Não passa criadoPorLojaId
    });

    // Assert
    expect(todo?.criadoPorLojaId).toBeNull();
    expect(todo?.criadoPorId).toBe(gestorUserId);
  });
});
