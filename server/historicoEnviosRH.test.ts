import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

// Mock do módulo db
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getGestorByUserId: vi.fn(),
    getEnviosRHByGestorId: vi.fn(),
    getAllEnviosRH: vi.fn(),
    registarEnvioRH: vi.fn(),
  };
});

describe('Histórico de Envios RH', () => {
  const mockGestor = {
    id: 1,
    userId: 100,
    lastReminderDate: null,
    lastEnvioRH: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEnvios = [
    {
      id: 1,
      gestorId: 1,
      mesReferencia: 'Fevereiro 2026',
      totalColaboradores: 15,
      totalEmLojas: 10,
      totalVolantes: 3,
      totalRecalbra: 2,
      emailDestino: 'recursoshumanos@expressglass.pt',
      emailEnviado: true,
      createdAt: new Date('2026-02-06T10:00:00'),
    },
    {
      id: 2,
      gestorId: 1,
      mesReferencia: 'Janeiro 2026',
      totalColaboradores: 14,
      totalEmLojas: 9,
      totalVolantes: 3,
      totalRecalbra: 2,
      emailDestino: 'recursoshumanos@expressglass.pt',
      emailEnviado: true,
      createdAt: new Date('2026-01-20T15:30:00'),
    },
  ];

  const gestorCtx = {
    user: {
      id: 100,
      openId: 'test-open-id',
      name: 'Gestor Teste',
      email: 'gestor@expressglass.pt',
      role: 'gestor' as const,
      loginMethod: 'manus',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };

  const adminCtx = {
    user: {
      id: 1,
      openId: 'admin-open-id',
      name: 'Admin',
      email: 'admin@expressglass.pt',
      role: 'admin' as const,
      loginMethod: 'manus',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('historicoEnviosRH', () => {
    it('deve retornar histórico de envios do gestor', async () => {
      vi.mocked(db.getGestorByUserId).mockResolvedValue(mockGestor);
      vi.mocked(db.getEnviosRHByGestorId).mockResolvedValue(mockEnvios);

      const caller = appRouter.createCaller(gestorCtx);
      const resultado = await caller.colaboradores.historicoEnviosRH();

      expect(resultado).toHaveLength(2);
      expect(resultado[0].mesReferencia).toBe('Fevereiro 2026');
      expect(resultado[0].totalColaboradores).toBe(15);
      expect(resultado[1].mesReferencia).toBe('Janeiro 2026');
      expect(db.getEnviosRHByGestorId).toHaveBeenCalledWith(1);
    });

    it('deve lançar erro se gestor não encontrado', async () => {
      vi.mocked(db.getGestorByUserId).mockResolvedValue(null);

      const caller = appRouter.createCaller(gestorCtx);
      
      await expect(caller.colaboradores.historicoEnviosRH()).rejects.toThrow('Gestor não encontrado');
      expect(db.getEnviosRHByGestorId).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio se não houver envios', async () => {
      vi.mocked(db.getGestorByUserId).mockResolvedValue(mockGestor);
      vi.mocked(db.getEnviosRHByGestorId).mockResolvedValue([]);

      const caller = appRouter.createCaller(gestorCtx);
      const resultado = await caller.colaboradores.historicoEnviosRH();

      expect(resultado).toEqual([]);
    });
  });

  describe('todosEnviosRH (admin)', () => {
    it('deve retornar todos os envios para admin', async () => {
      const enviosComNome = mockEnvios.map(e => ({ ...e, gestorNome: 'Gestor Teste' }));
      vi.mocked(db.getAllEnviosRH).mockResolvedValue(enviosComNome);

      const caller = appRouter.createCaller(adminCtx);
      const resultado = await caller.colaboradores.todosEnviosRH();

      expect(resultado).toHaveLength(2);
      expect(resultado[0].gestorNome).toBe('Gestor Teste');
      expect(db.getAllEnviosRH).toHaveBeenCalled();
    });
  });

  describe('registarEnvioRH', () => {
    it('deve registar envio corretamente', async () => {
      const novoEnvio = {
        gestorId: 1,
        mesReferencia: 'Fevereiro 2026',
        totalColaboradores: 15,
        totalEmLojas: 10,
        totalVolantes: 3,
        totalRecalbra: 2,
        emailDestino: 'recursoshumanos@expressglass.pt',
        emailEnviado: true,
      };

      const envioRegistado = {
        id: 3,
        ...novoEnvio,
        createdAt: new Date(),
      };

      vi.mocked(db.registarEnvioRH).mockResolvedValue(envioRegistado);

      const resultado = await db.registarEnvioRH(novoEnvio);

      expect(resultado.id).toBe(3);
      expect(resultado.mesReferencia).toBe('Fevereiro 2026');
      expect(resultado.totalColaboradores).toBe(15);
    });
  });
});
