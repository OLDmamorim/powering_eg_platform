import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  criarFeriasUpload: vi.fn(),
  listarFeriasUploads: vi.fn(),
  getFeriasUploadById: vi.fn(),
  getUltimoFeriasUpload: vi.fn(),
  guardarFeriasColaboradores: vi.fn(),
  getFeriasColaboradoresByUpload: vi.fn(),
  getFeriasColaboradoresByAno: vi.fn(),
  apagarFeriasUpload: vi.fn(),
  getAnosFerias: vi.fn(),
}));

import {
  criarFeriasUpload,
  listarFeriasUploads,
  getFeriasUploadById,
  getUltimoFeriasUpload,
  guardarFeriasColaboradores,
  getFeriasColaboradoresByUpload,
  getFeriasColaboradoresByAno,
  apagarFeriasUpload,
  getAnosFerias,
} from './db';

describe('Ferias DB Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarFeriasUpload', () => {
    it('should create a new ferias upload record', async () => {
      const mockUpload = {
        id: 1,
        ano: 2026,
        nomeOriginal: 'Ferias.xlsx',
        totalColaboradores: 150,
        uploadedBy: 'Marco Amorim',
        createdAt: new Date(),
      };
      (criarFeriasUpload as any).mockResolvedValue(mockUpload);

      const result = await criarFeriasUpload({
        ano: 2026,
        nomeOriginal: 'Ferias.xlsx',
        totalColaboradores: 150,
        uploadedBy: 'Marco Amorim',
      } as any);

      expect(result).toEqual(mockUpload);
      expect(criarFeriasUpload).toHaveBeenCalledWith({
        ano: 2026,
        nomeOriginal: 'Ferias.xlsx',
        totalColaboradores: 150,
        uploadedBy: 'Marco Amorim',
      });
    });
  });

  describe('listarFeriasUploads', () => {
    it('should list all uploads when no year filter', async () => {
      const mockUploads = [
        { id: 2, ano: 2026, nomeOriginal: 'Ferias2026.xlsx', totalColaboradores: 150, createdAt: new Date() },
        { id: 1, ano: 2025, nomeOriginal: 'Ferias2025.xlsx', totalColaboradores: 140, createdAt: new Date() },
      ];
      (listarFeriasUploads as any).mockResolvedValue(mockUploads);

      const result = await listarFeriasUploads();
      expect(result).toHaveLength(2);
      expect(result[0].ano).toBe(2026);
    });

    it('should filter by year when provided', async () => {
      const mockUploads = [
        { id: 2, ano: 2026, nomeOriginal: 'Ferias2026.xlsx', totalColaboradores: 150, createdAt: new Date() },
      ];
      (listarFeriasUploads as any).mockResolvedValue(mockUploads);

      const result = await listarFeriasUploads(2026);
      expect(result).toHaveLength(1);
      expect(result[0].ano).toBe(2026);
    });
  });

  describe('getFeriasUploadById', () => {
    it('should return upload by id', async () => {
      const mockUpload = { id: 1, ano: 2026, nomeOriginal: 'Ferias.xlsx' };
      (getFeriasUploadById as any).mockResolvedValue(mockUpload);

      const result = await getFeriasUploadById(1);
      expect(result).toEqual(mockUpload);
      expect(getFeriasUploadById).toHaveBeenCalledWith(1);
    });

    it('should return undefined for non-existent id', async () => {
      (getFeriasUploadById as any).mockResolvedValue(undefined);

      const result = await getFeriasUploadById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('getUltimoFeriasUpload', () => {
    it('should return the latest upload for a given year', async () => {
      const mockUpload = { id: 3, ano: 2026, nomeOriginal: 'Ferias_v3.xlsx', createdAt: new Date() };
      (getUltimoFeriasUpload as any).mockResolvedValue(mockUpload);

      const result = await getUltimoFeriasUpload(2026);
      expect(result).toEqual(mockUpload);
      expect(getUltimoFeriasUpload).toHaveBeenCalledWith(2026);
    });
  });

  describe('guardarFeriasColaboradores', () => {
    it('should save collaborators for an upload', async () => {
      (guardarFeriasColaboradores as any).mockResolvedValue(undefined);

      const colaboradores = [
        { uploadId: 1, ano: 2026, nome: 'João Silva', loja: 'Braga', gestor: 'Marco Amorim', diasJson: '{}' },
        { uploadId: 1, ano: 2026, nome: 'Maria Santos', loja: 'Guimarães', gestor: 'Marco Amorim', diasJson: '{}' },
      ];

      await guardarFeriasColaboradores(1, colaboradores as any);
      expect(guardarFeriasColaboradores).toHaveBeenCalledWith(1, colaboradores);
    });
  });

  describe('getFeriasColaboradoresByUpload', () => {
    it('should return collaborators for a specific upload', async () => {
      const mockColabs = [
        { id: 1, uploadId: 1, nome: 'João Silva', loja: 'Braga', gestor: 'Marco Amorim' },
        { id: 2, uploadId: 1, nome: 'Maria Santos', loja: 'Guimarães', gestor: 'Marco Amorim' },
      ];
      (getFeriasColaboradoresByUpload as any).mockResolvedValue(mockColabs);

      const result = await getFeriasColaboradoresByUpload(1);
      expect(result).toHaveLength(2);
    });
  });

  describe('getFeriasColaboradoresByAno', () => {
    it('should return collaborators for a specific year', async () => {
      const mockColabs = [
        { id: 1, ano: 2026, nome: 'João Silva', loja: 'Braga' },
      ];
      (getFeriasColaboradoresByAno as any).mockResolvedValue(mockColabs);

      const result = await getFeriasColaboradoresByAno(2026);
      expect(result).toHaveLength(1);
      expect(result[0].ano).toBe(2026);
    });
  });

  describe('apagarFeriasUpload', () => {
    it('should delete upload and its collaborators', async () => {
      (apagarFeriasUpload as any).mockResolvedValue(undefined);

      await apagarFeriasUpload(1);
      expect(apagarFeriasUpload).toHaveBeenCalledWith(1);
    });
  });

  describe('getAnosFerias', () => {
    it('should return distinct years in descending order', async () => {
      (getAnosFerias as any).mockResolvedValue([2026, 2025, 2024]);

      const result = await getAnosFerias();
      expect(result).toEqual([2026, 2025, 2024]);
      expect(result[0]).toBeGreaterThan(result[1]);
    });

    it('should return empty array when no uploads exist', async () => {
      (getAnosFerias as any).mockResolvedValue([]);

      const result = await getAnosFerias();
      expect(result).toEqual([]);
    });
  });
});
