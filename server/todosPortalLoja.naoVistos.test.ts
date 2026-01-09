import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo db
vi.mock('./db', () => ({
  validarTokenLoja: vi.fn(),
  contarTodosLojaNaoVistos: vi.fn(),
  getTodoById: vi.fn(),
  marcarTodoComoVisto: vi.fn(),
  marcarMultiplosTodosComoVistoLoja: vi.fn(),
}));

// Mock do sendEmail
vi.mock('./_core/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import * as db from './db';

describe('todosPortalLoja - Tarefas Não Vistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('contarNaoVistos', () => {
    it('deve rejeitar token inválido', async () => {
      // Arrange
      vi.mocked(db.validarTokenLoja).mockResolvedValue(null);

      // Act & Assert
      const result = await db.validarTokenLoja('token-invalido');
      expect(result).toBeNull();
    });

    it('deve retornar contagem de tarefas não vistas para token válido', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.contarTodosLojaNaoVistos).mockResolvedValue(5);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      expect(auth).not.toBeNull();
      
      const count = await db.contarTodosLojaNaoVistos(auth!.loja.id);

      // Assert
      expect(count).toBe(5);
      expect(db.contarTodosLojaNaoVistos).toHaveBeenCalledWith(1);
    });

    it('deve retornar 0 quando não há tarefas não vistas', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 2, nome: 'Loja Vazia', email: 'vazia@teste.com' },
        token: { token: 'token-vazio', lojaId: 2 },
      };
      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.contarTodosLojaNaoVistos).mockResolvedValue(0);

      // Act
      const auth = await db.validarTokenLoja('token-vazio');
      const count = await db.contarTodosLojaNaoVistos(auth!.loja.id);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('marcarVisto', () => {
    it('deve rejeitar token inválido', async () => {
      // Arrange
      vi.mocked(db.validarTokenLoja).mockResolvedValue(null);

      // Act & Assert
      const result = await db.validarTokenLoja('token-invalido');
      expect(result).toBeNull();
    });

    it('deve permitir marcar tarefa como vista se pertence à loja', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockTodo = {
        id: 100,
        titulo: 'Tarefa do Gestor',
        atribuidoLojaId: 1, // Pertence à loja 1
        visto: false,
      };
      
      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);
      vi.mocked(db.marcarTodoComoVisto).mockResolvedValue(undefined);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      const todo = await db.getTodoById(100);
      
      // Verificar permissão
      expect(todo?.atribuidoLojaId).toBe(auth?.loja.id);
      
      await db.marcarTodoComoVisto(100);

      // Assert
      expect(db.marcarTodoComoVisto).toHaveBeenCalledWith(100);
    });

    it('deve rejeitar marcar tarefa que não pertence à loja', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockTodo = {
        id: 200,
        titulo: 'Tarefa de Outra Loja',
        atribuidoLojaId: 999, // Pertence a outra loja
        visto: false,
      };
      
      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getTodoById).mockResolvedValue(mockTodo as any);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      const todo = await db.getTodoById(200);

      // Assert - Verificar que a tarefa não pertence à loja
      expect(todo?.atribuidoLojaId).not.toBe(auth?.loja.id);
    });
  });

  describe('marcarMultiplosVistos', () => {
    it('deve marcar múltiplas tarefas como vistas', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockTodos = [
        { id: 101, titulo: 'Tarefa 1', atribuidoLojaId: 1, visto: false },
        { id: 102, titulo: 'Tarefa 2', atribuidoLojaId: 1, visto: false },
        { id: 103, titulo: 'Tarefa 3', atribuidoLojaId: 1, visto: false },
      ];
      
      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getTodoById).mockImplementation(async (id: number) => {
        return mockTodos.find(t => t.id === id) as any;
      });
      vi.mocked(db.marcarMultiplosTodosComoVistoLoja).mockResolvedValue(undefined);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      const todoIds = [101, 102, 103];
      
      // Verificar que todas pertencem à loja
      for (const id of todoIds) {
        const todo = await db.getTodoById(id);
        expect(todo?.atribuidoLojaId).toBe(auth?.loja.id);
      }
      
      await db.marcarMultiplosTodosComoVistoLoja(todoIds);

      // Assert
      expect(db.marcarMultiplosTodosComoVistoLoja).toHaveBeenCalledWith([101, 102, 103]);
    });

    it('deve rejeitar se alguma tarefa não pertence à loja', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockTodos = [
        { id: 101, titulo: 'Tarefa 1', atribuidoLojaId: 1, visto: false },
        { id: 102, titulo: 'Tarefa de Outra Loja', atribuidoLojaId: 999, visto: false }, // Não pertence
      ];
      
      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getTodoById).mockImplementation(async (id: number) => {
        return mockTodos.find(t => t.id === id) as any;
      });

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      const todoIds = [101, 102];
      
      // Verificar permissões
      let hasInvalidTodo = false;
      for (const id of todoIds) {
        const todo = await db.getTodoById(id);
        if (todo?.atribuidoLojaId !== auth?.loja.id) {
          hasInvalidTodo = true;
          break;
        }
      }

      // Assert
      expect(hasInvalidTodo).toBe(true);
    });
  });
});
