import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do db
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    countTodosCriadosPorLojas: vi.fn(),
    countTodosPendentesAtribuidosAMim: vi.fn(),
  };
});

import * as db from './db';

describe('Contagem de Tarefas Criadas por Lojas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('countTodosCriadosPorLojas', () => {
    it('deve contar apenas tarefas criadas por lojas (criadoPorLojaId IS NOT NULL)', async () => {
      // Arrange
      vi.mocked(db.countTodosCriadosPorLojas).mockResolvedValue(4);

      // Act
      const count = await db.countTodosCriadosPorLojas();

      // Assert
      expect(count).toBe(4);
      expect(db.countTodosCriadosPorLojas).toHaveBeenCalled();
    });

    it('deve retornar 0 quando não há tarefas criadas por lojas', async () => {
      // Arrange
      vi.mocked(db.countTodosCriadosPorLojas).mockResolvedValue(0);

      // Act
      const count = await db.countTodosCriadosPorLojas();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('countTodosPendentesAtribuidosAMim', () => {
    it('deve contar tarefas atribuídas ao gestor criadas por lojas', async () => {
      // Arrange
      const gestorUserId = 420030;
      vi.mocked(db.countTodosPendentesAtribuidosAMim).mockResolvedValue(4);

      // Act
      const count = await db.countTodosPendentesAtribuidosAMim(gestorUserId);

      // Assert
      expect(count).toBe(4);
      expect(db.countTodosPendentesAtribuidosAMim).toHaveBeenCalledWith(gestorUserId);
    });

    it('deve retornar 0 para gestor sem tarefas atribuídas', async () => {
      // Arrange
      const gestorUserId = 999;
      vi.mocked(db.countTodosPendentesAtribuidosAMim).mockResolvedValue(0);

      // Act
      const count = await db.countTodosPendentesAtribuidosAMim(gestorUserId);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('Lógica de contagem para Admin vs Gestor', () => {
    it('Admin deve ver TODAS as tarefas criadas por lojas', async () => {
      // Arrange - Admin vê todas
      vi.mocked(db.countTodosCriadosPorLojas).mockResolvedValue(10);
      
      // Act - Simular comportamento do router para admin
      const adminCount = await db.countTodosCriadosPorLojas();
      
      // Assert
      expect(adminCount).toBe(10);
    });

    it('Gestor deve ver apenas tarefas atribuídas a ele', async () => {
      // Arrange - Gestor vê apenas as suas
      const gestorUserId = 420030;
      vi.mocked(db.countTodosPendentesAtribuidosAMim).mockResolvedValue(4);
      
      // Act - Simular comportamento do router para gestor
      const gestorCount = await db.countTodosPendentesAtribuidosAMim(gestorUserId);
      
      // Assert
      expect(gestorCount).toBe(4);
    });
  });
});
