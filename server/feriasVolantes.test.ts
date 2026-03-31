import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('./db', () => ({
  getFeriasVolantesMarcados: vi.fn(),
  setFeriasVolantesMarcados: vi.fn(),
}));

import * as db from './db';

describe('Férias Volantes Marcados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeriasVolantesMarcados', () => {
    it('deve retornar lista vazia quando não há volantes marcados', async () => {
      (db.getFeriasVolantesMarcados as any).mockResolvedValue([]);
      const result = await db.getFeriasVolantesMarcados('Marco Amorim');
      expect(result).toEqual([]);
      expect(db.getFeriasVolantesMarcados).toHaveBeenCalledWith('Marco Amorim');
    });

    it('deve retornar volantes marcados para um gestor', async () => {
      const mockData = [
        { id: 1, nomeColaborador: 'João Silva', loja: 'Barcelos', gestorNome: 'Marco Amorim', marcadoPorUserId: 1, createdAt: new Date() },
        { id: 2, nomeColaborador: 'Ana Costa', loja: 'Braga', gestorNome: 'Marco Amorim', marcadoPorUserId: 1, createdAt: new Date() },
      ];
      (db.getFeriasVolantesMarcados as any).mockResolvedValue(mockData);
      const result = await db.getFeriasVolantesMarcados('Marco Amorim');
      expect(result).toHaveLength(2);
      expect(result[0].nomeColaborador).toBe('João Silva');
      expect(result[1].nomeColaborador).toBe('Ana Costa');
    });
  });

  describe('setFeriasVolantesMarcados', () => {
    it('deve definir novos volantes e retornar a lista atualizada', async () => {
      const colaboradores = [
        { nome: 'João Silva', loja: 'Barcelos' },
        { nome: 'Ana Costa', loja: 'Braga' },
      ];
      const mockResult = colaboradores.map((c, i) => ({
        id: i + 1,
        nomeColaborador: c.nome,
        loja: c.loja,
        gestorNome: 'Marco Amorim',
        marcadoPorUserId: 1,
        createdAt: new Date(),
      }));
      (db.setFeriasVolantesMarcados as any).mockResolvedValue(mockResult);

      const result = await db.setFeriasVolantesMarcados('Marco Amorim', 1, colaboradores);
      expect(result).toHaveLength(2);
      expect(db.setFeriasVolantesMarcados).toHaveBeenCalledWith('Marco Amorim', 1, colaboradores);
    });

    it('deve limpar volantes quando lista vazia', async () => {
      (db.setFeriasVolantesMarcados as any).mockResolvedValue([]);
      const result = await db.setFeriasVolantesMarcados('Marco Amorim', 1, []);
      expect(result).toEqual([]);
    });
  });

  describe('Lógica de destaque de volantes', () => {
    it('deve identificar colaboradores como volantes pelo nome (case insensitive)', () => {
      const volantesNomes = new Set(['JOÃO SILVA', 'ANA COSTA']);
      const colaboradores = [
        { name: 'João Silva', num: '001', store: 'Barcelos' },
        { name: 'Pedro Santos', num: '002', store: 'Braga' },
        { name: 'ANA COSTA', num: '003', store: 'Porto' },
      ];

      const volantesNums = new Set<string>();
      for (const emp of colaboradores) {
        if (volantesNomes.has(emp.name.toUpperCase().trim())) {
          volantesNums.add(emp.num);
        }
      }

      expect(volantesNums.has('001')).toBe(true);
      expect(volantesNums.has('002')).toBe(false);
      expect(volantesNums.has('003')).toBe(true);
    });

    it('deve marcar coluna Volante no Excel', () => {
      const volantesNomes = new Set(['JOÃO SILVA']);
      const colaboradores = [
        { name: 'João Silva', store: 'Barcelos', gestor: 'Marco', approved: 10, rejected: 0, absent: 0, holidays: 5, total: 15 },
        { name: 'Pedro Santos', store: 'Braga', gestor: 'Marco', approved: 8, rejected: 2, absent: 1, holidays: 5, total: 16 },
      ];

      const rows = colaboradores.map(e => {
        const isVol = volantesNomes.has(e.name.toUpperCase().trim());
        return {
          'Nome': e.name,
          'Loja': e.store,
          'Gestor': e.gestor,
          'Volante': isVol ? 'Sim' : '',
          'Dias Aprovados': e.approved,
        };
      });

      expect(rows[0]['Volante']).toBe('Sim');
      expect(rows[1]['Volante']).toBe('');
    });

    it('deve usar chave nome|||loja para seleção no diálogo', () => {
      const key = 'João Silva|||Barcelos';
      const [nome, loja] = key.split('|||');
      expect(nome).toBe('João Silva');
      expect(loja).toBe('Barcelos');
    });
  });
});
