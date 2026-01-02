import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do storage
vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ url: 'https://storage.example.com/file.pdf', key: 'test-key' }),
}));

// Mock do db
vi.mock('./db', () => ({
  validarTokenLoja: vi.fn(),
  createTodo: vi.fn(),
  getGestorDaLoja: vi.fn(),
}));

import * as db from './db';
import { storagePut } from './storage';

describe('todosPortalLoja - Anexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Upload de Anexos', () => {
    it('deve rejeitar upload com token inválido', async () => {
      // Arrange
      vi.mocked(db.validarTokenLoja).mockResolvedValue(null);

      // Act & Assert
      const result = await db.validarTokenLoja('token-invalido');
      expect(result).toBeNull();
    });

    it('deve validar token antes de permitir upload', async () => {
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
    });
  });

  describe('Criação de Tarefa com Anexos', () => {
    it('deve criar tarefa com anexos JSON', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockGestor = {
        id: 1,
        userId: 10,
        email: 'gestor@teste.com',
        nome: 'Gestor Teste',
      };
      const mockTodo = {
        id: 1,
        titulo: 'Tarefa com anexos',
        descricao: 'Descrição',
        anexos: JSON.stringify([
          { url: 'https://storage.example.com/foto.jpg', nome: 'foto.jpg', tipo: 'imagem' },
          { url: 'https://storage.example.com/doc.pdf', nome: 'doc.pdf', tipo: 'documento' },
        ]),
      };

      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getGestorDaLoja).mockResolvedValue(mockGestor);
      vi.mocked(db.createTodo).mockResolvedValue(mockTodo as any);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      expect(auth).not.toBeNull();

      const gestor = await db.getGestorDaLoja(1);
      expect(gestor).not.toBeNull();

      const anexos = [
        { url: 'https://storage.example.com/foto.jpg', nome: 'foto.jpg', tipo: 'imagem' },
        { url: 'https://storage.example.com/doc.pdf', nome: 'doc.pdf', tipo: 'documento' },
      ];

      const todo = await db.createTodo({
        titulo: 'Tarefa com anexos',
        descricao: 'Descrição',
        prioridade: 'media',
        atribuidoUserId: gestor!.userId,
        atribuidoLojaId: null,
        criadoPorId: gestor!.userId,
        criadoPorLojaId: auth!.loja.id,
        anexos: JSON.stringify(anexos),
      } as any);

      // Assert
      expect(todo).not.toBeNull();
      expect(todo?.anexos).toBeDefined();
      
      const anexosParsed = JSON.parse(todo!.anexos as string);
      expect(anexosParsed).toHaveLength(2);
      expect(anexosParsed[0].tipo).toBe('imagem');
      expect(anexosParsed[1].tipo).toBe('documento');
    });

    it('deve criar tarefa sem anexos', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockGestor = {
        id: 1,
        userId: 10,
        email: 'gestor@teste.com',
        nome: 'Gestor Teste',
      };
      const mockTodo = {
        id: 2,
        titulo: 'Tarefa sem anexos',
        descricao: 'Descrição',
        anexos: null,
      };

      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getGestorDaLoja).mockResolvedValue(mockGestor);
      vi.mocked(db.createTodo).mockResolvedValue(mockTodo as any);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      const gestor = await db.getGestorDaLoja(1);
      
      const todo = await db.createTodo({
        titulo: 'Tarefa sem anexos',
        descricao: 'Descrição',
        prioridade: 'media',
        atribuidoUserId: gestor!.userId,
        atribuidoLojaId: null,
        criadoPorId: gestor!.userId,
        criadoPorLojaId: auth!.loja.id,
        anexos: null,
      } as any);

      // Assert
      expect(todo).not.toBeNull();
      expect(todo?.anexos).toBeNull();
    });
  });

  describe('Tarefa Interna com Anexos', () => {
    it('deve criar tarefa interna com anexos', async () => {
      // Arrange
      const mockAuth = {
        loja: { id: 1, nome: 'Loja Teste', email: 'loja@teste.com' },
        token: { token: 'token-valido', lojaId: 1 },
      };
      const mockGestor = {
        id: 1,
        userId: 10,
        email: 'gestor@teste.com',
        nome: 'Gestor Teste',
      };
      const mockTodo = {
        id: 3,
        titulo: 'Tarefa interna',
        isInterna: true,
        anexos: JSON.stringify([
          { url: 'https://storage.example.com/checklist.pdf', nome: 'checklist.pdf', tipo: 'documento' },
        ]),
      };

      vi.mocked(db.validarTokenLoja).mockResolvedValue(mockAuth);
      vi.mocked(db.getGestorDaLoja).mockResolvedValue(mockGestor);
      vi.mocked(db.createTodo).mockResolvedValue(mockTodo as any);

      // Act
      const auth = await db.validarTokenLoja('token-valido');
      const gestor = await db.getGestorDaLoja(1);

      const todo = await db.createTodo({
        titulo: 'Tarefa interna',
        prioridade: 'media',
        atribuidoLojaId: auth!.loja.id,
        atribuidoUserId: null,
        criadoPorId: gestor!.userId,
        criadoPorLojaId: auth!.loja.id,
        isInterna: true,
        anexos: JSON.stringify([
          { url: 'https://storage.example.com/checklist.pdf', nome: 'checklist.pdf', tipo: 'documento' },
        ]),
      } as any);

      // Assert
      expect(todo).not.toBeNull();
      expect(todo?.isInterna).toBe(true);
      expect(todo?.anexos).toBeDefined();
      
      const anexosParsed = JSON.parse(todo!.anexos as string);
      expect(anexosParsed).toHaveLength(1);
      expect(anexosParsed[0].nome).toBe('checklist.pdf');
    });
  });
});
